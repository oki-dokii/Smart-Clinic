import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { 
  insertUserSchema, insertAppointmentSchema, insertQueueTokenSchema, 
  insertMedicineSchema, insertPrescriptionSchema, insertMedicineReminderSchema,
  insertDelayNotificationSchema, insertHomeVisitSchema, insertMedicalHistorySchema,
  insertStaffVerificationSchema, insertPatientFeedbackSchema, insertClinicSchema
} from "@shared/schema";
import { z } from "zod";
import { authMiddleware, requireRole, requireSuperAdmin } from "./middleware/auth";
import { gpsVerificationMiddleware } from "./middleware/gps";
import { authService } from "./services/auth";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { emailService } from "./services/email";
import { queueService } from "./services/queue";
import { schedulerService } from "./services/scheduler";
import { smsService } from "./services/sms";
import { WebSocketServer, WebSocket } from 'ws';

// Helper function to generate timings from frequency
function generateTimingsFromFrequency(frequency: string): string[] {
  switch (frequency) {
    case 'once_daily':
      return ['08:00'];
    case 'twice_daily':
      return ['08:00', '20:00'];
    case 'three_times_daily':
      return ['08:00', '14:00', '20:00'];
    case 'four_times_daily':
      return ['08:00', '12:00', '16:00', '20:00'];
    case 'as_needed':
      return ['08:00'];
    default:
      return ['08:00'];
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server first
  const httpServer = createServer(app);
  
  // Manual approval endpoint for testing (no auth required)
  app.get('/api/test-approve/:appointmentId', async (req, res) => {
    try {
      const { appointmentId } = req.params;
      console.log('🔥 TEST APPROVE - Processing appointment:', appointmentId);
      
      // Update appointment status to scheduled
      const appointment = await storage.updateAppointment(appointmentId, { 
        status: 'scheduled' 
      });
      
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      console.log('🔥 TEST APPROVE - Appointment updated');

      // Send email notification
      const patient = await storage.getUser(appointment.patientId);
      const doctor = await storage.getUser(appointment.doctorId);
      
      console.log('🔥 TEST APPROVE - Patient:', { id: patient?.id, email: patient?.email });
      console.log('🔥 TEST APPROVE - Doctor:', { id: doctor?.id, name: `${doctor?.firstName} ${doctor?.lastName}` });
      
      if (patient && doctor && patient.email) {
        const appointmentDate = new Date(appointment.appointmentDate);
        
        console.log('🔥 TEST APPROVE - Sending email to:', patient.email);
        
        const emailResult = await emailService.sendAppointmentApproved(patient.email, {
          doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
          appointmentDate: appointmentDate.toLocaleDateString(),
          appointmentTime: appointmentDate.toLocaleTimeString(),
          clinic: 'SmartClinic'
        });
        
        console.log('🔥 TEST APPROVE - Email result:', emailResult);
        
        res.json({ 
          success: true, 
          message: 'Appointment approved and email sent',
          emailResult
        });
      } else {
        res.json({ 
          success: false, 
          message: 'Missing patient or doctor data'
        });
      }
    } catch (error: any) {
      console.error('🔥 TEST APPROVE - Error:', error);
      res.status(500).json({ error: 'Failed to approve: ' + error.message });
    }
  });
  
  // Simple email test endpoint (no auth required for debugging)
  app.get('/api/email-debug', async (req, res) => {
    try {
      console.log('🔥 EMAIL DEBUG - Starting test...');
      console.log('🔥 EMAIL DEBUG - Environment check:', {
        GMAIL_USER: !!process.env.GMAIL_USER,
        GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD
      });
      
      // Import and test email service
      const { emailService } = await import('./services/email');
      
      const result = await emailService.sendAppointmentApproved('soham.banerjee@iiitb.ac.in', {
        doctorName: 'Dr. SmartClinic Doctor',
        appointmentDate: new Date('2025-08-09T14:00:00').toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        appointmentTime: new Date('2025-08-09T14:00:00').toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
        clinic: 'SmartClinic'
      });
      
      console.log('🔥 EMAIL DEBUG - Result:', result);
      
      res.json({
        success: true,
        message: 'Email debug test completed',
        emailResult: result,
        env: {
          hasGmailUser: !!process.env.GMAIL_USER,
          hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD
        }
      });
    } catch (error) {
      console.error('🔥 EMAIL DEBUG - Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
  // Authentication routes
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phoneNumber } = z.object({ phoneNumber: z.string() }).parse(req.body);
      
      const result = await authService.sendOtp(phoneNumber);
      
      if (result.success) {
        res.json({ message: "OTP sent successfully" });
      } else {
        // In development mode, return OTP for testing when SMS fails
        if (process.env.NODE_ENV === 'development' && result.otp) {
          res.json({ 
            message: "SMS delivery failed, but OTP generated for testing", 
            developmentOtp: result.otp,
            error: result.error
          });
        } else {
          res.json({ message: "OTP sent successfully" }); // Don't expose errors to client in production
        }
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phoneNumber, otp } = z.object({ 
        phoneNumber: z.string(), 
        otp: z.string() 
      }).parse(req.body);
      
      const result = await authService.verifyOtp(phoneNumber, otp, req.ip, req.get('User-Agent'));
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Email Authentication routes
  app.post("/api/auth/send-email-otp", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      console.log(`🔥 EMAIL OTP REQUEST - Sending OTP to: ${email}`);
      const result = await authService.sendEmailOtp(email);
      
      if (result.success) {
        const response: any = { message: "OTP sent successfully to your email" };
        
        // In development mode, include additional info
        if (process.env.NODE_ENV === 'development') {
          if (result.previewUrl) {
            response.previewUrl = result.previewUrl;
            response.message = "OTP sent! Check the preview URL or console for the email.";
          } else if (result.otp) {
            response.developmentOtp = result.otp;
            response.message = "Email service fallback - check console for OTP";
          }
        }
        
        res.json(response);
      } else {
        res.json({ message: "OTP sent successfully to your email" }); // Don't expose errors to client in production
      }
    } catch (error: any) {
      console.error('🔥 EMAIL OTP ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-email-otp", async (req, res) => {
    try {
      const { email, otp } = z.object({ 
        email: z.string().email(), 
        otp: z.string() 
      }).parse(req.body);
      
      console.log(`🔥 EMAIL OTP VERIFICATION - Email: ${email}, OTP: ${otp}`);
      const result = await authService.verifyEmailOtp(email, otp, req.ip, req.get('User-Agent'));
      res.json(result);
    } catch (error: any) {
      console.error('🔥 EMAIL OTP VERIFICATION ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Firebase Authentication routes
  // Patient signup with email OTP - Step 1: Send OTP
  app.post("/api/auth/patient-signup-otp", async (req, res) => {
    try {
      const signupData = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        phoneNumber: z.string().optional(),
        dateOfBirth: z.string().optional(),
        address: z.string().optional(),
        emergencyContact: z.string().optional()
      }).parse(req.body);

      console.log(`🔥 EMAIL SIGNUP - Initiating signup for: ${signupData.email}`);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(signupData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Account already exists with this email address" });
      }

      // Store signup data temporarily and send OTP
      const tempData = {
        ...signupData,
        role: 'patient' as const,
        isActive: true,
        dateOfBirth: signupData.dateOfBirth ? new Date(signupData.dateOfBirth) : undefined,
        phoneNumber: signupData.phoneNumber || `temp${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4)}`
      };

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔥 EMAIL SIGNUP - Generated 6-digit OTP: ${otp} for ${signupData.email}`);
      
      // Generate and send OTP via email
      const otpResult = await emailService.sendOtp(signupData.email, otp);
      
      if (!otpResult.success) {
        // Fallback for development
        if (process.env.NODE_ENV === 'development' && otpResult.otp) {
          console.log(`🔥 EMAIL SIGNUP - Development mode: OTP ${otpResult.otp} for ${signupData.email}`);
          // Store temp data with OTP for verification
          await storage.storeTempSignupData(signupData.email, { ...tempData, otp: otpResult.otp });
          return res.json({ 
            message: "Verification code sent",
            developmentOtp: otpResult.otp 
          });
        }
        return res.status(500).json({ message: "Failed to send verification email. Please try again." });
      }

      // Store temp signup data for verification (include OTP hash for verification)
      const otpHash = await bcrypt.hash(otp, 10);
      await storage.storeTempSignupData(signupData.email, { ...tempData, otpHash });
      
      console.log(`🔥 EMAIL SIGNUP - OTP sent successfully to: ${signupData.email}`);
      res.json({ message: "Verification code sent to your email" });
    } catch (error: any) {
      console.error('🔥 EMAIL SIGNUP ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Patient signup with email OTP - Step 2: Verify OTP and complete signup
  app.post("/api/auth/verify-signup-otp", async (req, res) => {
    try {
      const { email, otp } = z.object({
        email: z.string().email(),
        otp: z.string().length(6)
      }).parse(req.body);

      console.log(`🔥 EMAIL SIGNUP - Verifying OTP for: ${email}`);

      // Get stored signup data first
      const tempData = await storage.getTempSignupData(email);
      if (!tempData) {
        return res.status(400).json({ message: "Signup session expired. Please start over." });
      }

      // Verify OTP using bcrypt comparison
      const otpValid = await bcrypt.compare(otp, tempData.otpHash);
      if (!otpValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Hash password before storing
      const hashedPassword = await bcrypt.hash(tempData.password, 12);

      // Create user account
      const userData = {
        ...tempData,
        password: hashedPassword,
        isApproved: true // Auto-approve patients
      };

      const user = await storage.createUser(userData);
      
      // Generate JWT token for immediate login
      const token = jwt.sign(
        { 
          userId: user.id,
          role: user.role 
        },
        process.env.SESSION_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        { expiresIn: '7d' }
      );

      // Create auth session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await storage.createAuthSession({
        userId: user.id,
        token,
        expiresAt,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        lastActivity: new Date()
      });

      // Clean up temp data
      await storage.deleteTempSignupData(email);

      console.log(`🔥 EMAIL SIGNUP - Account created successfully for: ${user.email}`);

      res.json({
        token,
        user: {
          id: user.id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isActive: user.isActive,
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          emergencyContact: user.emergencyContact
        }
      });
    } catch (error: any) {
      console.error('🔥 EMAIL SIGNUP VERIFICATION ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/patient-signup", async (req, res) => {
    try {
      const signupData = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phoneNumber: z.string().optional(),
        dateOfBirth: z.string().optional(),
        address: z.string().optional(),
        emergencyContact: z.string().optional(),
        firebaseUid: z.string().min(1),
        authProvider: z.enum(['email', 'google']).default('email')
      }).parse(req.body);

      console.log(`🔥 FIREBASE SIGNUP - Creating patient account for: ${signupData.email}`);

      // Check if user already exists with this Firebase UID
      const existingUser = await storage.getUserByFirebaseUid(signupData.firebaseUid);
      if (existingUser) {
        return res.status(400).json({ message: "Account already exists with this authentication method" });
      }

      // Check if user exists with this email
      const existingEmailUser = await storage.getUserByEmail(signupData.email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "Account already exists with this email address" });
      }

      // Create new patient user
      const userData = {
        ...signupData,
        role: 'patient' as const,
        isActive: true,
        isApproved: true, // Auto-approve patients
        dateOfBirth: signupData.dateOfBirth ? new Date(signupData.dateOfBirth) : undefined,
        // Generate unique phone number for Firebase users if not provided (max 20 chars)
        phoneNumber: signupData.phoneNumber || `fb${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 5)}`
      };

      const user = await storage.createUser(userData);
      
      // Generate JWT token for immediate login
      const token = jwt.sign(
        { 
          userId: user.id,
          role: user.role 
        },
        process.env.SESSION_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        { expiresIn: '7d' }
      );

      // Create auth session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      await storage.createAuthSession({
        userId: user.id,
        token,
        expiresAt,
        ipAddress: req.ip || '',
        userAgent: req.get('User-Agent') || '',
        lastActivity: new Date()
      });

      console.log(`🔥 FIREBASE SIGNUP - Account created successfully for: ${user.email}`);

      res.json({
        token,
        user: {
          id: user.id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isActive: user.isActive
        }
      });
    } catch (error: any) {
      console.error('🔥 FIREBASE SIGNUP ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/firebase-login", async (req, res) => {
    try {
      const loginData = z.object({
        firebaseUid: z.string().min(1),
        email: z.string().email(),
        name: z.string().min(1)
      }).parse(req.body);

      console.log(`🔥 FIREBASE LOGIN - Attempting login for: ${loginData.email}`);

      // Find user by Firebase UID first, then by email
      let user = await storage.getUserByFirebaseUid(loginData.firebaseUid);
      
      if (!user) {
        // If no user found by Firebase UID, try to find by email
        user = await storage.getUserByEmail(loginData.email);
        
        if (user) {
          // Update existing user with Firebase UID
          const updatedUser = await storage.updateUser(user.id, {
            firebaseUid: loginData.firebaseUid,
            authProvider: 'google'
          });
          if (updatedUser) {
            user = updatedUser;
            console.log(`🔥 FIREBASE LOGIN - Updated existing user with Firebase UID: ${user.email}`);
          }
        } else {
          return res.status(404).json({ message: "No account found. Please sign up first." });
        }
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account is not active" });
      }

      // Generate JWT token with auth session
      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          ...(user.clinicId && { clinicId: user.clinicId })
        },
        process.env.SESSION_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        { expiresIn: '7d' }
      );

      // Create auth session in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await storage.createAuthSession({
        token,
        userId: user.id,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        expiresAt,
        lastActivity: new Date()
      });

      console.log(`🔥 FIREBASE LOGIN - Login successful for: ${user.email}`);

      res.json({
        token,
        user: {
          id: user.id,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isActive: user.isActive
        }
      });
    } catch (error: any) {
      console.error('🔥 FIREBASE LOGIN ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req, res) => {
    try {
      const token = req.get('Authorization')?.replace('Bearer ', '');
      if (token) {
        await storage.invalidateAuthSession(token);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/register", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.json(user);
    } catch (error: any) {
      console.error('User registration error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      res.json({ user: req.user });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User management routes
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/me", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/me", authMiddleware, async (req, res) => {
    try {
      // Handle date conversion if dateOfBirth is provided as string
      const { dateOfBirth, ...otherData } = req.body;
      const userData = {
        ...otherData,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) })
      };
      
      const validatedData = insertUserSchema.partial().parse(userData);
      const user = await storage.updateUser(req.user!.id, validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users", authMiddleware, async (req, res) => {
    try {
      const { role } = req.query;
      
      // Allow all authenticated users to view doctors (for appointment booking)
      if (role === 'doctor') {
        const users = await storage.getUsersByRole('doctor');
        res.json(users);
      } else {
        // For other roles, require admin permissions
        if (req.user!.role !== 'admin') {
          return res.status(403).json({ message: "Access denied. Insufficient permissions" });
        }
        
        // If no role specified, get all non-patient users for staff management
        if (!role) {
          let staffUsers;
          if (req.user!.clinicId) {
            // Admin with clinic ID - filter by clinic
            const users = await storage.getUsersByClinic(req.user!.clinicId);
            staffUsers = users.filter(user => user.role !== 'patient');
            console.log('🔥 USERS - Admin fetching staff for clinic:', req.user!.clinicId, 'Staff users:', staffUsers.length);
          } else {
            // Admin without clinic ID - get all users
            const users = await storage.getAllUsers();
            staffUsers = users.filter(user => user.role !== 'patient');
            console.log('Fetching staff users. Total users:', users.length, 'Staff users:', staffUsers.length);
          }
          // Add cache-busting headers
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          res.json(staffUsers);
        } else {
          let users;
          if (req.user!.clinicId && req.user!.role === 'admin') {
            // Admin with clinic ID - filter by role and clinic
            users = await storage.getUsersByRoleAndClinic(role as string, req.user!.clinicId);
            console.log('🔥 USERS - Admin fetching role', role, 'for clinic:', req.user!.clinicId, 'Count:', users.length);
          } else {
            users = await storage.getUsersByRole(role as string);
          }
          res.json(users);
        }
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/:id/approve", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.approveUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/:id/deactivate", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.deactivateUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Public doctors endpoint for appointment booking (no auth required)
  app.get('/api/doctors', async (req, res) => {
    try {
      const doctors = await storage.getUsersByRole('doctor');
      const activeDoctors = doctors.filter(doctor => doctor.isActive);
      res.json(activeDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      res.status(500).json({ error: 'Failed to fetch doctors' });
    }
  });

  // Route to handle authenticated patient appointment requests
  app.post('/api/appointments/patient-request', authMiddleware, async (req, res) => {
    try {
      console.log('🔥 PATIENT APPOINTMENT REQUEST:', req.body);
      
      const { doctorId, type, symptoms, preferredDate, urgency, notes } = req.body;
      const patientId = req.user!.id;

      // Create appointment request
      const appointmentData = {
        patientId,
        doctorId,
        appointmentDate: new Date(preferredDate),
        duration: 30, // Default duration
        type,
        status: 'pending_approval',
        symptoms: symptoms || '',
        notes: notes || ''
      };

      console.log('🔥 Creating appointment with data:', appointmentData);
      
      const appointment = await storage.createAppointment(appointmentData);
      console.log('🔥 Appointment created successfully:', appointment.id);

      res.json({
        success: true,
        appointmentId: appointment.id,
        message: "Appointment request submitted successfully. You will receive an SMS notification once reviewed."
      });

    } catch (error: any) {
      console.error('Error creating patient appointment request:', error);
      res.status(500).json({ error: 'Failed to submit appointment request' });
    }
  });

  // Submit appointment request (no auth required for public booking)
  app.post('/api/appointments/request', async (req, res) => {
    try {
      console.log('🔥 APPOINTMENT REQUEST RECEIVED:', req.body);
      
      const { patientInfo, appointmentDetails } = req.body;
      
      // First, check if patient exists or create new patient record
      let patientId;
      try {
        const existingPatient = await storage.getUserByPhone(patientInfo.phoneNumber);
        if (existingPatient) {
          patientId = existingPatient.id;
          console.log('🔥 Found existing patient:', patientId);
        } else {
          // Create new patient record
          const newPatient = await storage.createUser({
            phoneNumber: patientInfo.phoneNumber,
            role: 'patient',
            firstName: patientInfo.firstName,
            lastName: patientInfo.lastName,
            email: patientInfo.email || null,
            dateOfBirth: patientInfo.dateOfBirth || null,
            isActive: true,
            isApproved: false // Will be approved when appointment is approved
          });
          patientId = newPatient.id;
          console.log('🔥 Created new patient:', patientId);
        }
      } catch (error) {
        console.error('Error handling patient:', error);
        return res.status(500).json({ error: 'Failed to process patient information' });
      }
      
      // Create appointment request
      const appointmentData = {
        patientId,
        doctorId: appointmentDetails.doctorId,
        appointmentDate: new Date(appointmentDetails.preferredDate),
        duration: 30, // Default duration
        type: appointmentDetails.type,
        status: 'pending_approval',
        symptoms: appointmentDetails.symptoms || '',
        notes: appointmentDetails.notes || ''
      };
      
      console.log('🔥 Creating appointment with data:', appointmentData);
      const appointment = await storage.createAppointment(appointmentData);
      
      console.log('🔥 Appointment request created successfully:', appointment.id);
      
      // Send SMS notification to patient
      try {
        const doctor = await storage.getUser(appointmentDetails.doctorId);
        await smsService.send(patientInfo.phoneNumber, `Your appointment request with Dr. ${doctor?.firstName} ${doctor?.lastName} for ${new Date(appointmentDetails.preferredDate).toLocaleDateString()} has been submitted. Appointment ID: ${appointment.id}`);
        console.log('🔥 SMS notification sent to patient');
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
        // Don't fail the request if SMS fails
      }
      
      res.json({ 
        success: true, 
        appointmentId: appointment.id,
        patientId,
        message: 'Appointment request submitted successfully. You will receive an SMS notification once reviewed.' 
      });
      
    } catch (error) {
      console.error('Error creating appointment request:', error);
      res.status(500).json({ error: 'Failed to submit appointment request' });
    }
  });

  // Get pending appointment requests for admin approval
  app.get('/api/appointments/pending', authMiddleware, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      console.log('🔥 FETCHING PENDING APPOINTMENTS FOR ADMIN');
      const pendingAppointments = await storage.getPendingAppointments();
      console.log('🔥 Found pending appointments:', pendingAppointments.length);
      res.json(pendingAppointments);
    } catch (error) {
      console.error('Error fetching pending appointments:', error);
      res.status(500).json({ error: 'Failed to fetch pending appointments' });
    }
  });

  // Approve or reject appointment request
  app.patch('/api/appointments/:id/status', authMiddleware, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason, confirmedDate, confirmedTime } = req.body;
      
      console.log('🔥 UPDATING APPOINTMENT STATUS:', { id, status, confirmedDate, confirmedTime });
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' });
      }
      
      // Get appointment details
      const appointment = await storage.getAppointmentById(id);
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      
      // Update appointment status
      const updateData: any = { status };
      
      if (status === 'approved') {
        // If approved, set confirmed date/time and approve patient
        if (confirmedDate && confirmedTime) {
          updateData.appointmentDate = `${confirmedDate}T${confirmedTime}:00.000Z`;
        }
        
        // Approve the patient if they were pending
        await storage.updateUserStatus(appointment.patientId, { isApproved: true });
        console.log('🔥 Patient approved:', appointment.patientId);
      } else if (status === 'rejected') {
        updateData.notes = rejectionReason || updateData.notes;
      }
      
      const updatedAppointment = await storage.updateAppointment(id, updateData);
      
      // Send SMS notification
      try {
        const patient = await storage.getUser(appointment.patientId);
        const doctor = await storage.getUser(appointment.doctorId);
        
        if (status === 'approved') {
          await emailService.sendAppointmentApproved(patient?.email || '', {
            doctorName: `Dr. ${doctor?.firstName} ${doctor?.lastName}`,
            appointmentDate: new Date(updateData.appointmentDate || appointment.appointmentDate).toLocaleDateString(),
            appointmentTime: new Date(updateData.appointmentDate || appointment.appointmentDate).toLocaleTimeString(),
            clinic: 'SmartClinic'
          });
        } else {
          await emailService.sendAppointmentRejected(patient?.email || '', {
            doctorName: `Dr. ${doctor?.firstName} ${doctor?.lastName}`,
            reason: rejectionReason || 'No reason provided',
            appointmentId: id
          });
        }
        console.log('🔥 Status update SMS sent to patient');
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
      }
      
      res.json({ 
        success: true, 
        appointment: updatedAppointment,
        message: `Appointment ${status} successfully` 
      });
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
      res.status(500).json({ error: 'Failed to update appointment status' });
    }
  });

  // Staff GPS verification routes
  app.post("/api/staff/checkin", authMiddleware, requireRole(['staff', 'doctor']), gpsVerificationMiddleware, async (req, res) => {
    try {
      const { latitude, longitude, workLocation } = z.object({
        latitude: z.number(),
        longitude: z.number(),
        workLocation: z.string()
      }).parse(req.body);

      const verification = await storage.createStaffVerification({
        staffId: req.user!.id,
        latitude,
        longitude,
        workLocation
      });

      res.json(verification);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/staff/checkout", authMiddleware, requireRole(['staff', 'doctor']), async (req, res) => {
    try {
      await storage.checkOutStaff(req.user!.id);
      res.json({ message: "Checked out successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/staff/verifications", authMiddleware, requireRole(['staff', 'doctor', 'admin']), async (req, res) => {
    try {
      const { date } = req.query;
      const staffId = req.user!.role === 'admin' ? req.query.staffId as string : req.user!.id;
      const verificationDate = date ? new Date(date as string) : undefined;
      
      const verifications = await storage.getStaffVerifications(staffId, verificationDate);
      res.json(verifications);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin appointment routes (MUST come before general routes)
  app.get("/api/appointments/admin", authMiddleware, requireSuperAdmin, async (req, res) => {
    console.log('🔥 ADMIN APPOINTMENTS ROUTE HIT - START');
    try {

      // Get admin's clinic ID from user data  
      const adminClinicId = req.user!.clinicId;
      console.log('🔥 Admin clinic ID:', adminClinicId);
      
      if (!adminClinicId) {
        console.log('🔥 No clinic ID found for admin user');
        return res.status(400).json({ message: "Admin user has no associated clinic" });
      }

      console.log('🔥 About to call storage.getAppointmentsByClinic() with clinic ID:', adminClinicId);
      const appointments = await storage.getAppointmentsByClinic(adminClinicId);
      console.log('🔥 Found appointments for clinic:', appointments?.length || 0);
      
      if (appointments && appointments.length > 0) {
        console.log('🔥 Sample appointment:', JSON.stringify(appointments[0], null, 2));
      } else {
        console.log('🔥 No appointments returned from storage for clinic', adminClinicId);
      }
      
      console.log('🔥 Sending response with', appointments?.length || 0, 'appointments');
      res.json(appointments || []);
    } catch (error: any) {
      console.error('🔥 ERROR in admin appointments route:', error);
      console.error('🔥 Error stack:', error.stack);
      res.status(500).json({ message: "Failed to fetch appointments", error: error.message });
    }
  });

  // Admin route to approve appointment
  app.post('/api/appointments/admin/:appointmentId/approve', authMiddleware, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      console.log('🔥 APPROVING APPOINTMENT:', appointmentId);
      
      // Update appointment status to scheduled
      const appointment = await storage.updateAppointment(appointmentId, { 
        status: 'scheduled' 
      });
      
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      console.log('🔥 Appointment approved:', appointment.id);

      // Send email and SMS notifications to patient
      try {
        const patient = appointment.patient || await storage.getUser(appointment.patientId);
        const doctor = appointment.doctor || await storage.getUser(appointment.doctorId);
        
        console.log('🔥 APPROVAL - Patient data:', { id: patient?.id, email: patient?.email });
        console.log('🔥 APPROVAL - Doctor data:', { id: doctor?.id, name: `${doctor?.firstName} ${doctor?.lastName}` });
        
        if (patient && doctor && patient.email) {
          const appointmentDate = new Date(appointment.appointmentDate);
          
          console.log('🔥 APPROVAL - Sending email to:', patient.email);
          
          // Send email notification
          const emailResult = await emailService.sendAppointmentApproved(patient.email, {
            doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
            appointmentDate: appointmentDate.toLocaleDateString(),
            appointmentTime: appointmentDate.toLocaleTimeString(),
            clinic: 'SmartClinic'
          });
          
          console.log('🔥 APPROVAL - Email result:', emailResult);
          
          if (emailResult.success) {
            console.log('🔥 APPROVAL - Email sent successfully to:', patient.email);
          } else {
            console.error('🔥 APPROVAL - Email failed:', emailResult.error);
          }
          
          // Send SMS notification (keeping existing SMS functionality)
          try {
            const message = `Good news! Your appointment with Dr. ${doctor.firstName} ${doctor.lastName} on ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString()} has been approved. Please arrive 15 minutes early.`;
            await smsService.send(patient.phoneNumber, message);
            console.log('🔥 APPROVAL - SMS sent to:', patient.phoneNumber);
          } catch (smsError) {
            console.error('🔥 APPROVAL - SMS failed:', smsError);
          }
        } else {
          console.error('🔥 APPROVAL - Missing data:', { 
            patient: !!patient, 
            doctor: !!doctor, 
            email: patient?.email || 'NO EMAIL' 
          });
        }
      } catch (notificationError) {
        console.error('🔥 APPROVAL - Notification error:', notificationError);
      }

      res.json({ 
        success: true, 
        message: 'Appointment approved successfully',
        appointment 
      });
    } catch (error: any) {
      console.error('Error approving appointment:', error);
      res.status(500).json({ error: 'Failed to approve appointment' });
    }
  });

  // Admin route to reject appointment
  app.post('/api/appointments/admin/:appointmentId/reject', authMiddleware, async (req, res) => {
    try {
      const { appointmentId } = req.params;
      console.log('🔥 REJECTING APPOINTMENT:', appointmentId);
      
      // Update appointment status to cancelled
      const appointment = await storage.updateAppointment(appointmentId, { 
        status: 'cancelled' 
      });
      
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      console.log('🔥 Appointment rejected:', appointment.id);

      // Send SMS notification to patient
      try {
        const patient = appointment.patient || await storage.getUser(appointment.patientId);
        const doctor = appointment.doctor || await storage.getUser(appointment.doctorId);
        
        if (patient && doctor) {
          const appointmentDate = new Date(appointment.appointmentDate);
          const message = `We're sorry, but your appointment request with Dr. ${doctor.firstName} ${doctor.lastName} on ${appointmentDate.toLocaleDateString()} could not be approved. Please contact the clinic to schedule an alternative time.`;
          
          await smsService.sendSMS(patient.phoneNumber, message);
          console.log('🔥 Rejection SMS sent to:', patient.phoneNumber);
        }
      } catch (smsError) {
        console.error('Failed to send rejection SMS:', smsError);
        // Don't fail the request if SMS fails
      }

      res.json({ 
        success: true, 
        message: 'Appointment rejected successfully',
        appointment 
      });
    } catch (error: any) {
      console.error('Error rejecting appointment:', error);
      res.status(500).json({ error: 'Failed to reject appointment' });
    }
  });

  // Appointment routes
  app.post("/api/appointments", authMiddleware, async (req, res) => {
    try {
      // Handle date conversion if appointmentDate is provided as string
      const { appointmentDate, ...otherData } = req.body;
      const appointmentData = {
        ...otherData,
        ...(appointmentDate && { appointmentDate: new Date(appointmentDate) }),
        patientId: req.user!.id  // Always set to current user for patients
      };
      
      const validatedData = insertAppointmentSchema.parse(appointmentData);
      
      const appointment = await storage.createAppointment(validatedData);
      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/appointments", authMiddleware, async (req, res) => {
    try {
      const { date, doctorId } = req.query;
      
      if (date) {
        const appointmentDate = new Date(date as string);
        const appointments = await storage.getAppointmentsByDate(appointmentDate, doctorId as string);
        res.json(appointments);
      } else {
        const appointments = await storage.getUserAppointments(req.user!.id, req.user!.role);
        res.json(appointments);
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/appointments/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const appointment = await storage.getAppointmentWithDetails(id);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Check access permissions
      if (req.user!.role === 'patient' && appointment.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (req.user!.role === 'doctor' && appointment.doctorId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/appointments/:id", authMiddleware, async (req, res) => {
    console.log('🚨🚨🚨 CORRECT RESCHEDULE ROUTE HIT!!! 🚨🚨🚨');
    console.log('🚨 Method:', req.method, 'Path:', req.path);
    console.log('🚨 Appointment ID:', req.params.id);
    console.log('🚨 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { id } = req.params;
      // Handle date conversion if appointmentDate is provided as string
      const { appointmentDate, ...otherData } = req.body;
      const appointmentData = {
        ...otherData,
        ...(appointmentDate && { appointmentDate: new Date(appointmentDate) })
      };
      
      const validatedData = insertAppointmentSchema.partial().parse(appointmentData);
      
      // Get the original appointment first to compare dates
      const existingAppointment = await storage.getAppointment(id);
      if (!existingAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Check permissions
      if (req.user!.role === 'patient' && existingAppointment.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (req.user!.role === 'doctor' && existingAppointment.doctorId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const appointment = await storage.updateAppointment(id, validatedData);
      
      if (!appointment) {
        return res.status(500).json({ message: "Failed to update appointment" });
      }
      
      // Check if appointment date was changed (rescheduled)
      const wasRescheduled = appointmentData.appointmentDate && 
        new Date(appointmentData.appointmentDate).getTime() !== new Date(existingAppointment.appointmentDate).getTime();
      
      console.log('🔥 RESCHEDULE DEBUG - Was rescheduled?', wasRescheduled);
      console.log('🔥 RESCHEDULE DEBUG - Original date:', existingAppointment.appointmentDate);
      console.log('🔥 RESCHEDULE DEBUG - New date:', appointmentData.appointmentDate);
      
      if (wasRescheduled) {
        console.log('🔥 RESCHEDULE DEBUG - Sending email notification...');
        
        try {
          // Get patient and doctor details for email
          const patient = await storage.getUser(appointment.patientId);
          const doctor = await storage.getUser(appointment.doctorId);
          
          console.log('🔥 RESCHEDULE DEBUG - Patient email:', patient?.email);
          console.log('🔥 RESCHEDULE DEBUG - Doctor name:', doctor?.firstName, doctor?.lastName);
          
          if (patient?.email) {
            // Format dates for email using Indian Standard Time
            const originalDate = new Date(existingAppointment.appointmentDate);
            const newDate = new Date(appointmentData.appointmentDate);
            
            console.log('🔥 RESCHEDULE DEBUG - Calling emailService.sendAppointmentRescheduled...');
            
            const emailResult = await emailService.sendAppointmentRescheduled(patient.email, {
              doctorName: `Dr. ${doctor?.firstName} ${doctor?.lastName}`,
              originalDate: originalDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
              originalTime: originalDate.toLocaleTimeString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit'
              }),
              newDate: newDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
              newTime: newDate.toLocaleTimeString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit'
              }),
              clinic: 'SmartClinic'
            });
            
            console.log('🔥 RESCHEDULE DEBUG - Email result:', emailResult);
            
            if (emailResult.success) {
              console.log('✅ Reschedule email sent successfully to:', patient.email);
            } else {
              console.error('❌ Failed to send reschedule email:', emailResult.error);
            }
          } else {
            console.log('🔥 RESCHEDULE DEBUG - No patient email found, skipping email notification');
          }
        } catch (emailError) {
          console.error('🔥 RESCHEDULE DEBUG - Error sending email:', emailError);
        }
      } else {
        console.log('🔥 RESCHEDULE DEBUG - No email sent because appointment was not rescheduled');
      }
      
      res.json(appointment);
    } catch (error: any) {
      console.error('🔥 RESCHEDULE DEBUG - Route error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/appointments/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const appointment = await storage.cancelAppointment(id);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Queue management routes
  app.post("/api/queue/join", authMiddleware, requireRole(['patient']), async (req, res) => {
    try {
      const { doctorId, appointmentId, priority } = z.object({
        doctorId: z.string(),
        appointmentId: z.string().optional(),
        priority: z.number().default(1)
      }).parse(req.body);

      const tokenNumber = await storage.getNextTokenNumber(doctorId, appointmentId);
      const queueToken = await storage.createQueueToken({
        tokenNumber,
        patientId: req.user!.id,
        doctorId,
        appointmentId,
        priority
      });

      res.json(queueToken);
      
      // Trigger WebSocket broadcast for live queue updates
      await queueService.broadcastWebSocketUpdate(doctorId);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Test endpoint to add queue token for testing (admin only)
  // Reorder queue by appointment time (admin only)
  app.post("/api/queue/reorder", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { doctorId } = z.object({
        doctorId: z.string()
      }).parse(req.body);

      console.log('🔥 MANUAL REORDER - Starting for doctor:', doctorId);
      await storage.reorderQueueByAppointmentTime(doctorId);
      
      // Trigger WebSocket broadcast for live queue updates
      await queueService.broadcastWebSocketUpdate(doctorId);

      res.json({ success: true, message: "Queue reordered by appointment time" });
    } catch (error: any) {
      console.error('🔥 QUEUE REORDER ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });



  // Test reorder directly
  app.get("/api/queue/test-reorder", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const doctorId = "f3c906ec-c286-4a3c-b345-efb174acddad";
      console.log('🔥 TEST REORDER - Starting for doctor:', doctorId);
      await storage.reorderQueueByAppointmentTime(doctorId);
      
      // Get updated queue after reorder
      const updatedQueue = await storage.getAllQueueTokens();
      
      // Broadcast updates
      await queueService.broadcastWebSocketUpdate(doctorId);
      
      res.json({ success: true, message: "Queue reordered", queue: updatedQueue });
    } catch (error: any) {
      console.error('🔥 TEST REORDER ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // API endpoint to clean up duplicate queue entries
  app.post("/api/queue/cleanup", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      await storage.removeDuplicateQueueTokens();
      res.json({ success: true, message: "Queue cleanup completed" });
    } catch (error: any) {
      console.error('🔥 CLEANUP ERROR:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/queue/test-add", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { patientId, doctorId } = z.object({
        patientId: z.string(),
        doctorId: z.string()
      }).parse(req.body);

      const tokenNumber = await storage.getNextTokenNumber(doctorId);
      const queueToken = await storage.createQueueToken({
        tokenNumber,
        patientId,
        doctorId,
        priority: 1
      });

      console.log('🔥 TEST QUEUE TOKEN CREATED:', queueToken);
      
      // Trigger WebSocket broadcast for live queue updates
      await queueService.broadcastWebSocketUpdate(doctorId);
      console.log('🔥 TEST BROADCAST SENT');

      res.json({ success: true, queueToken });
    } catch (error: any) {
      console.error('🔥 TEST QUEUE ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/queue/doctor/:doctorId", authMiddleware, async (req, res) => {
    try {
      const { doctorId } = req.params;
      const queue = await storage.getDoctorQueue(doctorId);
      res.json(queue);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/queue/position", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { doctorId } = req.query;
      // If no doctorId provided, get the latest queue position for the patient
      const position = await storage.getPatientQueuePosition(req.user!.id, doctorId as string);
      res.json(position || { tokenNumber: null, position: null, estimatedWaitTime: 0 });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/queue/:id/status", authMiddleware, requireRole(['admin', 'doctor', 'staff']), async (req, res) => {
    try {
      console.log('🔥 FIRST QUEUE ROUTE HIT - User role:', req.user?.role, 'Token ID:', req.params.id)
      
      const { id } = req.params;
      const { status } = z.object({ status: z.string() }).parse(req.body);
      
      console.log('🔥 First route updating token:', id, 'to status:', status)
      const token = await storage.updateQueueTokenStatus(id, status, new Date());
      if (!token) {
        return res.status(404).json({ message: "Queue token not found" });
      }

      // Broadcast queue update via Server-Sent Events
      queueService.broadcastQueueUpdate(token.doctorId);
      
      // Broadcast to WebSocket clients
      queueService.broadcastWebSocketUpdate(token.doctorId);

      console.log('🔥 First route update successful')
      res.json(token);
    } catch (error: any) {
      console.log('🔥 First route error:', error.message)
      res.status(400).json({ message: error.message });
    }
  });

  // Real-time queue updates (Server-Sent Events)
  app.get("/api/queue/events/:doctorId", authMiddleware, (req, res) => {
    const { doctorId } = req.params;
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    queueService.addClient(doctorId, res);

    req.on('close', () => {
      queueService.removeClient(doctorId, res);
    });
  });

  // WebSocket server for real-time updates (queue and general)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req: any) => {
    console.log('🔥 WebSocket client connected');
    queueService.addWebSocketClient(ws);
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle queue-specific subscriptions
        if (data.type === 'subscribe_patient_queue' && data.patientId) {
          // Subscribe patient to their queue updates
          (ws as any).patientId = data.patientId;
          console.log(`🔥 Patient ${data.patientId} subscribed to queue updates`);
          
          // Send current queue position
          const position = await storage.getPatientQueuePosition(data.patientId);
          ws.send(JSON.stringify({ type: 'queue_position', data: position || { tokenNumber: null, position: null, estimatedWaitTime: 0 } }));
        }
        
        if (data.type === 'subscribe_admin_queue') {
          // Subscribe admin to all queue updates
          (ws as any).isAdmin = true;
          console.log('🔥 Admin subscribed to queue updates');
          
          // Send current queue data
          const queueTokens = await storage.getAllQueueTokens();
          console.log('🔥 Admin subscription - Queue tokens found:', queueTokens?.length || 0);
          console.log('🔥 Admin subscription - Sample token:', queueTokens?.[0] || 'none');
          
          const response = { type: 'admin_queue_update', data: queueTokens };
          console.log('🔥 Admin subscription - Sending WebSocket response:', JSON.stringify(response).substring(0, 200) + '...');
          
          ws.send(JSON.stringify(response));
          console.log('🔥 Admin subscription - WebSocket message sent successfully');
        }
        
        // Handle general WebSocket messages
        if (data.type === 'subscribe') {
          ws.send(JSON.stringify({ type: 'subscribed', channel: data.channel }));
        }
        
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('🔥 WebSocket client disconnected');
      queueService.removeWebSocketClient(ws);
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  // Medicine routes
  app.post("/api/medicines", authMiddleware, requireRole(['doctor', 'admin']), async (req, res) => {
    try {
      const medicineData = insertMedicineSchema.parse(req.body);
      const medicine = await storage.createMedicine(medicineData);
      res.json(medicine);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/medicines", authMiddleware, async (req, res) => {
    try {
      const { search } = req.query;
      // Only return actual clinic medicines, not patient-added ones
      const medicines = search 
        ? await storage.searchClinicMedicines(search as string, req.user!.clinicId)
        : await storage.getClinicMedicines(req.user!.clinicId);
      res.json(medicines);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Prescription routes
  app.post("/api/prescriptions", authMiddleware, requireRole(['doctor']), async (req, res) => {
    try {
      const prescriptionData = insertPrescriptionSchema.parse(req.body);
      prescriptionData.doctorId = req.user!.id;
      
      const prescription = await storage.createPrescription(prescriptionData);
      
      // Schedule medicine reminders
      await schedulerService.createMedicineReminders(prescription.id);
      
      res.json(prescription);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/prescriptions", authMiddleware, async (req, res) => {
    try {
      const { patientId } = req.query;
      
      if (req.user!.role === 'patient') {
        const prescriptions = await storage.getPatientPrescriptions(req.user!.id);
        res.json(prescriptions);
      } else if (patientId) {
        const prescriptions = await storage.getPatientPrescriptions(patientId as string);
        res.json(prescriptions);
      } else {
        res.status(400).json({ message: "Patient ID required" });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/prescriptions/active", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const prescriptions = await storage.getActivePrescriptions(req.user!.id);
      res.json(prescriptions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Custom medicine routes - properly implemented
  
  // Edit medicine
  app.put("/api/custom-medicines/:id", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, dosage, frequency, instructions, startDate, endDate, timings } = req.body;
      
      // Get existing prescription to update
      const prescription = await storage.getPrescription(id);
      if (!prescription) {
        return res.status(404).json({ message: "Medicine not found" });
      }
      
      // Update medicine details
      const updatedMedicine = await storage.updateMedicine(prescription.medicineId, {
        name,
        strength: dosage || '1 tablet',
        manufacturer: 'Patient Added'
      });
      
      // Update prescription with custom timings
      const updatedPrescription = await storage.updatePrescription(id, {
        dosage,
        frequency,
        instructions,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        timings: timings || null
      });
      
      // Delete existing future reminders and regenerate with new timings
      await storage.deleteFutureReminders(id);
      
      // Regenerate reminders with new timings
      try {
        await schedulerService.createMedicineReminders(id);
        console.log('🔥 Medicine reminders regenerated with new timings');
      } catch (error) {
        console.error('Error regenerating reminders:', error);
      }
      
      if (!updatedPrescription || !updatedMedicine) {
        return res.status(500).json({ message: "Failed to update medicine" });
      }
      
      res.json({ 
        success: true, 
        medicine: {
          id: updatedPrescription.id,
          name: updatedMedicine.name,
          dosage: updatedPrescription.dosage,
          frequency: updatedPrescription.frequency,
          instructions: updatedPrescription.instructions,
          startDate: updatedPrescription.startDate,
          endDate: updatedPrescription.endDate,
          timings: timings || []
        }
      });
    } catch (error: any) {
      console.error('Error updating medicine:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete medicine
  app.delete("/api/custom-medicines/:id", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get prescription first
      const prescription = await storage.getPrescription(id);
      if (!prescription) {
        return res.status(404).json({ message: "Medicine not found" });
      }
      
      // Delete associated reminders first
      await storage.deleteFutureReminders(id);
      
      // Delete prescription
      await storage.deletePrescription(id);
      
      // Delete medicine if it was patient-added (get medicine info first)
      const medicine = await storage.getMedicine(prescription.medicineId);
      if (medicine && medicine.manufacturer === 'Patient Added') {
        await storage.deleteMedicine(prescription.medicineId);
      }
      
      res.json({ success: true, message: "Medicine deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting medicine:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/custom-medicines", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { name, dosage, frequency, instructions, startDate, endDate, timings } = req.body;
      
      // First create a medicine entry
      const medicine = await storage.createMedicine({
        name,
        description: `Custom medicine added by patient`,
        dosageForm: 'custom',
        strength: dosage,
        manufacturer: 'Patient Added',
        clinicId: req.user!.clinicId || 'default-clinic-id'
      });

      // Then create a prescription for this custom medicine
      const prescription = await storage.createPrescription({
        patientId: req.user!.id,
        doctorId: req.user!.id, // Self-prescribed for custom medicines
        medicineId: medicine.id,
        dosage,
        frequency,
        instructions,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        timings: timings || null,
        totalDoses: 30, // Default
        status: 'active'
      });

      // Create reminders for this prescription
      if (schedulerService) {
        try {
          await schedulerService.createMedicineReminders(prescription.id);
        } catch (error) {
          console.error('Failed to create reminders for custom medicine:', error);
        }
      }

      res.json({ success: true, medicine, prescription, timings });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/custom-medicines", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      // Return patient's custom medicines (medicines they added themselves)
      const prescriptions = await storage.getPatientPrescriptions(req.user!.id);
      const customMedicines = prescriptions
        .filter(p => p.medicine.manufacturer === 'Patient Added')
        .map(p => {
          // Use custom timings if available, otherwise fall back to frequency-based defaults
          const timings = p.timings && p.timings.length > 0 
            ? p.timings 
            : generateTimingsFromFrequency(p.frequency);
          
          return {
            id: p.id,
            name: p.medicine.name,
            dosage: p.dosage,
            frequency: p.frequency,
            instructions: p.instructions,
            startDate: p.startDate,
            endDate: p.endDate,
            status: p.status,
            medicine: p.medicine,
            timings
          };
        });
      
      res.json(customMedicines);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/medicines/upload", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { medicineList } = req.body;
      
      if (!medicineList || typeof medicineList !== 'string') {
        return res.status(400).json({ message: "Medicine list text is required" });
      }

      // Parse the medicine list (expecting format like "Medicine Name - Dosage - Frequency - Instructions")
      const lines = medicineList.split('\n').filter(line => line.trim());
      const createdMedicines = [];

      // Helper function to normalize frequency text to valid enum values
      const normalizeFrequency = (freq: string): "once_daily" | "twice_daily" | "three_times_daily" | "four_times_daily" | "as_needed" | "weekly" | "monthly" => {
        const normalized = freq.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (normalized.includes('once') || normalized.includes('1') || normalized.includes('daily') || normalized === '') {
          return 'once_daily';
        } else if (normalized.includes('twice') || normalized.includes('2') || normalized.includes('bid')) {
          return 'twice_daily';
        } else if (normalized.includes('three') || normalized.includes('3') || normalized.includes('tid')) {
          return 'three_times_daily';
        } else if (normalized.includes('four') || normalized.includes('4') || normalized.includes('qid')) {
          return 'four_times_daily';
        } else if (normalized.includes('needed') || normalized.includes('prn')) {
          return 'as_needed';
        } else if (normalized.includes('week')) {
          return 'weekly';
        } else if (normalized.includes('month')) {
          return 'monthly';
        } else {
          return 'once_daily'; // default fallback
        }
      };

      console.log('🔥 BULK UPLOAD - Processing lines:', lines);
      
      for (const line of lines) {
        const parts = line.split('-').map(part => part.trim());
        if (parts.length >= 1 && parts[0]) { // Only require medicine name
          const name = parts[0];
          const dosage = parts[1] || '1 tablet';
          const rawFrequency = parts[2] || 'once daily';
          const frequency = normalizeFrequency(rawFrequency);
          const instructions = parts[3] || 'Take as prescribed';

          console.log(`🔥 BULK UPLOAD - Processing: ${name} | ${dosage} | ${rawFrequency} -> ${frequency} | ${instructions}`);

          try {
            // Create medicine
            const medicine = await storage.createMedicine({
              name,
              description: `Uploaded medicine by patient`,
              dosageForm: 'tablet',
              strength: dosage,
              manufacturer: 'Patient Added',
              clinicId: req.user!.clinicId || 'default-clinic-id'
            });

            // Create prescription
            const prescription = await storage.createPrescription({
              patientId: req.user!.id,
              doctorId: req.user!.id,
              medicineId: medicine.id,
              dosage,
              frequency: frequency,
              instructions,
              startDate: new Date(),
              totalDoses: 30,
              status: 'active'
            });

            // Create reminders for this prescription
            if (schedulerService) {
              try {
                await schedulerService.createMedicineReminders(prescription.id);
              } catch (error) {
                console.error('Failed to create reminders for uploaded medicine:', error);
              }
            }

            createdMedicines.push({ medicine, prescription });
            console.log(`🔥 BULK UPLOAD - Successfully added: ${name}`);
          } catch (error) {
            console.error(`🔥 BULK UPLOAD - Failed to add ${name}:`, error);
          }
        } else {
          console.log(`🔥 BULK UPLOAD - Skipping invalid line: "${line}"`);
        }
      }

      res.json({ 
        success: true, 
        message: `Added ${createdMedicines.length} medicines`,
        medicines: createdMedicines
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/reminders/:id", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = z.object({ status: z.enum(['taken', 'skipped', 'not_taken']) }).parse(req.body);
      
      if (status === 'not_taken') {
        // Reset the reminder status to not taken
        const reminder = await storage.resetReminderStatus(id);
        if (!reminder) {
          return res.status(404).json({ message: "Reminder not found" });
        }
        res.json(reminder);
      } else {
        const reminder = await storage.updateReminderStatus(id, status);
        if (!reminder) {
          return res.status(404).json({ message: "Reminder not found" });
        }
        res.json(reminder);
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get missed doses count for each medicine
  app.get("/api/reminders/missed", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const reminders = await storage.getPatientReminders(req.user!.id);
      const now = new Date();
      
      // Group by medicine and count missed doses
      const missedDosesPerMedicine = reminders.reduce((acc: any, reminder: any) => {
        const medicineName = reminder.prescription?.medicine?.name;
        const scheduledTime = new Date(reminder.scheduledAt);
        const isOverdue = !reminder.isTaken && !reminder.isSkipped && scheduledTime < now;
        
        if (!acc[medicineName]) {
          acc[medicineName] = {
            medicineName,
            totalReminders: 0,
            missedDoses: 0,
            overdueToday: 0
          };
        }
        
        acc[medicineName].totalReminders++;
        
        if (reminder.isSkipped) {
          acc[medicineName].missedDoses++;
        }
        
        if (isOverdue) {
          acc[medicineName].overdueToday++;
        }
        
        return acc;
      }, {});
      
      res.json(Object.values(missedDosesPerMedicine));
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Emergency request endpoint
  app.post("/api/emergency", authMiddleware, requireRole(['patient']), async (req, res) => {
    try {
      const { doctorId, urgencyLevel, symptoms, contactMethod, location, notes } = req.body;
      
      // For now, return success message - would integrate with actual emergency services
      res.json({ 
        success: true, 
        message: "Emergency request submitted successfully. A doctor will contact you immediately.",
        emergencyId: `emergency_${Date.now()}`,
        estimatedResponseTime: contactMethod === 'ambulance' ? '5-10 minutes' : '2-5 minutes'
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Settings endpoints
  app.put("/api/users/settings", authMiddleware, async (req, res) => {
    try {
      const settings = req.body;
      
      // For now, return success - would store in user preferences table
      res.json({ success: true, message: "Settings updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delete account endpoint
  app.delete("/api/users/me", authMiddleware, async (req, res) => {
    try {
      // Deactivate user instead of deleting to preserve data integrity
      const user = await storage.deactivateUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Invalidate all user sessions
      await storage.invalidateUserSessions(req.user!.id);
      
      res.json({ success: true, message: "Account deactivated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Notification endpoints
  app.get("/api/notifications", authMiddleware, async (req, res) => {
    try {
      // For now, return sample notifications
      const notifications = [
        {
          id: "1",
          title: "Appointment Reminder",
          message: "You have an appointment with Dr. Sarah Johnson at 2:30 PM today",
          type: "appointment",
          read: false,
          createdAt: new Date().toISOString()
        },
        {
          id: "2", 
          title: "Medicine Reminder",
          message: "Time to take your medication - Aspirin 500mg",
          type: "medicine",
          read: false,
          createdAt: new Date().toISOString()
        },
        {
          id: "3",
          title: "Queue Update", 
          message: "You are now #2 in the queue for Dr. Kumar",
          type: "queue",
          read: true,
          createdAt: new Date().toISOString()
        }
      ];
      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/notifications/:id/read", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      // For now, return success
      res.json({ success: true, message: "Notification marked as read" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Cancel appointment endpoint
  app.put("/api/appointments/:id/cancel", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const appointment = await storage.cancelAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Medicine reminder routes
  app.get("/api/reminders", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { date } = req.query;
      const reminderDate = date ? new Date(date as string) : new Date();
      const reminders = await storage.getPatientReminders(req.user!.id, reminderDate);
      res.json(reminders);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/reminders/:id/taken", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const reminder = await storage.markReminderTaken(id);
      
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      res.json(reminder);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/reminders/:id/skipped", authMiddleware, requireRole(['patient', 'admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const reminder = await storage.markReminderSkipped(id);
      
      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      res.json(reminder);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Delay notification routes
  app.post("/api/delays", authMiddleware, requireRole(['doctor', 'staff', 'admin']), async (req, res) => {
    try {
      const delayData = insertDelayNotificationSchema.parse(req.body);
      // For doctors, use their own ID; for staff/admin, use the provided doctorId
      if (req.user!.role === 'doctor') {
        delayData.doctorId = req.user!.id;
      }
      
      const notification = await storage.createDelayNotification(delayData);
      
      // Send SMS notifications to affected patients
      await smsService.sendDelayNotifications(notification.doctorId, notification.delayMinutes, notification.reason || undefined);
      
      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Public endpoint for delay notifications (patients should see all active delays)
  app.get("/api/delays", async (req, res) => {
    try {
      // Get all active delay notifications for public viewing
      const notifications = await storage.getAllActiveDelayNotifications();
      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/delays/:id/resolve", authMiddleware, requireRole(['doctor', 'staff']), async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.resolveDelayNotification(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Delay notification not found" });
      }

      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Patient Feedback routes
  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertPatientFeedbackSchema.parse(req.body);
      
      // Check if user is authenticated, if so use their ID, otherwise allow anonymous feedback
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartclinic-secret') as any;
          feedbackData.patientId = decoded.id;
        } catch {
          // Invalid token, but still allow feedback submission
          feedbackData.patientId = null;
        }
      } else {
        feedbackData.patientId = null;
      }
      
      const feedback = await storage.createPatientFeedback(feedbackData);
      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/feedback", authMiddleware, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      const feedback = await storage.getAllPatientFeedback();
      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/feedback/patient/:patientId", authMiddleware, requireRole(['admin', 'staff', 'doctor']), async (req, res) => {
    try {
      const { patientId } = req.params;
      const feedback = await storage.getPatientFeedbackByPatientId(patientId);
      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/feedback/:id/read", authMiddleware, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      const { id } = req.params;
      const updatedFeedback = await storage.markFeedbackAsRead(id);
      if (!updatedFeedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      res.json(updatedFeedback);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Home visit routes
  app.post("/api/home-visits", authMiddleware, requireRole(['doctor']), async (req, res) => {
    try {
      const visitData = insertHomeVisitSchema.parse(req.body);
      visitData.doctorId = req.user!.id;
      
      const visit = await storage.createHomeVisit(visitData);
      res.json(visit);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/home-visits", authMiddleware, async (req, res) => {
    try {
      const { date } = req.query;
      const visitDate = date ? new Date(date as string) : undefined;
      
      if (req.user!.role === 'doctor') {
        const visits = await storage.getDoctorHomeVisits(req.user!.id, visitDate);
        res.json(visits);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/home-visits/:id", authMiddleware, requireRole(['doctor']), async (req, res) => {
    try {
      const { id } = req.params;
      const visitData = insertHomeVisitSchema.partial().parse(req.body);
      
      const visit = await storage.updateHomeVisit(id, visitData);
      if (!visit) {
        return res.status(404).json({ message: "Home visit not found" });
      }

      res.json(visit);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Medical history routes
  app.post("/api/medical-history", authMiddleware, requireRole(['doctor']), async (req, res) => {
    try {
      const historyData = insertMedicalHistorySchema.parse(req.body);
      historyData.doctorId = req.user!.id;
      
      const history = await storage.createMedicalHistory(historyData);
      res.json(history);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/medical-history", authMiddleware, async (req, res) => {
    try {
      const { patientId } = req.query;
      
      if (req.user!.role === 'patient') {
        const history = await storage.getPatientMedicalHistory(req.user!.id);
        res.json(history);
      } else if (patientId) {
        const history = await storage.getPatientMedicalHistory(patientId as string);
        res.json(history);
      } else {
        res.status(400).json({ message: "Patient ID required" });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Admin-specific routes
  app.get("/api/admin/dashboard-stats", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {

      // Get admin's clinic ID
      const adminClinicId = req.user!.clinicId;
      console.log('🔥 DASHBOARD STATS - Admin clinic ID:', adminClinicId);
      
      if (!adminClinicId) {
        return res.status(400).json({ message: "Admin user has no associated clinic" });
      }

      // Get today's date for filtering - use August 9th as "today"
      const today = new Date('2025-08-09');
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log('🔥 DASHBOARD STATS - Date range:', { 
        today: today.toISOString(), 
        tomorrow: tomorrow.toISOString(),
        todayLocal: today.toLocaleDateString(),
        tomorrowLocal: tomorrow.toLocaleDateString()
      });

      // Fetch clinic-specific stats
      const todayAppointments = await storage.getAppointmentsByDateRange(today, tomorrow, adminClinicId);
      console.log('🔥 DASHBOARD STATS - Found appointments for clinic:', todayAppointments.length);
      console.log('🔥 DASHBOARD STATS - Sample appointment dates:', todayAppointments.slice(0, 3).map(apt => ({
        id: apt.id,
        appointmentDate: apt.appointmentDate,
        status: apt.status
      })));
      
      const completedAppointments = todayAppointments.filter((apt: any) => apt.status === 'completed');
      console.log('🔥 DASHBOARD STATS - Completed appointments:', completedAppointments.length);
      console.log('🔥 DASHBOARD STATS - Completed IDs:', completedAppointments.map(apt => ({ id: apt.id, status: apt.status })));
      
      const revenue = completedAppointments.length * 150; // Assuming $150 per consultation

      const stats = {
        patientsToday: todayAppointments.length,
        completedAppointments: completedAppointments.length,
        revenue: revenue,
        activeStaff: await storage.getActiveStaffCountByClinic(adminClinicId),
      };

      console.log('🔥 DASHBOARD STATS - Final stats:', stats);
      res.json(stats);
    } catch (error: any) {
      console.error('🔥 DASHBOARD STATS - Error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Reports endpoint
  app.get("/api/reports/daily", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      // Get today's date for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch comprehensive data for the report
      const todayAppointments = await storage.getAppointmentsByDateRange(today, tomorrow);
      const completedAppointments = todayAppointments.filter((apt: any) => apt.status === 'completed');
      const cancelledAppointments = todayAppointments.filter((apt: any) => apt.status === 'cancelled');
      const pendingAppointments = todayAppointments.filter((apt: any) => apt.status === 'scheduled');
      
      const allPatients = await storage.getPatients();
      const todayPatients = allPatients.filter(patient => {
        const patientDate = new Date(patient.createdAt);
        return patientDate >= today && patientDate < tomorrow;
      });

      const queueTokens = await storage.getQueueTokens();
      const todayQueue = queueTokens.filter(token => {
        const tokenDate = new Date(token.createdAt);
        return tokenDate >= today && tokenDate < tomorrow;
      });

      const revenue = completedAppointments.length * 150; // $150 per consultation
      const activeStaff = await storage.getActiveStaffCount();

      const report = {
        date: today.toISOString().split('T')[0],
        summary: {
          totalPatients: todayPatients.length,
          totalAppointments: todayAppointments.length,
          completedAppointments: completedAppointments.length,
          cancelledAppointments: cancelledAppointments.length,
          pendingAppointments: pendingAppointments.length,
          revenue: revenue,
          activeStaff: activeStaff,
          queueProcessed: todayQueue.length
        },
        appointments: {
          total: todayAppointments.length,
          completed: completedAppointments.length,
          cancelled: cancelledAppointments.length,
          pending: pendingAppointments.length,
          completionRate: todayAppointments.length > 0 ? Math.round((completedAppointments.length / todayAppointments.length) * 100) : 0
        },
        patients: {
          newRegistrations: todayPatients.length,
          totalActive: allPatients.filter(p => p.isActive).length,
          totalRegistered: allPatients.length
        },
        queue: {
          processed: todayQueue.filter(t => t.status === 'completed').length,
          waiting: todayQueue.filter(t => t.status === 'waiting').length,
          missed: todayQueue.filter(t => t.status === 'missed').length,
          averageWaitTime: todayQueue.length > 0 ? Math.round(todayQueue.reduce((acc, t) => acc + (t.estimatedWaitTime || 15), 0) / todayQueue.length) : 0
        },
        financial: {
          grossRevenue: revenue,
          consultationFees: completedAppointments.length * 150,
          averageRevenuePerPatient: todayPatients.length > 0 ? Math.round(revenue / todayPatients.length) : 0
        },
        staff: {
          active: activeStaff,
          onDuty: activeStaff, // Assuming all active staff are on duty
          productivity: completedAppointments.length > 0 ? Math.round(completedAppointments.length / Math.max(activeStaff, 1)) : 0
        },
        generatedAt: new Date().toISOString(),
        generatedBy: req.user!.firstName + ' ' + req.user!.lastName
      };

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Medicine management routes
  app.get("/api/medicines", authMiddleware, async (req, res) => {
    try {
      // For admin users, filter by clinic ID
      if (req.user!.role === 'admin' && req.user!.clinicId) {
        const medicines = await storage.getMedicinesByClinic(req.user!.clinicId);
        console.log('🔥 MEDICINES - Admin fetching for clinic:', req.user!.clinicId, 'Count:', medicines.length);
        res.json(medicines);
      } else {
        const medicines = await storage.getAllMedicines();
        res.json(medicines);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/medicines", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, strength, dosageForm, manufacturer, stock, description } = req.body;
      
      const medicine = await storage.addMedicine({
        name,
        strength,
        dosageForm,
        manufacturer,
        stock: parseInt(stock) || 0,
        description
      });
      
      res.json(medicine);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/medicines/:medicineId", authMiddleware, requireSuperAdmin, async (req, res) => {
    try {

      const { medicineId } = req.params;
      const { name, strength, dosageForm, manufacturer, stock, description } = req.body;
      
      console.log(`Updating medicine ${medicineId} with:`, { name, strength, dosageForm, manufacturer, stock, description });
      
      const medicine = await storage.updateMedicine(medicineId, {
        name,
        strength,
        dosageForm,
        manufacturer,
        stock: parseInt(stock) || 0,
        description
      });
      
      console.log('Updated medicine result:', medicine);
      
      if (!medicine) {
        return res.status(404).json({ message: "Medicine not found" });
      }
      
      res.json(medicine);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/medicines/:medicineId/restock", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { medicineId } = req.params;
      const { amount } = req.body;
      
      const medicine = await storage.getMedicineById(medicineId);
      if (!medicine) {
        return res.status(404).json({ message: "Medicine not found" });
      }
      
      const newStock = (medicine.stock || 0) + parseInt(amount);
      console.log(`Restocking medicine ${medicineId}: current stock ${medicine.stock}, adding ${amount}, new stock ${newStock}`);
      
      const updatedMedicine = await storage.updateMedicine(medicineId, {
        ...medicine,
        stock: newStock
      });
      
      console.log('Updated medicine result:', updatedMedicine);
      res.json(updatedMedicine);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Other admin routes
  app.get("/api/queue/admin", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get admin's clinic ID
      const adminClinicId = req.user!.clinicId;
      console.log('🔥 QUEUE ADMIN - Admin clinic ID:', adminClinicId);
      
      if (!adminClinicId) {
        return res.status(400).json({ message: "Admin user has no associated clinic" });
      }

      const tokens = await storage.getQueueTokensByClinic(adminClinicId);
      console.log('🔥 QUEUE ADMIN - Found tokens for clinic:', tokens.length);
      res.json(tokens);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });



  app.put("/api/users/:userId/approve", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { isApproved } = req.body;
      
      const user = await storage.updateUserApproval(userId, isApproved);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User approval status updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/queue/:tokenId/status", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'doctor' && req.user!.role !== 'staff') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { tokenId } = req.params;
      const { status } = req.body;
      
      const updatedToken = await storage.updateQueueTokenStatus(tokenId, status, new Date());
      if (!updatedToken) {
        return res.status(404).json({ message: "Queue token not found" });
      }

      res.json({ message: "Queue status updated successfully", token: updatedToken });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Staff Management Routes
  app.put("/api/users/:userId/activate", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const user = await storage.updateUser(userId, { isActive: true });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User activated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/:userId/deactivate", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const user = await storage.updateUser(userId, { isActive: false });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deactivated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Appointment Management Routes
  app.put("/api/appointments/:appointmentId/status", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'doctor' && req.user!.role !== 'staff') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { appointmentId } = req.params;
      const { status } = req.body;
      
      const appointment = await storage.updateAppointment(appointmentId, { status });
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      res.json({ message: "Appointment status updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/appointments/:appointmentId", authMiddleware, async (req, res) => {
    console.log('🚨🚨🚨 RESCHEDULE ROUTE HIT!!! 🚨🚨🚨');
    console.log('🚨 Method:', req.method, 'Path:', req.path);
    console.log('🚨 Appointment ID:', req.params.appointmentId);
    console.log('🚨 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'doctor' && req.user!.role !== 'staff') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { appointmentId } = req.params;
      const updates = { ...req.body, updatedAt: new Date() };
      
      console.log('🔥 RESCHEDULE DEBUG - Appointment ID:', appointmentId);
      console.log('🔥 RESCHEDULE DEBUG - Updates received:', updates);
      
      // Get the original appointment first to compare dates
      const originalAppointment = await storage.getAppointmentById(appointmentId);
      if (!originalAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      console.log('🔥 RESCHEDULE DEBUG - Original appointment date:', originalAppointment.appointmentDate);
      
      const appointment = await storage.updateAppointment(appointmentId, updates);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      console.log('🔥 RESCHEDULE DEBUG - Updated appointment date:', appointment.appointmentDate);

      // Check if appointment date was changed (rescheduled)
      const wasRescheduled = updates.appointmentDate && 
        new Date(updates.appointmentDate).getTime() !== new Date(originalAppointment.appointmentDate).getTime();

      console.log('🔥 RESCHEDULE DEBUG - Was rescheduled?', wasRescheduled);
      console.log('🔥 RESCHEDULE DEBUG - Original date time:', new Date(originalAppointment.appointmentDate).getTime());
      console.log('🔥 RESCHEDULE DEBUG - New date time:', updates.appointmentDate ? new Date(updates.appointmentDate).getTime() : 'undefined');

      if (wasRescheduled) {
        try {
          console.log('🔥 RESCHEDULE DEBUG - Starting email notification process');
          
          // Get patient and doctor details for email notification
          const patient = await storage.getUser(appointment.patientId);
          const doctor = await storage.getUser(appointment.doctorId);
          
          console.log('🔥 RESCHEDULE DEBUG - Patient email:', patient?.email);
          console.log('🔥 RESCHEDULE DEBUG - Doctor details:', doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Not found');
          
          if (patient && doctor && patient.email) {
            console.log('🔥 RESCHEDULE NOTIFICATION - Sending email to:', patient.email);
            
            const originalDate = new Date(originalAppointment.appointmentDate);
            const newDate = new Date(appointment.appointmentDate);
            
            await emailService.sendAppointmentRescheduled(patient.email, {
              doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
              originalDate: originalDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
              originalTime: originalDate.toLocaleTimeString('en-IN', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true, 
                timeZone: 'Asia/Kolkata' 
              }),
              newDate: newDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
              newTime: newDate.toLocaleTimeString('en-IN', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true, 
                timeZone: 'Asia/Kolkata' 
              }),
              clinic: 'SmartClinic'
            });
            
            console.log('🔥 RESCHEDULE NOTIFICATION - Email sent successfully');
          } else {
            console.log('🔥 RESCHEDULE DEBUG - Email not sent. Patient:', !!patient, 'Doctor:', !!doctor, 'Patient email:', patient?.email);
          }
        } catch (emailError) {
          console.error('🔥 RESCHEDULE EMAIL ERROR:', emailError);
          // Don't fail the request if email fails
        }
      } else {
        console.log('🔥 RESCHEDULE DEBUG - No email sent because appointment was not rescheduled');
      }

      res.json(appointment);
    } catch (error: any) {
      console.error('🔥 RESCHEDULE ROUTE ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Medicine/Inventory Management Routes
  app.post("/api/medicines", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        return res.status(403).json({ message: "Admin or staff access required" });
      }

      const medicine = await storage.createMedicine(req.body);
      res.json(medicine);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/medicines/:medicineId", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        return res.status(403).json({ message: "Admin or staff access required" });
      }

      const { medicineId } = req.params;
      const medicine = await storage.updateMedicine(medicineId, req.body);
      res.json(medicine);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Patient Records Management
  app.put("/api/patients/:patientId", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'doctor') {
        return res.status(403).json({ message: "Admin or doctor access required" });
      }

      const { patientId } = req.params;
      const patient = await storage.updateUser(patientId, req.body);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      res.json({ message: "Patient updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Reports Generation
  app.get("/api/reports/daily", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get admin's clinic ID
      const adminClinicId = req.user!.clinicId;
      console.log('🔥 DAILY REPORTS - Admin clinic ID:', adminClinicId);
      
      if (!adminClinicId) {
        return res.status(400).json({ message: "Admin user has no associated clinic" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointments = await storage.getAppointmentsByDateRange(today, tomorrow, adminClinicId);
      console.log('🔥 DAILY REPORTS - Found appointments for clinic:', appointments.length);
      const completedAppointments = appointments.filter(apt => apt.status === 'completed');
      const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled');
      
      const report = {
        date: today.toISOString().split('T')[0],
        totalAppointments: appointments.length,
        completedAppointments: completedAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        revenue: completedAppointments.length * 150,
        appointments: appointments
      };

      res.json(report);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/queue/admin", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        return res.status(403).json({ message: "Admin or staff access required" });
      }

      const queueTokens = await storage.getAllQueueTokens();
      res.json(queueTokens);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });



  app.get("/api/patients", authMiddleware, async (req, res) => {
    try {
      console.log('🔥 PATIENTS ENDPOINT - User:', req.user);
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff') {
        return res.status(403).json({ message: "Admin or staff access required" });
      }

      // For admin users, filter by clinic ID
      if (req.user!.role === 'admin' && req.user!.clinicId) {
        const patients = await storage.getPatientsByClinic(req.user!.clinicId);
        console.log('🔥 PATIENTS ENDPOINT - Admin found patients for clinic:', patients.length);
        res.json(patients);
      } else {
        const patients = await storage.getAllPatients();
        console.log('🔥 PATIENTS ENDPOINT - Found patients:', patients.length);
        res.json(patients);
      }
    } catch (error: any) {
      console.error('🔥 PATIENTS ENDPOINT - Error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/queue/:tokenId/status", authMiddleware, async (req, res) => {
    try {
      console.log('🔥 QUEUE STATUS UPDATE - User role:', req.user?.role, 'User ID:', req.user?.id)
      
      if (req.user!.role !== 'admin' && req.user!.role !== 'staff' && req.user!.role !== 'doctor') {
        console.log('🔥 Permission denied - Required: admin/staff/doctor, Got:', req.user!.role)
        return res.status(403).json({ message: "Admin, staff, or doctor access required" });
      }

      const { tokenId } = req.params;
      const { status } = z.object({ status: z.string() }).parse(req.body);
      
      console.log('🔥 Updating token:', tokenId, 'to status:', status)
      const result = await storage.updateQueueTokenStatus(tokenId, status);
      console.log('🔥 Update result:', result)
      res.json(result);
    } catch (error: any) {
      console.log('🔥 Queue update error:', error.message)
      res.status(400).json({ message: error.message });
    }
  });



  app.put("/api/users/:userId/approve", authMiddleware, async (req, res) => {
    try {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.params;
      const { isApproved } = z.object({ isApproved: z.boolean() }).parse(req.body);
      
      const result = await storage.updateUserApproval(userId, isApproved);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Staff presence routes
  app.post("/api/staff-presence/checkin", authMiddleware, requireRole(['staff', 'doctor', 'admin']), async (req, res) => {
    try {
      const staffId = req.user!.id;
      const today = new Date();
      
      const presence = await storage.createOrUpdateStaffPresence(staffId, today);
      res.json(presence);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/staff-presence/today", authMiddleware, requireRole(['admin', 'staff']), async (req, res) => {
    try {
      const staffPresence = await storage.getTodayStaffPresence();
      res.json(staffPresence);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/staff-presence/:id", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { isPresent, markedByAdmin } = req.body;
      
      const presence = await storage.updateStaffPresence(id, {
        isPresent,
        markedByAdmin: markedByAdmin !== undefined ? markedByAdmin : true,
        updatedAt: new Date()
      });
      
      if (!presence) {
        return res.status(404).json({ message: "Staff presence record not found" });
      }
      
      res.json(presence);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update staff presence by userId - creates record if it doesn't exist
  app.put("/api/staff-presence/update/:userId", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { isPresent, markedByAdmin } = req.body;
      const user = req.user as any;
      
      console.log('🔥 STAFF PRESENCE UPDATE - UserId:', userId, 'IsPresent:', isPresent);
      
      // Try to get existing presence record for today
      const existingPresence = await storage.getTodayStaffPresence();
      const userPresence = existingPresence.find(p => p.staffId === userId);
      
      let presence;
      if (userPresence) {
        // Update existing record
        console.log('🔥 STAFF PRESENCE UPDATE - Updating existing record:', userPresence.id);
        presence = await storage.updateStaffPresence(userPresence.id, {
          isPresent,
          markedByAdmin: markedByAdmin !== undefined ? markedByAdmin : true
        });
      } else {
        // Create new record using createOrUpdateStaffPresence
        console.log('🔥 STAFF PRESENCE UPDATE - Creating new record for userId:', userId);
        if (isPresent) {
          presence = await storage.createOrUpdateStaffPresence(userId, new Date(), user.clinicId);
          // Update the markedByAdmin flag if needed
          if (markedByAdmin !== undefined) {
            presence = await storage.updateStaffPresence(presence.id, { markedByAdmin });
          }
        } else {
          // Create absent record manually
          presence = await storage.createStaffPresence({
            staffId: userId,
            clinicId: user.clinicId,
            date: new Date(),
            isPresent: false,
            markedByAdmin: markedByAdmin !== undefined ? markedByAdmin : true
          });
        }
      }
      
      console.log('🔥 STAFF PRESENCE UPDATE - Result:', presence);
      res.json(presence);
    } catch (error: any) {
      console.error('🔥 STAFF PRESENCE UPDATE - Error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/staff-presence/:date", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { date } = req.params;
      const targetDate = new Date(date);
      
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const staffPresence = await storage.getStaffPresenceForDate(targetDate);
      res.json(staffPresence);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Clinic management routes
  app.post("/api/clinics", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const clinicData = insertClinicSchema.parse(req.body);
      const clinic = await storage.createClinic(clinicData);
      res.json(clinic);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Public clinic registration endpoint for homepage
  app.post("/api/clinics/register", async (req, res) => {
    try {
      const { clinicData, adminData } = req.body;
      
      // Validate clinic data
      const validatedClinicData = insertClinicSchema.parse(clinicData);
      
      // Validate admin data
      const validatedAdminData = insertUserSchema.parse({
        ...adminData,
        role: 'admin',
        isActive: true,
        isApproved: true
      });
      
      // Create clinic first
      const clinic = await storage.createClinic(validatedClinicData);
      
      // Create admin user for the clinic
      const adminUser = await storage.createUser({
        ...validatedAdminData,
        clinicId: clinic.id
      });
      
      // Send email notification to soham.banerjee@iiitb.ac.in
      try {
        console.log('🔥 CLINIC REGISTRATION - Sending email notification...');
        const emailResult = await emailService.sendClinicRegistrationNotification(
          validatedClinicData,
          validatedAdminData
        );
        
        if (emailResult.success) {
          console.log('🔥 CLINIC REGISTRATION - Email notification sent successfully');
        } else {
          console.error('🔥 CLINIC REGISTRATION - Email notification failed:', emailResult.error);
        }
      } catch (emailError) {
        console.error('🔥 CLINIC REGISTRATION - Email notification error:', emailError);
        // Don't fail the registration if email fails
      }
      
      res.json({ 
        clinic, 
        message: 'Clinic registration submitted successfully! We will review your application and notify you within 48 hours.',
        isNewClinic: true
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/clinics", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const clinics = await storage.getAllClinics();
      res.json(clinics);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/clinics/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const clinic = await storage.getClinicById(id);
      
      if (!clinic) {
        return res.status(404).json({ message: "Clinic not found" });
      }

      res.json(clinic);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/clinics/:id", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const clinicData = insertClinicSchema.partial().parse(req.body);
      
      const updatedClinic = await storage.updateClinic(id, clinicData);
      if (!updatedClinic) {
        return res.status(404).json({ message: "Clinic not found" });
      }

      res.json(updatedClinic);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/clinics/:id", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if clinic has any associated data
      const hasUsers = await storage.getClinicUserCount(id);
      if (hasUsers > 0) {
        return res.status(400).json({ 
          message: "Cannot delete clinic with associated users. Please transfer or remove users first." 
        });
      }

      const deleted = await storage.deleteClinic(id);
      if (!deleted) {
        return res.status(404).json({ message: "Clinic not found" });
      }

      res.json({ message: "Clinic deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Clinic-specific endpoints for individual clinic admin dashboards

  // Get clinic-specific appointments
  app.get("/api/appointments/clinic/:clinicId", authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      const appointments = await storage.getAppointmentsByClinic(clinicId);
      res.json(appointments);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/users/clinic/:clinicId', authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      const users = await storage.getUsersByClinic(clinicId);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch clinic users' });
    }
  });

  app.get('/api/patients/clinic/:clinicId', authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      const patients = await storage.getPatientsByClinic(clinicId);
      res.json(patients);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch clinic patients' });
    }
  });

  app.get('/api/queue/clinic/:clinicId', authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      const queue = await storage.getQueueTokensByClinic(clinicId);
      res.json(queue);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch clinic queue' });
    }
  });

  app.get('/api/clinic/dashboard-stats/:clinicId', authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's appointments for this clinic
      const todayAppointments = await storage.getAppointmentsByDateRange(today, tomorrow, clinicId);
      const completedAppointments = todayAppointments.filter(apt => apt.status === 'completed');
      const activeStaff = await storage.getActiveStaffCountByClinic(clinicId);

      const stats = {
        patientsToday: todayAppointments.length,
        completedAppointments: completedAppointments.length,
        revenue: completedAppointments.length * 150, // Assume $150 per appointment
        activeStaff: activeStaff
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch clinic dashboard stats' });
    }
  });

  // Get clinic-specific staff/users
  app.get("/api/users/clinic/:clinicId", authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      const users = await storage.getUsersByClinic(clinicId);
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get clinic-specific patients
  app.get("/api/patients/clinic/:clinicId", authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      const patients = await storage.getPatientsByClinic(clinicId);
      res.json(patients);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get clinic-specific queue
  app.get("/api/queue/clinic/:clinicId", authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      const queue = await storage.getQueueTokensByClinic(clinicId);
      res.json(queue);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get clinic-specific dashboard stats
  app.get("/api/clinic/dashboard-stats/:clinicId", authMiddleware, async (req, res) => {
    try {
      const { clinicId } = req.params;
      
      // Calculate today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log(`🔥 CLINIC DASHBOARD STATS - Date range for ${clinicId}:`, {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
        todayLocal: today.toLocaleDateString(),
        tomorrowLocal: tomorrow.toLocaleDateString()
      });

      // Get appointments for today at this clinic
      const todayAppointments = await storage.getAppointmentsByDateRange(today, tomorrow, clinicId);
      console.log(`🔥 CLINIC DASHBOARD STATS - Found appointments for clinic ${clinicId}:`, todayAppointments.length);

      const completedAppointments = todayAppointments.filter(apt => apt.status === 'completed');
      console.log(`🔥 CLINIC DASHBOARD STATS - Completed appointments for clinic ${clinicId}:`, completedAppointments.length);

      // Calculate revenue (assuming $150 per completed appointment)
      const revenue = completedAppointments.length * 150;

      // Get active staff count for this clinic
      const activeStaff = await storage.getActiveStaffCountByClinic(clinicId);

      const stats = {
        patientsToday: todayAppointments.length,
        completedAppointments: completedAppointments.length,
        revenue,
        activeStaff: activeStaff.toString()
      };

      console.log(`🔥 CLINIC DASHBOARD STATS - Final stats for clinic ${clinicId}:`, stats);
      res.json(stats);
    } catch (error: any) {
      console.error(`🔥 CLINIC DASHBOARD STATS - Error for clinic ${req.params.clinicId}:`, error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get clinic statistics
  app.get("/api/clinics/:id/stats", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const stats = await storage.getClinicStats(id);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Start background services
  schedulerService.start();

  return httpServer;
}
