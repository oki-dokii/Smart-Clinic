import { Response } from 'express';
import { storage } from '../storage';

interface QueueClient {
  response: Response;
  doctorId: string;
}

export class QueueService {
  private clients: Map<string, QueueClient[]> = new Map();

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
