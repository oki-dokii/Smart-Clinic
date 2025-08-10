import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { storage } from '../storage';
import { smsService } from './sms';
import { emailService } from './email';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;

export class AuthService {
  generateToken(userId: string, role: string, clinicId?: string): string {
    const payload: any = { 
      userId, 
      role 
    };
    
    if (clinicId) {
      payload.clinicId = clinicId;
    }
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  async sendOtp(phoneNumber: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    
    // Set expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
    
    // Invalidate any existing OTP sessions for this phone
    await storage.invalidateOtpSession(phoneNumber);
    
    // Create new OTP session
    await storage.createOtpSession({
      phoneNumber,
      otpHash,
      expiresAt
    });
    
    // Send SMS
    const smsResult = await smsService.sendOtp(phoneNumber, otp);
    return smsResult;
  }

  async sendEmailOtp(email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    
    // Set expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
    
    // Invalidate any existing OTP sessions for this email
    await storage.invalidateEmailOtpSession(email);
    
    // Create new OTP session
    await storage.createEmailOtpSession({
      email,
      otpHash,
      expiresAt
    });
    
    // Send Email
    const emailResult = await emailService.sendOtp(email, otp);
    return emailResult;
  }

  async verifyEmailOtp(email: string, otp: string, ipAddress?: string, userAgent?: string): Promise<{ token: string; user: any; isNewUser: boolean }> {
    // Get OTP session
    const otpSession = await storage.getEmailOtpSession(email);
    if (!otpSession) {
      throw new Error('Invalid or expired OTP');
    }

    // Check attempts limit
    if (otpSession.attempts >= MAX_OTP_ATTEMPTS) {
      await storage.invalidateEmailOtpSession(email);
      throw new Error('Too many failed attempts. Please request a new OTP');
    }

    // Verify OTP
    const isValidOtp = await bcrypt.compare(otp, otpSession.otpHash);
    if (!isValidOtp) {
      await storage.incrementEmailOtpAttempts(email);
      throw new Error('Invalid OTP');
    }

    // Invalidate OTP session
    await storage.invalidateEmailOtpSession(email);

    // Find or create user
    let user = await storage.getUserByEmail(email);
    let isNewUser = false;

    if (!user) {
      // Create new user with patient role by default
      user = await storage.createUser({
        phoneNumber: null, // Email-based users don't need phone numbers initially
        email,
        role: 'patient',
        firstName: '',
        lastName: '',
        isApproved: true // Auto-approve patients
      });
      isNewUser = true;
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact support');
    }

    // Generate JWT token first
    const token = jwt.sign(
      { 
        userId: user.id,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create session with the actual token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const session = await storage.createAuthSession({
      userId: user.id,
      token,
      expiresAt,
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
      lastActivity: new Date()
    });

    return { token, user, isNewUser };
  }

  async verifyOtp(phoneNumber: string, otp: string, ipAddress?: string, userAgent?: string): Promise<{ token: string; user: any; isNewUser: boolean }> {
    // Get OTP session
    const otpSession = await storage.getOtpSession(phoneNumber);
    if (!otpSession) {
      throw new Error('Invalid or expired OTP');
    }

    // Check attempts limit
    if (otpSession.attempts >= MAX_OTP_ATTEMPTS) {
      await storage.invalidateOtpSession(phoneNumber);
      throw new Error('Too many failed attempts. Please request a new OTP');
    }

    // Verify OTP
    const isValidOtp = await bcrypt.compare(otp, otpSession.otpHash);
    if (!isValidOtp) {
      await storage.incrementOtpAttempts(phoneNumber);
      throw new Error('Invalid OTP');
    }

    // Invalidate OTP session
    await storage.invalidateOtpSession(phoneNumber);

    // Find or create user
    let user = await storage.getUserByPhone(phoneNumber);
    let isNewUser = false;

    if (!user) {
      // Create new user with patient role by default
      user = await storage.createUser({
        phoneNumber,
        role: 'patient',
        firstName: '',
        lastName: '',
        isApproved: true // Auto-approve patients
      });
      isNewUser = true;
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact administrator');
    }

    if (!user.isApproved && user.role !== 'patient') {
      throw new Error('Account pending approval. Please contact administrator');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        phoneNumber: user.phoneNumber, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create auth session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await storage.createAuthSession({
      userId: user.id,
      token,
      expiresAt,
      ipAddress,
      userAgent
    });

    return { token, user, isNewUser };
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const session = await storage.getAuthSessionWithUser(token);
      
      if (!session) {
        throw new Error('Invalid session');
      }

      // Update last activity
      await storage.updateLastActivity(token);

      return session.user;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async revokeToken(token: string): Promise<void> {
    await storage.invalidateAuthSession(token);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await storage.invalidateUserSessions(userId);
  }
}

export const authService = new AuthService();
