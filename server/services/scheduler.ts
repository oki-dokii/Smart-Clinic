import cron from 'node-cron';
import { storage } from '../storage';
import { emailService } from './email';

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
        // Format time in Indian Standard Time for email
        const istTime = reminder.scheduledAt.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        });
        
        // Send email reminder with properly formatted IST time
        await emailService.sendMedicineReminder(
          reminder.prescription.patient.email,
          reminder.prescription.medicine.name,
          reminder.prescription.dosage,
          istTime
        );
        
        // Mark email as sent (would need to add this field update to storage)
        // await storage.markReminderEmailSent(reminder.id);
        
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
          
          await emailService.sendAppointmentReminder(
            appointment.patient.email,
            `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
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
      
      // Use custom timings if available, otherwise fall back to frequency-based defaults
      const reminderTimes = prescription.timings && prescription.timings.length > 0
        ? this.parseCustomTimings(prescription.timings)
        : this.calculateReminderTimes(prescription.frequency);
      
      const currentDate = new Date(startDate);
      const maxDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days max
      
      while (currentDate <= maxDate) {
        for (const time of reminderTimes) {
          // Create reminder in Indian Standard Time (IST = UTC+5:30)
          // User enters time in IST, but we need to store as UTC for consistency
          
          // First create the datetime in IST timezone
          const istDateTime = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
            time.hour,
            time.minute,
            0,
            0
          );
          
          // Convert IST to UTC by subtracting 5 hours and 30 minutes
          const reminderDateTime = new Date(istDateTime.getTime() - (5 * 60 + 30) * 60 * 1000);
          
          // Create reminders for today and future dates
          // For custom medicines, create today's reminder even if the time has passed
          const now = new Date();
          const isToday = reminderDateTime.toDateString() === now.toDateString();
          
          if (reminderDateTime >= now || isToday) {
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

  private parseCustomTimings(timings: string[]): { hour: number; minute: number }[] {
    return timings.map(time => {
      const [hourStr, minuteStr] = time.split(':');
      return {
        hour: parseInt(hourStr, 10),
        minute: parseInt(minuteStr, 10)
      };
    });
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
