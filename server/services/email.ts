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
        return { success: true };
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
        return { success: true };
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

  async sendAppointmentApproved(
    email: string,
    details: { doctorName: string; appointmentDate: string; appointmentTime: string; clinic?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const emailContent = {
      subject: '✅ Appointment Confirmed - SmartClinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0;">✅ Appointment Confirmed</h1>
            <p style="color: #666; margin: 5px 0;">SmartClinic Healthcare Management</p>
          </div>
          
          <div style="background: #f0fdf4; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #166534; margin-bottom: 20px;">Your appointment has been confirmed!</h2>
            <div style="color: #15803d; line-height: 1.6;">
              <p><strong>Doctor:</strong> ${details.doctorName}</p>
              <p><strong>Date:</strong> ${details.appointmentDate}</p>
              <p><strong>Time:</strong> ${details.appointmentTime}</p>
              ${details.clinic ? `<p><strong>Location:</strong> ${details.clinic}</p>` : ''}
            </div>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-weight: bold;">📋 Please bring:</p>
            <ul style="color: #92400e; margin: 10px 0;">
              <li>Valid ID or insurance card</li>
              <li>List of current medications</li>
              <li>Any relevant medical records</li>
            </ul>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px;">SmartClinic - Your trusted healthcare partner</p>
          </div>
        </div>
      `,
      text: `Appointment Confirmed!\n\nYour appointment has been confirmed:\nDoctor: ${details.doctorName}\nDate: ${details.appointmentDate}\nTime: ${details.appointmentTime}\n\nPlease bring valid ID and current medications list.\n\nSmartClinic - Your trusted healthcare partner`
    };

    return await this.sendNotificationEmail(email, emailContent);
  }

  async sendAppointmentRejected(
    email: string,
    details: { doctorName: string; reason: string; appointmentId: string }
  ): Promise<{ success: boolean; error?: string }> {
    const emailContent = {
      subject: '❌ Appointment Request Update - SmartClinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">❌ Appointment Request Update</h1>
            <p style="color: #666; margin: 5px 0;">SmartClinic Healthcare Management</p>
          </div>
          
          <div style="background: #fef2f2; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #991b1b; margin-bottom: 20px;">Appointment Request Status</h2>
            <div style="color: #dc2626; line-height: 1.6;">
              <p>We regret to inform you that your appointment request with <strong>${details.doctorName}</strong> could not be confirmed at this time.</p>
              <p><strong>Reason:</strong> ${details.reason}</p>
            </div>
          </div>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #0369a1; margin: 0; font-weight: bold;">💡 Next Steps:</p>
            <ul style="color: #0369a1; margin: 10px 0;">
              <li>Try booking a different time slot</li>
              <li>Contact us directly for assistance</li>
              <li>Check for alternative appointment times</li>
            </ul>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px;">SmartClinic - Your trusted healthcare partner</p>
          </div>
        </div>
      `,
      text: `Appointment Request Update\n\nWe regret to inform you that your appointment request with ${details.doctorName} could not be confirmed.\nReason: ${details.reason}\n\nPlease try booking a different time slot or contact us directly.\n\nSmartClinic - Your trusted healthcare partner`
    };

    return await this.sendNotificationEmail(email, emailContent);
  }

  async sendMedicineReminder(
    email: string,
    medicineName: string,
    dosage: string,
    time: string
  ): Promise<{ success: boolean; error?: string }> {
    const emailContent = {
      subject: '💊 Medicine Reminder - SmartClinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0;">💊 Medicine Reminder</h1>
            <p style="color: #666; margin: 5px 0;">SmartClinic Healthcare Management</p>
          </div>
          
          <div style="background: #ecfdf5; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 20px;">
            <h2 style="color: #065f46; margin-bottom: 20px;">Time to take your medicine!</h2>
            <div style="background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div style="font-size: 24px; font-weight: bold; color: #059669; margin-bottom: 10px;">${medicineName}</div>
              <div style="font-size: 16px; color: #047857;">Dosage: ${dosage}</div>
              <div style="font-size: 14px; color: #065f46; margin-top: 5px;">Scheduled time: ${time}</div>
            </div>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-weight: bold;">⚠️ Important:</p>
            <p style="color: #92400e; margin: 10px 0;">Take your medicine as prescribed by your doctor. If you have any concerns, please contact your healthcare provider.</p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px;">SmartClinic - Your trusted healthcare partner</p>
          </div>
        </div>
      `,
      text: `Medicine Reminder\n\nTime to take your medicine!\n\nMedicine: ${medicineName}\nDosage: ${dosage}\nScheduled time: ${time}\n\nTake your medicine as prescribed. Contact your healthcare provider if you have any concerns.\n\nSmartClinic - Your trusted healthcare partner`
    };

    return await this.sendNotificationEmail(email, emailContent);
  }

  async sendAppointmentReminder(
    email: string,
    doctorName: string,
    appointmentTime: string,
    location?: string
  ): Promise<{ success: boolean; error?: string }> {
    const emailContent = {
      subject: '⏰ Upcoming Appointment Reminder - SmartClinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">⏰ Appointment Reminder</h1>
            <p style="color: #666; margin: 5px 0;">SmartClinic Healthcare Management</p>
          </div>
          
          <div style="background: #eff6ff; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1e40af; margin-bottom: 20px;">You have an upcoming appointment!</h2>
            <div style="color: #1d4ed8; line-height: 1.6;">
              <p><strong>Doctor:</strong> ${doctorName}</p>
              <p><strong>Date & Time:</strong> ${appointmentTime}</p>
              ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
            </div>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-weight: bold;">📋 Reminder:</p>
            <ul style="color: #92400e; margin: 10px 0;">
              <li>Arrive 15 minutes early</li>
              <li>Bring valid ID and insurance card</li>
              <li>Bring list of current medications</li>
            </ul>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px;">SmartClinic - Your trusted healthcare partner</p>
          </div>
        </div>
      `,
      text: `Appointment Reminder\n\nYou have an upcoming appointment!\n\nDoctor: ${doctorName}\nDate & Time: ${appointmentTime}\n${location ? `Location: ${location}\n` : ''}\nReminder: Arrive 15 minutes early and bring valid ID.\n\nSmartClinic - Your trusted healthcare partner`
    };

    return await this.sendNotificationEmail(email, emailContent);
  }

  async sendDelayNotification(
    email: string,
    delayMinutes: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const emailContent = {
      subject: '⏱️ Appointment Delay Notification - SmartClinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0;">⏱️ Appointment Delay</h1>
            <p style="color: #666; margin: 5px 0;">SmartClinic Healthcare Management</p>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin-bottom: 20px;">Your appointment is running late</h2>
            <div style="color: #92400e; line-height: 1.6;">
              <p><strong>Expected delay:</strong> ${delayMinutes} minutes</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              <p>We apologize for any inconvenience and appreciate your patience.</p>
            </div>
          </div>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #0369a1; margin: 0; font-weight: bold;">💡 What you can do:</p>
            <ul style="color: #0369a1; margin: 10px 0;">
              <li>Stay in the waiting area</li>
              <li>Contact reception if you need to reschedule</li>
              <li>Use this time to relax or catch up on reading</li>
            </ul>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px;">SmartClinic - Your trusted healthcare partner</p>
          </div>
        </div>
      `,
      text: `Appointment Delay Notification\n\nYour appointment is running late by approximately ${delayMinutes} minutes.\n${reason ? `Reason: ${reason}\n` : ''}\nWe apologize for the inconvenience and appreciate your patience.\n\nSmartClinic - Your trusted healthcare partner`
    };

    return await this.sendNotificationEmail(email, emailContent);
  }

  async sendClinicRegistrationNotification(
    clinicData: any, 
    adminData: any
  ): Promise<{ success: boolean; error?: string }> {
    const emailContent = {
      subject: '🏥 New Clinic Registration - SmartClinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">🏥 New Clinic Registration</h1>
            <p style="color: #666; margin: 5px 0;">SmartClinic Healthcare Management</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Clinic Details</h2>
            <div style="color: #374151; line-height: 1.6;">
              <p><strong>Clinic Name:</strong> ${clinicData.name}</p>
              <p><strong>Address:</strong> ${clinicData.address}</p>
              <p><strong>Phone:</strong> ${clinicData.phoneNumber}</p>
              <p><strong>Email:</strong> ${clinicData.email}</p>
              <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin-bottom: 20px;">Admin Contact Details</h2>
            <div style="color: #92400e; line-height: 1.6;">
              <p><strong>Name:</strong> ${adminData.firstName} ${adminData.lastName}</p>
              <p><strong>Phone:</strong> ${adminData.phoneNumber}</p>
              <p><strong>Email:</strong> ${adminData.email}</p>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px;">Please review and approve this clinic registration in the admin dashboard.</p>
          </div>
        </div>
      `,
      text: `New Clinic Registration!\n\nClinic Details:\nName: ${clinicData.name}\nAddress: ${clinicData.address}\nPhone: ${clinicData.phoneNumber}\nEmail: ${clinicData.email}\nRegistration Time: ${new Date().toLocaleString()}\n\nAdmin Contact:\nName: ${adminData.firstName} ${adminData.lastName}\nPhone: ${adminData.phoneNumber}\nEmail: ${adminData.email}\n\nPlease review and approve this clinic registration in the admin dashboard.`
    };

    return await this.sendNotificationEmail('44441100sf@gmail.com', emailContent);
  }

  private async sendNotificationEmail(
    email: string,
    emailContent: { subject: string; html: string; text: string }
  ): Promise<{ success: boolean; error?: string }> {
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
        console.log(`🔥 EMAIL NOTIFICATION - Real email sent to ${email} via Gmail SMTP`);
        return { success: true };
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

        console.log(`🔥 EMAIL NOTIFICATION - Real email sent to ${email} via Resend`);
        return { success: true };
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
      
      console.log(`🔥 EMAIL NOTIFICATION - Test email sent to ${email}`);
      console.log(`🔥 EMAIL PREVIEW URL: ${previewUrl}`);
      
      return { success: true };
    } catch (error) {
      console.error('🔥 EMAIL NOTIFICATION ERROR:', error);
      
      // Final fallback: console logging for development
      console.log(`🔥 EMAIL FALLBACK - Notification for ${email}: ${emailContent.subject}`);
      return { 
        success: true,
        error: 'Email service unavailable, check console for notification'
      };
    }
  }

  async sendAppointmentRescheduled(
    email: string,
    details: {
      doctorName: string;
      originalDate: string;
      originalTime: string;
      newDate: string;
      newTime: string;
      clinic?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const emailContent = {
      subject: '📅 Appointment Rescheduled - SmartClinic',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; margin: 0;">📅 Appointment Rescheduled</h1>
          <p style="color: #6b7280; margin: 10px 0;">Your appointment has been moved to a new time</p>
        </div>
        
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #ea580c; margin: 0 0 15px 0; font-size: 18px;">Rescheduled Appointment Details</h2>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 16px;">❌ Previous Appointment (Cancelled)</h3>
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">
              <p style="margin: 5px 0;"><strong>Doctor:</strong> ${details.doctorName}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${details.originalDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${details.originalTime}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> ${details.clinic || 'SmartClinic'}</p>
            </div>
          </div>
          
          <div>
            <h3 style="color: #16a34a; margin: 0 0 10px 0; font-size: 16px;">✅ New Appointment Details</h3>
            <div style="background-color: #dcfce7; padding: 15px; border-radius: 6px; border-left: 4px solid #16a34a;">
              <p style="margin: 5px 0;"><strong>Doctor:</strong> ${details.doctorName}</p>
              <p style="margin: 5px 0;"><strong>New Date:</strong> ${details.newDate}</p>
              <p style="margin: 5px 0;"><strong>New Time:</strong> ${details.newTime}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> ${details.clinic || 'SmartClinic'}</p>
            </div>
          </div>
        </div>
        
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #1d4ed8; margin: 0 0 10px 0;">📋 Important Notes:</h3>
          <ul style="color: #374151; margin: 0; padding-left: 20px;">
            <li>Please arrive 15 minutes before your new appointment time</li>
            <li>Bring your ID and any relevant medical documents</li>
            <li>If you need to reschedule again, please contact us at least 24 hours in advance</li>
            <li>Contact reception if you have any questions about this change</li>
          </ul>
        </div>
        
        <div style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">Thank you for your understanding!</p>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">— SmartClinic Team</p>
        </div>
      </div>`,
      text: `Appointment Rescheduled - SmartClinic\n\nYour appointment has been moved to a new time:\n\nPrevious Appointment (Cancelled):\nDoctor: ${details.doctorName}\nDate: ${details.originalDate}\nTime: ${details.originalTime}\nLocation: ${details.clinic || 'SmartClinic'}\n\nNew Appointment Details:\nDoctor: ${details.doctorName}\nNew Date: ${details.newDate}\nNew Time: ${details.newTime}\nLocation: ${details.clinic || 'SmartClinic'}\n\nImportant Notes:\n- Please arrive 15 minutes before your new appointment time\n- Bring your ID and any relevant medical documents\n- If you need to reschedule again, please contact us at least 24 hours in advance\n- Contact reception if you have any questions about this change\n\nThank you for your understanding!\n— SmartClinic Team`
    };

    return await this.sendNotificationEmail(email, emailContent);
  }
}

export const emailService = new EmailService();