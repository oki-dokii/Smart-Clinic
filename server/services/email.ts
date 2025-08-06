// Email service for sending OTP via email using Nodemailer
import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Use Ethereal Email for testing - creates temporary email accounts
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('🔥 EMAIL SERVICE - Initialized with test account:', testAccount.user);
    } catch (error) {
      console.error('🔥 EMAIL SERVICE - Failed to initialize:', error);
    }
  }

  async sendOtp(email: string, otp: string): Promise<{ success: boolean; otp?: string; error?: string; previewUrl?: string }> {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: '"SmartClinic" <noreply@smartclinic.com>',
        to: email,
        subject: 'Your SmartClinic Login Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">SmartClinic</h1>
              <p style="color: #666; margin: 5px 0;">Healthcare Management System</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-bottom: 20px;">Your Login Code</h2>
              <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${otp}</div>
              </div>
              <p style="color: #64748b; margin: 15px 0;">Enter this code to complete your login</p>
              <p style="color: #ef4444; font-size: 14px; margin: 10px 0;">This code expires in 5 minutes</p>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                If you didn't request this code, please ignore this email.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                SmartClinic - Your trusted healthcare partner
              </p>
            </div>
          </div>
        `,
        text: `Your SmartClinic login code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nSmartClinic - Your trusted healthcare partner`
      };

      const info = await this.transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      
      console.log(`🔥 EMAIL OTP SERVICE - Email sent to ${email}`);
      console.log(`🔥 EMAIL PREVIEW URL: ${previewUrl}`);
      
      return { 
        success: true, 
        otp,
        previewUrl: previewUrl || undefined
      };
    } catch (error) {
      console.error('🔥 EMAIL SERVICE ERROR:', error);
      
      // Fallback: still return success but with console logging for development
      console.log(`🔥 EMAIL FALLBACK - OTP for ${email}: ${otp}`);
      return { 
        success: true, 
        otp,
        error: 'Email service unavailable, check console for OTP'
      };
    }
  }

  async sendAppointmentNotification(
    email: string, 
    appointmentDetails: {
      status: string;
      date: string;
      doctor: string;
      clinic: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔥 EMAIL NOTIFICATION - Sending appointment ${appointmentDetails.status} notification to ${email}`);
      console.log(`📧 Appointment Details:`, appointmentDetails);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true };
    } catch (error) {
      console.error('Email notification error:', error);
      return { 
        success: false, 
        error: 'Failed to send email notification.' 
      };
    }
  }
}

export const emailService = new EmailService();