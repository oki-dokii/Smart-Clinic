import { storage } from '../storage';
import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client if credentials are available
let twilioClient: twilio.Twilio | null = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export class SmsService {
  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const message = `Your SmartClinic verification code is: ${otp}. This code will expire in 5 minutes.`;
    
    // Always log the OTP for debugging
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    // Send actual SMS if Twilio is configured
    if (twilioClient && TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        console.log(`SMS successfully sent to ${phoneNumber}`);
      } catch (error) {
        console.error('Failed to send SMS via Twilio:', error);
        // Don't throw error - fallback to console logging for development
      }
    } else {
      console.log('Twilio not configured - OTP only available in console for development');
    }
  }

  async sendMedicineReminder(phoneNumber: string, medicineName: string, dosage: string, time: string): Promise<void> {
    const message = `SmartClinic Reminder: Time to take your ${medicineName} (${dosage}) at ${time}. Don't forget to mark it as taken in the app!`;
    
    console.log(`Medicine reminder SMS to ${phoneNumber}: ${message}`);
    
    if (twilioClient && TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        console.log(`Medicine reminder SMS successfully sent to ${phoneNumber}`);
      } catch (error) {
        console.error('Failed to send medicine reminder SMS via Twilio:', error);
      }
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
          
          console.log(`Delay notification SMS to ${appointment.patient.phoneNumber}: ${message}`);
          
          if (twilioClient && TWILIO_PHONE_NUMBER) {
            try {
              await twilioClient.messages.create({
                body: message,
                from: TWILIO_PHONE_NUMBER,
                to: appointment.patient.phoneNumber
              });
              console.log(`Delay notification SMS successfully sent to ${appointment.patient.phoneNumber}`);
            } catch (error) {
              console.error('Failed to send delay notification SMS via Twilio:', error);
            }
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
    
    console.log(`Appointment reminder SMS to ${phoneNumber}: ${message}`);
    
    if (twilioClient && TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        console.log(`Appointment reminder SMS successfully sent to ${phoneNumber}`);
      } catch (error) {
        console.error('Failed to send appointment reminder SMS via Twilio:', error);
      }
    }
  }
}

export const smsService = new SmsService();
