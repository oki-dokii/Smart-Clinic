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
      
      // Broadcast to all connected WebSocket clients
      this.wsClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            // Send admin queue update
            if ((ws as any).isAdmin) {
              ws.send(JSON.stringify({ 
                type: 'admin_queue_update', 
                data: allQueueTokens 
              }));
            }
            
            // Send patient-specific updates
            if ((ws as any).patientId) {
              storage.getPatientQueuePosition((ws as any).patientId).then(position => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ 
                    type: 'queue_position', 
                    data: position || { tokenNumber: null, position: null, estimatedWaitTime: 0 } 
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

  async updateEstimatedWaitTimes(doctorId: string): Promise<void> {
    try {
      const queue = await storage.getDoctorQueue(doctorId);
      const averageConsultationTime = 15; // minutes per patient
      
      let currentWaitTime = 0;
      for (const token of queue) {
        if (token.status === 'waiting') {
          // Update estimated wait time based on position in queue
          await storage.updateQueueTokenStatus(token.id, token.status);
          currentWaitTime += averageConsultationTime;
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
