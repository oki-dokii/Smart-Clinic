import { Response } from 'express';
import { storage } from '../storage';
import { WebSocket } from 'ws';

interface QueueClient {
  response: Response;
  doctorId: string;
}

export class QueueService {
  private clients: Map<string, QueueClient[]> = new Map();
  private wsClients: Set<WebSocket> = new Set();

  addClient(doctorId: string, response: Response): void {
    if (!this.clients.has(doctorId)) {
      this.clients.set(doctorId, []);
    }
    
    this.clients.get(doctorId)!.push({ response, doctorId });
    
    // Send initial queue state
    this.sendQueueUpdate(doctorId, response);
  }

  removeClient(doctorId: string, response: Response): void {
    const clients = this.clients.get(doctorId);
    if (clients) {
      const index = clients.findIndex(client => client.response === response);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      
      if (clients.length === 0) {
        this.clients.delete(doctorId);
      }
    }
  }

  async broadcastQueueUpdate(doctorId: string): Promise<void> {
    const clients = this.clients.get(doctorId);
    if (!clients) return;

    for (const client of clients) {
      await this.sendQueueUpdate(doctorId, client.response);
    }
  }

  addWebSocketClient(ws: WebSocket): void {
    this.wsClients.add(ws);
  }

  removeWebSocketClient(ws: WebSocket): void {
    this.wsClients.delete(ws);
  }

  async broadcastWebSocketUpdate(doctorId?: string): Promise<void> {
    try {
      // Get all queue tokens for admin view
      const allQueueTokens = await storage.getAllQueueTokens();
      
      // Update wait times for all active queue tokens before broadcasting
      for (const token of allQueueTokens) {
        if (token.status === 'waiting') {
          // Find the token's position in the doctor's queue
          const doctorQueue = await storage.getDoctorQueue(token.doctorId);
          const queuePosition = doctorQueue.findIndex(t => t.id === token.id) + 1;
          
          if (queuePosition > 0) {
            const dynamicWaitTime = await this.calculateDynamicWaitTime(token, queuePosition);
            await storage.updateQueueTokenWaitTime(token.id, dynamicWaitTime);
          }
        }
      }
      
      // Get updated tokens with new wait times
      const updatedQueueTokens = await storage.getAllQueueTokens();
      
      // Broadcast to all connected WebSocket clients
      this.wsClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            // Send admin queue update
            if ((ws as any).isAdmin) {
              ws.send(JSON.stringify({ 
                type: 'admin_queue_update', 
                data: updatedQueueTokens 
              }));
            }
            
            // Send patient updates - both individual position AND full queue data
            if ((ws as any).patientId) {
              // Send individual position first
              storage.getPatientQueuePosition((ws as any).patientId).then(position => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ 
                    type: 'queue_position', 
                    data: position || { tokenNumber: null, position: null, estimatedWaitTime: 0 } 
                  }));
                  
                  // Also send full queue data to patients for complete visibility
                  ws.send(JSON.stringify({ 
                    type: 'full_queue_update', 
                    data: updatedQueueTokens 
                  }));
                }
              }).catch(console.error);
            }
          } catch (error) {
            console.error('WebSocket send error:', error);
            this.wsClients.delete(ws);
          }
        } else {
          this.wsClients.delete(ws);
        }
      });
    } catch (error) {
      console.error('Failed to broadcast WebSocket update:', error);
    }
  }

  private async sendQueueUpdate(doctorId: string, response: Response): Promise<void> {
    try {
      const queue = await storage.getDoctorQueue(doctorId);
      const currentServing = await storage.getCurrentServingToken(doctorId);
      
      const queueData = {
        queue: queue.map(token => ({
          id: token.id,
          tokenNumber: token.tokenNumber,
          patientName: `${token.patient.firstName} ${token.patient.lastName}`,
          status: token.status,
          estimatedWaitTime: token.estimatedWaitTime,
          priority: token.priority,
          createdAt: token.createdAt
        })),
        currentServing: currentServing ? {
          id: currentServing.id,
          tokenNumber: currentServing.tokenNumber,
          patientName: `${currentServing.patient.firstName} ${currentServing.patient.lastName}`,
          calledAt: currentServing.calledAt
        } : null,
        timestamp: new Date().toISOString()
      };

      response.write(`data: ${JSON.stringify(queueData)}\n\n`);
    } catch (error) {
      console.error('Failed to send queue update:', error);
      // Remove client on error
      this.removeClient(doctorId, response);
    }
  }

  // Calculate dynamic wait time based on actual appointment times
  async calculateDynamicWaitTime(queueToken: any, queuePosition: number): Promise<number> {
    const now = new Date();
    
    // If this token has an appointment, calculate based on appointment time
    if (queueToken.appointmentId) {
      try {
        const appointment = await storage.getAppointmentById(queueToken.appointmentId);
        if (appointment) {
          const appointmentTime = new Date(appointment.appointmentDate);
          const waitTimeMinutes = Math.max(0, Math.floor((appointmentTime.getTime() - now.getTime()) / (1000 * 60)));
          
          console.log(`🔥 Appointment-based wait calculation: appointment at ${appointmentTime.toISOString()}, wait=${waitTimeMinutes}min`);
          return waitTimeMinutes;
        }
      } catch (error) {
        console.error('Error fetching appointment for wait time calculation:', error);
      }
    }
    
    // Fallback for walk-ins or if appointment lookup fails
    const createdAt = new Date(queueToken.createdAt);
    const elapsedMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
    const averageConsultationTime = 15; // minutes - only used for walk-ins
    const baseWaitTime = (queuePosition - 1) * averageConsultationTime;
    const remainingWaitTime = Math.max(0, baseWaitTime - elapsedMinutes);
    
    console.log(`🔥 Fallback wait calculation: position=${queuePosition}, elapsed=${elapsedMinutes}min, base=${baseWaitTime}min, remaining=${remainingWaitTime}min`);
    
    return remainingWaitTime;
  }

  async updateEstimatedWaitTimes(doctorId: string): Promise<void> {
    try {
      const queue = await storage.getDoctorQueue(doctorId);
      
      // Update wait times dynamically for each waiting patient
      for (let i = 0; i < queue.length; i++) {
        const token = queue[i];
        if (token.status === 'waiting') {
          const queuePosition = i + 1; // 1-based position
          const dynamicWaitTime = await this.calculateDynamicWaitTime(token, queuePosition);
          
          // Update the token with new wait time
          await storage.updateQueueTokenWaitTime(token.id, dynamicWaitTime);
        }
      }
      
      // Broadcast update
      await this.broadcastQueueUpdate(doctorId);
    } catch (error) {
      console.error('Failed to update wait times:', error);
    }
  }
}

export const queueService = new QueueService();
