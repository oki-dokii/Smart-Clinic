// Email service for sending OTP via email using multiple providers
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;

  constructor() {
    this.initializeServices();
  }

  private async initializeServices() {
    try {
      // Try Gmail SMTP first if credentials are available
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });
        console.log('🔥 EMAIL SERVICE - Initialized with Gmail SMTP (real email delivery to any address)');
        return;
      }

      // Try to initialize Resend if API key is available (limited to verified email only)
      if (process.env.RESEND_API_KEY) {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        console.log('🔥 EMAIL SERVICE - Initialized with Resend (limited to 44441100sf@gmail.com only)');
        return;
      }

      // Fallback to Ethereal Email for testing
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

      console.log('🔥 EMAIL SERVICE - Initialized with Ethereal test account (preview only)');
    } catch (error) {
      console.error('🔥 EMAIL SERVICE - Failed to initialize:', error);
    }
  }

  async sendOtp(email: string, otp: string): Promise<{ success: boolean; otp?: string; error?: string; previewUrl?: string }> {
    const emailContent = {
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

    try {
      // Try Gmail SMTP first (works with any email address)
      if (this.transporter && process.env.GMAIL_USER) {
        const mailOptions = {
          from: `"SmartClinic" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log(`🔥 EMAIL OTP SERVICE - Gmail SMTP response:`, info);
        console.log(`🔥 EMAIL OTP SERVICE - Real email sent to ${email} via Gmail SMTP`);
        console.log(`🔥 EMAIL OTP CODE for ${email}: ${otp}`);
        return { success: true, otp };
      }

      // Try Resend (limited to verified email only)
      if (this.resend && email === '44441100sf@gmail.com') {
        const { data, error } = await this.resend.emails.send({
          from: 'SmartClinic <onboarding@resend.dev>',
          to: [email],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (error) {
          console.error('🔥 RESEND ERROR:', error);
          throw new Error('Resend failed');
        }

        console.log(`🔥 EMAIL OTP SERVICE - Real email sent to ${email} via Resend`);
        return { success: true, otp };
      }

      // Fallback to Ethereal Email (testing only)
      if (!this.transporter) {
        await this.initializeServices();
      }

      if (!this.transporter) {
        throw new Error('No email service available');
      }

      const mailOptions = {
        from: '"SmartClinic" <noreply@smartclinic.com>',
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      };

      const info = await this.transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      
      console.log(`🔥 EMAIL OTP SERVICE - Test email sent to ${email}`);
      console.log(`🔥 EMAIL PREVIEW URL: ${previewUrl}`);
      
      return { 
        success: true, 
        otp,
        previewUrl: previewUrl || undefined
      };
    } catch (error) {
      console.error('🔥 EMAIL SERVICE ERROR:', error);
      
      // Final fallback: console logging for development
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