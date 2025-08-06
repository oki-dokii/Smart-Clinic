// Email service for sending OTP via email
// Note: For demo purposes, we'll log the OTP to console
// In production, you would integrate with services like SendGrid, AWS SES, etc.

class EmailService {
  async sendOtp(email: string, otp: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      // For demo purposes, we'll just log the OTP
      // In production, you would send actual emails here
      console.log(`🔥 EMAIL OTP SERVICE - Sending OTP to ${email}: ${otp}`);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Always return success for demo
      return { success: true, otp };
    } catch (error) {
      console.error('Email service error:', error);
      return { 
        success: false, 
        error: 'Failed to send email. Please try again.' 
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