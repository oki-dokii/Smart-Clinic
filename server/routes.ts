import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertAppointmentSchema, insertQueueTokenSchema, 
  insertMedicineSchema, insertPrescriptionSchema, insertMedicineReminderSchema,
  insertDelayNotificationSchema, insertHomeVisitSchema, insertMedicalHistorySchema,
  insertStaffVerificationSchema
} from "@shared/schema";
import { z } from "zod";
import { authMiddleware, requireRole } from "./middleware/auth";
import { gpsVerificationMiddleware } from "./middleware/gps";
import { authService } from "./services/auth";
import { smsService } from "./services/sms";
import { queueService } from "./services/queue";
import { schedulerService } from "./services/scheduler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phoneNumber } = z.object({ phoneNumber: z.string() }).parse(req.body);
      
      await authService.sendOtp(phoneNumber);
      res.json({ message: "OTP sent successfully" });
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
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
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
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.user!.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users", authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { role } = req.query;
      const users = role ? await storage.getUsersByRole(role as string) : [];
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/:id/approve", authMiddleware, requireRole(['admin']), async (req, res) => {
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

  app.put("/api/users/:id/deactivate", authMiddleware, requireRole(['admin']), async (req, res) => {
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

  // Appointment routes
  app.post("/api/appointments", authMiddleware, async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      
      // Ensure patient can only book for themselves
      if (req.user!.role === 'patient' && appointmentData.patientId !== req.user!.id) {
        return res.status(403).json({ message: "Patients can only book appointments for themselves" });
      }

      const appointment = await storage.createAppointment(appointmentData);
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
    try {
      const { id } = req.params;
      const appointmentData = insertAppointmentSchema.partial().parse(req.body);
      
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

      const appointment = await storage.updateAppointment(id, appointmentData);
      res.json(appointment);
    } catch (error: any) {
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

      const tokenNumber = await storage.getNextTokenNumber(doctorId);
      const queueToken = await storage.createQueueToken({
        tokenNumber,
        patientId: req.user!.id,
        doctorId,
        appointmentId,
        priority
      });

      res.json(queueToken);
    } catch (error: any) {
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

  app.get("/api/queue/position", authMiddleware, requireRole(['patient']), async (req, res) => {
    try {
      const { doctorId } = req.query;
      const position = await storage.getPatientQueuePosition(req.user!.id, doctorId as string);
      res.json(position);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/queue/:id/status", authMiddleware, requireRole(['doctor', 'staff']), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = z.object({ status: z.string() }).parse(req.body);
      
      const token = await storage.updateQueueTokenStatus(id, status, new Date());
      if (!token) {
        return res.status(404).json({ message: "Queue token not found" });
      }

      // Broadcast queue update via Server-Sent Events
      queueService.broadcastQueueUpdate(token.doctorId);

      res.json(token);
    } catch (error: any) {
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
      const medicines = search 
        ? await storage.searchMedicines(search as string)
        : await storage.getAllMedicines();
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

  app.get("/api/prescriptions/active", authMiddleware, requireRole(['patient']), async (req, res) => {
    try {
      const prescriptions = await storage.getActivePrescriptions(req.user!.id);
      res.json(prescriptions);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Medicine reminder routes
  app.get("/api/reminders", authMiddleware, requireRole(['patient']), async (req, res) => {
    try {
      const { date } = req.query;
      const reminderDate = date ? new Date(date as string) : new Date();
      const reminders = await storage.getPatientReminders(req.user!.id, reminderDate);
      res.json(reminders);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/reminders/:id/taken", authMiddleware, requireRole(['patient']), async (req, res) => {
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

  app.put("/api/reminders/:id/skipped", authMiddleware, requireRole(['patient']), async (req, res) => {
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
  app.post("/api/delays", authMiddleware, requireRole(['doctor', 'staff']), async (req, res) => {
    try {
      const delayData = insertDelayNotificationSchema.parse(req.body);
      delayData.doctorId = req.user!.role === 'doctor' ? req.user!.id : delayData.doctorId;
      
      const notification = await storage.createDelayNotification(delayData);
      
      // Send SMS notifications to affected patients
      await smsService.sendDelayNotifications(notification.doctorId, notification.delayMinutes, notification.reason);
      
      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/delays", authMiddleware, async (req, res) => {
    try {
      const { doctorId } = req.query;
      const targetDoctorId = req.user!.role === 'doctor' ? req.user!.id : doctorId as string;
      
      const notifications = await storage.getActiveDelayNotifications(targetDoctorId);
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

  // Start background services
  schedulerService.start();

  const httpServer = createServer(app);
  return httpServer;
}
