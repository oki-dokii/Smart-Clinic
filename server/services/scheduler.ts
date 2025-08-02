import cron from 'node-cron';
import { storage } from '../storage';
import { smsService } from './sms';

export class SchedulerService {
  private reminderCronJob: cron.ScheduledTask | null = null;
  private appointmentReminderJob: cron.ScheduledTask | null = null;

  start(): void {
    this.startMedicineReminderScheduler();
    this.startAppointmentReminderScheduler();
  }

  stop(): void {
    if (this.reminderCronJob) {
      this.reminderCronJob.stop();
    }
    if (this.appointmentReminderJob) {
      this.appointmentReminderJob.stop();
    }
  }

  private startMedicineReminderScheduler(): void {
    // Check for due reminders every minute
    this.reminderCronJob = cron.schedule('* * * * *', async () => {
      try {
        await this.processDueReminders();
      } catch (error) {
        console.error('Error processing due reminders:', error);
      }
    });
  }

  private startAppointmentReminderScheduler(): void {
    // Check for appointment reminders every 30 minutes
    this.appointmentReminderJob = cron.schedule('*/30 * * * *', async () => {
      try {
        await this.processAppointmentReminders();
      } catch (error) {
        console.error('Error processing appointment reminders:', error);
      }
    });
  }

  private async processDueReminders(): Promise<void> {
    const dueReminders = await storage.getDueReminders();
    
    for (const reminder of dueReminders) {
      try {
        // Send SMS reminder
        await smsService.sendMedicineReminder(
          reminder.prescription.patient.phoneNumber,
          reminder.prescription.medicine.name,
          reminder.prescription.dosage,
          reminder.scheduledAt.toLocaleTimeString()
        );
        
        // Mark SMS as sent (would need to add this field update to storage)
        // await storage.markReminderSmsSent(reminder.id);
        
      } catch (error) {
        console.error(`Failed to send reminder for ${reminder.id}:`, error);
      }
    }
  }

  private async processAppointmentReminders(): Promise<void> {
    // Send reminders 2 hours before appointment
    const reminderTime = new Date();
    reminderTime.setHours(reminderTime.getHours() + 2);
    
    const startTime = new Date(reminderTime);
    startTime.setMinutes(startTime.getMinutes() - 30); // 30 minute window
    
    const endTime = new Date(reminderTime);
    endTime.setMinutes(endTime.getMinutes() + 30);
    
    try {
      const appointments = await storage.getAppointmentsByDate(new Date());
      
      for (const appointment of appointments) {
        const appointmentTime = new Date(appointment.appointmentDate);
        
        if (appointmentTime >= startTime && appointmentTime <= endTime && 
            (appointment.status === 'scheduled' || appointment.status === 'confirmed')) {
          
          await smsService.sendAppointmentReminder(
            appointment.patient.phoneNumber,
            `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
            appointmentTime.toLocaleString(),
            appointment.location || 'Clinic'
          );
        }
      }
    } catch (error) {
      console.error('Failed to process appointment reminders:', error);
    }
  }

  async createMedicineReminders(prescriptionId: string): Promise<void> {
    try {
      const prescription = await storage.getPrescriptionWithDetails(prescriptionId);
      if (!prescription) {
        throw new Error('Prescription not found');
      }

      const startDate = new Date(prescription.startDate);
      const endDate = prescription.endDate ? new Date(prescription.endDate) : null;
      
      // Calculate reminder times based on frequency
      const reminderTimes = this.calculateReminderTimes(prescription.frequency);
      
      const currentDate = new Date(startDate);
      const maxDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days max
      
      while (currentDate <= maxDate) {
        for (const time of reminderTimes) {
          const reminderDateTime = new Date(currentDate);
          reminderDateTime.setHours(time.hour, time.minute, 0, 0);
          
          // Only create future reminders
          if (reminderDateTime > new Date()) {
            await storage.createMedicineReminder({
              prescriptionId: prescription.id,
              scheduledAt: reminderDateTime
            });
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } catch (error) {
      console.error('Failed to create medicine reminders:', error);
      throw error;
    }
  }

  private calculateReminderTimes(frequency: string): { hour: number; minute: number }[] {
    switch (frequency) {
      case 'once_daily':
        return [{ hour: 9, minute: 0 }]; // 9 AM
      case 'twice_daily':
        return [
          { hour: 9, minute: 0 },   // 9 AM
          { hour: 21, minute: 0 }   // 9 PM
        ];
      case 'three_times_daily':
        return [
          { hour: 8, minute: 0 },   // 8 AM
          { hour: 14, minute: 0 },  // 2 PM
          { hour: 20, minute: 0 }   // 8 PM
        ];
      case 'four_times_daily':
        return [
          { hour: 8, minute: 0 },   // 8 AM
          { hour: 12, minute: 0 },  // 12 PM
          { hour: 16, minute: 0 },  // 4 PM
          { hour: 20, minute: 0 }   // 8 PM
        ];
      case 'weekly':
        return [{ hour: 9, minute: 0 }]; // Once per week at 9 AM
      case 'monthly':
        return [{ hour: 9, minute: 0 }]; // Once per month at 9 AM
      default:
        return [{ hour: 9, minute: 0 }]; // Default to once daily
    }
  }
}

export const schedulerService = new SchedulerService();
