import { storage } from '../storage';

// In production, replace with actual SMS service like Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'your_twilio_account_sid';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'your_twilio_auth_token';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

export class SmsService {
  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const message = `Your SmartClinic verification code is: ${otp}. This code will expire in 5 minutes.`;
    
    // In development, just log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`SMS to ${phoneNumber}: ${message}`);
      return;
    }

    // Production SMS sending logic (implement with Twilio or similar)
    try {
      // const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      // await twilio.messages.create({
      //   body: message,
      //   from: TWILIO_PHONE_NUMBER,
      //   to: phoneNumber
      // });
      console.log(`SMS sent to ${phoneNumber}: ${message}`);
    } catch (error) {
      console.error('Failed to send SMS:', error);
      throw new Error('Failed to send SMS verification');
    }
  }

  async sendMedicineReminder(phoneNumber: string, medicineName: string, dosage: string, time: string): Promise<void> {
    const message = `SmartClinic Reminder: Time to take your ${medicineName} (${dosage}) at ${time}. Don't forget to mark it as taken in the app!`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Medicine reminder SMS to ${phoneNumber}: ${message}`);
      return;
    }

    try {
      // Implement actual SMS sending
      console.log(`Medicine reminder sent to ${phoneNumber}: ${message}`);
    } catch (error) {
      console.error('Failed to send medicine reminder SMS:', error);
    }
  }

  async sendDelayNotifications(doctorId: string, delayMinutes: number, reason?: string): Promise<void> {
    try {
      // Get today's appointments for this doctor
      const today = new Date();
      const appointments = await storage.getAppointmentsByDate(today, doctorId);
      
      let notificationsSent = 0;
      
      for (const appointment of appointments) {
        if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
          const message = `SmartClinic Update: Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName} is running ${delayMinutes} minutes late${reason ? ` due to ${reason}` : ''}. Your appointment time may be delayed. We apologize for the inconvenience.`;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Delay notification SMS to ${appointment.patient.phoneNumber}: ${message}`);
          } else {
            // Implement actual SMS sending
            console.log(`Delay notification sent to ${appointment.patient.phoneNumber}: ${message}`);
          }
          
          notificationsSent++;
        }
      }

      // Update delay notification record
      const notifications = await storage.getActiveDelayNotifications(doctorId);
      if (notifications.length > 0) {
        // Update the most recent notification
        // Note: This would need to be implemented in storage if needed
      }
      
    } catch (error) {
      console.error('Failed to send delay notifications:', error);
    }
  }

  async sendAppointmentReminder(phoneNumber: string, doctorName: string, appointmentTime: string, location: string): Promise<void> {
    const message = `SmartClinic Reminder: You have an appointment with ${doctorName} at ${appointmentTime} at ${location}. Please arrive 15 minutes early.`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Appointment reminder SMS to ${phoneNumber}: ${message}`);
      return;
    }

    try {
      // Implement actual SMS sending
      console.log(`Appointment reminder sent to ${phoneNumber}: ${message}`);
    } catch (error) {
      console.error('Failed to send appointment reminder SMS:', error);
    }
  }
}

export const smsService = new SmsService();
