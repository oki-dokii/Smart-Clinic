import { 
  users, otpSessions, authSessions, staffVerifications, appointments, 
  queueTokens, medicines, prescriptions, medicineReminders, delayNotifications,
  homeVisits, medicalHistory,
  type User, type InsertUser, type OtpSession, type InsertOtpSession,
  type AuthSession, type InsertAuthSession, type StaffVerification, type InsertStaffVerification,
  type Appointment, type InsertAppointment, type QueueToken, type InsertQueueToken,
  type Medicine, type InsertMedicine, type Prescription, type InsertPrescription,
  type MedicineReminder, type InsertMedicineReminder, type DelayNotification, type InsertDelayNotification,
  type HomeVisit, type InsertHomeVisit, type MedicalHistory, type InsertMedicalHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  approveUser(id: string): Promise<User | undefined>;
  deactivateUser(id: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getPatients(): Promise<User[]>;
  getActiveStaffCount(): Promise<number>;
  updateUserApproval(id: string, isApproved: boolean): Promise<User | undefined>;
  
  // OTP Sessions
  createOtpSession(session: InsertOtpSession): Promise<OtpSession>;
  getOtpSession(phoneNumber: string): Promise<OtpSession | undefined>;
  invalidateOtpSession(phoneNumber: string): Promise<void>;
  incrementOtpAttempts(phoneNumber: string): Promise<void>;
  
  // Auth Sessions
  createAuthSession(session: InsertAuthSession): Promise<AuthSession>;
  getAuthSession(token: string): Promise<AuthSession | undefined>;
  getAuthSessionWithUser(token: string): Promise<(AuthSession & { user: User }) | undefined>;
  updateLastActivity(token: string): Promise<void>;
  invalidateAuthSession(token: string): Promise<void>;
  invalidateUserSessions(userId: string): Promise<void>;
  
  // Staff Verifications
  createStaffVerification(verification: InsertStaffVerification): Promise<StaffVerification>;
  getActiveStaffVerification(staffId: string): Promise<StaffVerification | undefined>;
  checkOutStaff(staffId: string): Promise<void>;
  getStaffVerifications(staffId: string, date?: Date): Promise<StaffVerification[]>;
  
  // Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentWithDetails(id: string): Promise<(Appointment & { patient: User; doctor: User }) | undefined>;
  getUserAppointments(userId: string, role: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getAppointmentsByDate(date: Date, doctorId?: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  cancelAppointment(id: string): Promise<Appointment | undefined>;
  getAppointments(userId?: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<(Appointment & { patient: User; doctor: User })[]>;
  
  // Queue Management
  createQueueToken(token: InsertQueueToken): Promise<QueueToken>;
  getQueueToken(id: string): Promise<QueueToken | undefined>;
  getQueueTokenWithDetails(id: string): Promise<(QueueToken & { patient: User; doctor: User }) | undefined>;
  getDoctorQueue(doctorId: string): Promise<(QueueToken & { patient: User })[]>;
  getCurrentServingToken(doctorId: string): Promise<(QueueToken & { patient: User }) | undefined>;
  getNextTokenNumber(doctorId: string): Promise<number>;
  updateQueueTokenStatus(id: string, status: string, timestamp?: Date): Promise<QueueToken | undefined>;
  getPatientQueuePosition(patientId: string, doctorId: string): Promise<QueueToken | undefined>;
  getQueueTokens(): Promise<(QueueToken & { patient: User; doctor: User })[]>;
  
  // Medicines
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  getMedicine(id: string): Promise<Medicine | undefined>;
  getMedicineByName(name: string): Promise<Medicine | undefined>;
  getAllMedicines(): Promise<Medicine[]>;
  searchMedicines(query: string): Promise<Medicine[]>;
  
  // Prescriptions
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPrescription(id: string): Promise<Prescription | undefined>;
  getPrescriptionWithDetails(id: string): Promise<(Prescription & { medicine: Medicine; patient: User; doctor: User }) | undefined>;
  getPatientPrescriptions(patientId: string): Promise<(Prescription & { medicine: Medicine; doctor: User })[]>;
  
  // Admin-specific methods
  getAllQueueTokens(): Promise<(QueueToken & { patient: User; doctor: User })[]>;
  getAllAppointments(): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getAllPatients(): Promise<User[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getActiveStaffCount(): Promise<number>;
  updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined>;
  updateUserApproval(id: string, isApproved: boolean): Promise<User | undefined>;
  getActivePrescriptions(patientId: string): Promise<(Prescription & { medicine: Medicine })[]>;
  updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined>;
  
  // Medicine Reminders
  createMedicineReminder(reminder: InsertMedicineReminder): Promise<MedicineReminder>;
  getMedicineReminder(id: string): Promise<MedicineReminder | undefined>;
  getPatientReminders(patientId: string, date?: Date): Promise<(MedicineReminder & { prescription: Prescription & { medicine: Medicine } })[]>;
  getDueReminders(): Promise<(MedicineReminder & { prescription: Prescription & { medicine: Medicine; patient: User } })[]>;
  markReminderTaken(id: string): Promise<MedicineReminder | undefined>;
  markReminderSkipped(id: string): Promise<MedicineReminder | undefined>;
  updateReminderStatus(id: string, status: 'taken' | 'skipped'): Promise<MedicineReminder | undefined>;
  resetReminderStatus(id: string): Promise<MedicineReminder | undefined>;
  
  // Delay Notifications
  createDelayNotification(notification: InsertDelayNotification): Promise<DelayNotification>;
  getActiveDelayNotifications(doctorId: string): Promise<DelayNotification[]>;
  resolveDelayNotification(id: string): Promise<DelayNotification | undefined>;
  
  // Home Visits
  createHomeVisit(visit: InsertHomeVisit): Promise<HomeVisit>;
  getHomeVisit(id: string): Promise<HomeVisit | undefined>;
  getHomeVisitWithDetails(id: string): Promise<(HomeVisit & { appointment: Appointment; patient: User; doctor: User }) | undefined>;
  getDoctorHomeVisits(doctorId: string, date?: Date): Promise<(HomeVisit & { appointment: Appointment; patient: User })[]>;
  updateHomeVisit(id: string, visit: Partial<InsertHomeVisit>): Promise<HomeVisit | undefined>;
  
  // Medical History
  createMedicalHistory(history: InsertMedicalHistory): Promise<MedicalHistory>;
  getPatientMedicalHistory(patientId: string): Promise<(MedicalHistory & { doctor: User })[]>;
  getMedicalHistoryByAppointment(appointmentId: string): Promise<MedicalHistory | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async approveUser(id: string): Promise<User | undefined> {
    const [approvedUser] = await db.update(users)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return approvedUser || undefined;
  }

  async deactivateUser(id: string): Promise<User | undefined> {
    const [deactivatedUser] = await db.update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return deactivatedUser || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getPatients(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'patient'));
  }

  async getActiveStaffCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(
        sql`role IN ('doctor', 'staff')`,
        eq(users.isActive, true)
      ));
    return result[0]?.count || 0;
  }

  async updateUserApproval(id: string, isApproved: boolean): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ isApproved, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  // OTP Sessions
  async createOtpSession(session: InsertOtpSession): Promise<OtpSession> {
    const [newSession] = await db.insert(otpSessions).values(session).returning();
    return newSession;
  }

  async getOtpSession(phoneNumber: string): Promise<OtpSession | undefined> {
    const [session] = await db.select().from(otpSessions)
      .where(and(
        eq(otpSessions.phoneNumber, phoneNumber),
        eq(otpSessions.isUsed, false),
        gte(otpSessions.expiresAt, new Date())
      ))
      .orderBy(desc(otpSessions.createdAt));
    return session || undefined;
  }

  async invalidateOtpSession(phoneNumber: string): Promise<void> {
    await db.update(otpSessions)
      .set({ isUsed: true })
      .where(eq(otpSessions.phoneNumber, phoneNumber));
  }

  async incrementOtpAttempts(phoneNumber: string): Promise<void> {
    await db.update(otpSessions)
      .set({ attempts: sql`${otpSessions.attempts} + 1` })
      .where(eq(otpSessions.phoneNumber, phoneNumber));
  }

  // Auth Sessions
  async createAuthSession(session: InsertAuthSession): Promise<AuthSession> {
    const [newSession] = await db.insert(authSessions).values(session).returning();
    return newSession;
  }

  async getAuthSession(token: string): Promise<AuthSession | undefined> {
    const [session] = await db.select().from(authSessions)
      .where(and(
        eq(authSessions.token, token),
        gte(authSessions.expiresAt, new Date())
      ));
    return session || undefined;
  }

  async getAuthSessionWithUser(token: string): Promise<(AuthSession & { user: User }) | undefined> {
    const [result] = await db.select({
      id: authSessions.id,
      userId: authSessions.userId,
      token: authSessions.token,
      expiresAt: authSessions.expiresAt,
      lastActivity: authSessions.lastActivity,
      ipAddress: authSessions.ipAddress,
      userAgent: authSessions.userAgent,
      createdAt: authSessions.createdAt,
      user: users
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(
      eq(authSessions.token, token),
      gte(authSessions.expiresAt, new Date())
    ));
    return result || undefined;
  }

  async updateLastActivity(token: string): Promise<void> {
    await db.update(authSessions)
      .set({ lastActivity: new Date() })
      .where(eq(authSessions.token, token));
  }

  async invalidateAuthSession(token: string): Promise<void> {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
  }

  // Staff Verifications
  async createStaffVerification(verification: InsertStaffVerification): Promise<StaffVerification> {
    const [newVerification] = await db.insert(staffVerifications).values(verification).returning();
    return newVerification;
  }

  async getActiveStaffVerification(staffId: string): Promise<StaffVerification | undefined> {
    const [verification] = await db.select().from(staffVerifications)
      .where(and(
        eq(staffVerifications.staffId, staffId),
        sql`${staffVerifications.checkedOutAt} IS NULL`
      ))
      .orderBy(desc(staffVerifications.checkedInAt));
    return verification || undefined;
  }

  async checkOutStaff(staffId: string): Promise<void> {
    await db.update(staffVerifications)
      .set({ checkedOutAt: new Date() })
      .where(and(
        eq(staffVerifications.staffId, staffId),
        sql`${staffVerifications.checkedOutAt} IS NULL`
      ));
  }

  async getStaffVerifications(staffId: string, date?: Date): Promise<StaffVerification[]> {
    let whereConditions = [eq(staffVerifications.staffId, staffId)];
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereConditions.push(
        gte(staffVerifications.checkedInAt, startOfDay),
        lte(staffVerifications.checkedInAt, endOfDay)
      );
    }
    
    return await db.select().from(staffVerifications)
      .where(and(...whereConditions))
      .orderBy(desc(staffVerifications.checkedInAt));
  }

  // Appointments
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentWithDetails(id: string): Promise<(Appointment & { patient: User; doctor: User }) | undefined> {
    const result = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
      with: {
        patient: true,
        doctor: true,
      },
    });
    
    return result || undefined;
  }

  async getUserAppointments(userId: string, role: string): Promise<(Appointment & { patient: User; doctor: User })[]> {
    const userField = role === 'patient' ? appointments.patientId : appointments.doctorId;
    
    return await db.query.appointments.findMany({
      where: eq(userField, userId),
      with: {
        patient: true,
        doctor: true,
      },
      orderBy: asc(appointments.appointmentDate),
    });
  }

  async getAppointmentsByDate(date: Date, doctorId?: string): Promise<(Appointment & { patient: User; doctor: User })[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    let whereConditions = [
      gte(appointments.appointmentDate, startOfDay),
      lte(appointments.appointmentDate, endOfDay)
    ];
    
    if (doctorId) {
      whereConditions.push(eq(appointments.doctorId, doctorId));
    }
    
    return await db.query.appointments.findMany({
      where: and(...whereConditions),
      with: {
        patient: true,
        doctor: true,
      },
      orderBy: asc(appointments.appointmentDate),
    });
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db.update(appointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment || undefined;
  }

  async cancelAppointment(id: string): Promise<Appointment | undefined> {
    const [cancelledAppointment] = await db.update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return cancelledAppointment || undefined;
  }

  async getAppointments(userId?: string): Promise<(Appointment & { patient: User; doctor: User })[]> {
    return await db.query.appointments.findMany({
      with: {
        patient: true,
        doctor: true,
      },
      orderBy: asc(appointments.appointmentDate),
    });
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<(Appointment & { patient: User; doctor: User })[]> {
    return await db.query.appointments.findMany({
      where: and(
        gte(appointments.appointmentDate, startDate),
        lte(appointments.appointmentDate, endDate)
      ),
      with: {
        patient: true,
        doctor: true,
      },
      orderBy: asc(appointments.appointmentDate),
    });
  }

  // Queue Management
  async createQueueToken(token: InsertQueueToken): Promise<QueueToken> {
    const [newToken] = await db.insert(queueTokens).values(token).returning();
    return newToken;
  }

  async getQueueToken(id: string): Promise<QueueToken | undefined> {
    const [token] = await db.select().from(queueTokens).where(eq(queueTokens.id, id));
    return token || undefined;
  }

  async getQueueTokenWithDetails(id: string): Promise<(QueueToken & { patient: User; doctor: User }) | undefined> {
    const result = await db.query.queueTokens.findFirst({
      where: eq(queueTokens.id, id),
      with: {
        patient: true,
        doctor: true,
      },
    });
    
    return result || undefined;
  }

  async getDoctorQueue(doctorId: string): Promise<(QueueToken & { patient: User })[]> {
    return await db.query.queueTokens.findMany({
      where: eq(queueTokens.doctorId, doctorId),
      with: {
        patient: true,
      },
      orderBy: asc(queueTokens.tokenNumber),
    });
  }

  async getCurrentServingToken(doctorId: string): Promise<(QueueToken & { patient: User }) | undefined> {
    const result = await db.query.queueTokens.findFirst({
      where: and(
        eq(queueTokens.doctorId, doctorId),
        eq(queueTokens.status, 'in_progress')
      ),
      with: {
        patient: true,
      },
    });
    
    return result || undefined;
  }

  async getNextTokenNumber(doctorId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [result] = await db.select({
      maxToken: sql<number>`COALESCE(MAX(${queueTokens.tokenNumber}), 0)`
    })
    .from(queueTokens)
    .where(and(
      eq(queueTokens.doctorId, doctorId),
      gte(queueTokens.createdAt, today),
      lte(queueTokens.createdAt, tomorrow)
    ));
    
    return (result?.maxToken || 0) + 1;
  }

  async updateQueueTokenStatus(id: string, status: string, timestamp?: Date): Promise<QueueToken | undefined> {
    const updateData: any = { status };
    
    if (status === 'called' && timestamp) {
      updateData.calledAt = timestamp;
    } else if (status === 'completed' && timestamp) {
      updateData.completedAt = timestamp;
    }
    
    const [updatedToken] = await db.update(queueTokens)
      .set(updateData)
      .where(eq(queueTokens.id, id))
      .returning();
    
    return updatedToken || undefined;
  }

  async getPatientQueuePosition(patientId: string, doctorId?: string): Promise<QueueToken | undefined> {
    let whereClause = and(
      eq(queueTokens.patientId, patientId),
      sql`${queueTokens.status} IN ('waiting', 'called')`
    );
    
    if (doctorId) {
      whereClause = and(whereClause, eq(queueTokens.doctorId, doctorId));
    }
    
    const [token] = await db.select().from(queueTokens)
      .where(whereClause)
      .orderBy(desc(queueTokens.createdAt));
    
    return token || undefined;
  }

  async getQueueTokens(): Promise<(QueueToken & { patient: User; doctor: User })[]> {
    return await db.query.queueTokens.findMany({
      with: {
        patient: true,
        doctor: true,
      },
      orderBy: [asc(queueTokens.createdAt)],
    });
  }

  // Medicines
  async createMedicine(medicine: InsertMedicine): Promise<Medicine> {
    const [newMedicine] = await db.insert(medicines).values(medicine).returning();
    return newMedicine;
  }

  async getMedicine(id: string): Promise<Medicine | undefined> {
    const [medicine] = await db.select().from(medicines).where(eq(medicines.id, id));
    return medicine || undefined;
  }

  async getMedicineByName(name: string): Promise<Medicine | undefined> {
    const [medicine] = await db.select().from(medicines).where(eq(medicines.name, name));
    return medicine || undefined;
  }

  async getAllMedicines(): Promise<Medicine[]> {
    return await db.select().from(medicines).orderBy(asc(medicines.name));
  }

  async searchMedicines(query: string): Promise<Medicine[]> {
    return await db.select().from(medicines)
      .where(sql`${medicines.name} ILIKE ${'%' + query + '%'}`)
      .orderBy(asc(medicines.name));
  }

  // Prescriptions
  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const [newPrescription] = await db.insert(prescriptions).values(prescription).returning();
    return newPrescription;
  }

  async getPrescription(id: string): Promise<Prescription | undefined> {
    const [prescription] = await db.select().from(prescriptions).where(eq(prescriptions.id, id));
    return prescription || undefined;
  }

  async getPrescriptionWithDetails(id: string): Promise<(Prescription & { medicine: Medicine; patient: User; doctor: User }) | undefined> {
    const result = await db.query.prescriptions.findFirst({
      where: eq(prescriptions.id, id),
      with: {
        medicine: true,
        patient: true,
        doctor: true,
      },
    });
    
    return result || undefined;
  }

  async getPatientPrescriptions(patientId: string): Promise<(Prescription & { medicine: Medicine; doctor: User })[]> {
    return await db.query.prescriptions.findMany({
      where: eq(prescriptions.patientId, patientId),
      with: {
        medicine: true,
        doctor: true,
      },
      orderBy: desc(prescriptions.createdAt),
    });
  }

  async getActivePrescriptions(patientId: string): Promise<(Prescription & { medicine: Medicine })[]> {
    return await db.query.prescriptions.findMany({
      where: and(
        eq(prescriptions.patientId, patientId),
        eq(prescriptions.status, 'active')
      ),
      with: {
        medicine: true,
      },
      orderBy: desc(prescriptions.createdAt),
    });
  }

  async updatePrescription(id: string, prescription: Partial<InsertPrescription>): Promise<Prescription | undefined> {
    const [updatedPrescription] = await db.update(prescriptions)
      .set({ ...prescription, updatedAt: new Date() })
      .where(eq(prescriptions.id, id))
      .returning();
    return updatedPrescription || undefined;
  }

  // Medicine Reminders
  async createMedicineReminder(reminder: InsertMedicineReminder): Promise<MedicineReminder> {
    const [newReminder] = await db.insert(medicineReminders).values(reminder).returning();
    return newReminder;
  }

  async getMedicineReminder(id: string): Promise<MedicineReminder | undefined> {
    const [reminder] = await db.select().from(medicineReminders).where(eq(medicineReminders.id, id));
    return reminder || undefined;
  }

  async getPatientReminders(patientId: string, date?: Date): Promise<any[]> {
    const baseConditions = [];
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      baseConditions.push(
        gte(medicineReminders.scheduledAt, startOfDay),
        lte(medicineReminders.scheduledAt, endOfDay)
      );
    }
    
    return await db.select({
      id: medicineReminders.id,
      prescriptionId: medicineReminders.prescriptionId,
      scheduledAt: medicineReminders.scheduledAt,
      takenAt: medicineReminders.takenAt,
      skippedAt: medicineReminders.skippedAt,
      isTaken: medicineReminders.isTaken,
      isSkipped: medicineReminders.isSkipped,
      smsReminderSent: medicineReminders.smsReminderSent,
      notes: medicineReminders.notes,
      createdAt: medicineReminders.createdAt,
      prescription: {
        id: prescriptions.id,
        dosage: prescriptions.dosage,
        frequency: prescriptions.frequency,
        instructions: prescriptions.instructions,
        startDate: prescriptions.startDate,
        endDate: prescriptions.endDate,
        status: prescriptions.status,
        medicine: {
          id: medicines.id,
          name: medicines.name,
          description: medicines.description,
          dosageForm: medicines.dosageForm,
          strength: medicines.strength,
          manufacturer: medicines.manufacturer
        }
      }
    })
    .from(medicineReminders)
    .innerJoin(prescriptions, eq(medicineReminders.prescriptionId, prescriptions.id))
    .innerJoin(medicines, eq(prescriptions.medicineId, medicines.id))
    .where(and(
      eq(prescriptions.patientId, patientId),
      ...baseConditions
    ))
    .orderBy(asc(medicineReminders.scheduledAt));
  }

  async getDueReminders(): Promise<any[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return await db.select({
      id: medicineReminders.id,
      prescriptionId: medicineReminders.prescriptionId,
      scheduledAt: medicineReminders.scheduledAt,
      takenAt: medicineReminders.takenAt,
      skippedAt: medicineReminders.skippedAt,
      isTaken: medicineReminders.isTaken,
      isSkipped: medicineReminders.isSkipped,
      smsReminderSent: medicineReminders.smsReminderSent,
      notes: medicineReminders.notes,
      createdAt: medicineReminders.createdAt,
      prescription: {
        id: prescriptions.id,
        dosage: prescriptions.dosage,
        frequency: prescriptions.frequency,
        instructions: prescriptions.instructions,
        medicine: {
          id: medicines.id,
          name: medicines.name,
          description: medicines.description,
          dosageForm: medicines.dosageForm,
          strength: medicines.strength
        },
        patient: {
          id: users.id,
          phoneNumber: users.phoneNumber,
          firstName: users.firstName,
          lastName: users.lastName
        }
      }
    })
    .from(medicineReminders)
    .innerJoin(prescriptions, eq(medicineReminders.prescriptionId, prescriptions.id))
    .innerJoin(medicines, eq(prescriptions.medicineId, medicines.id))
    .innerJoin(users, eq(prescriptions.patientId, users.id))
    .where(and(
      lte(medicineReminders.scheduledAt, now),
      gte(medicineReminders.scheduledAt, fiveMinutesAgo),
      eq(medicineReminders.isTaken, false),
      eq(medicineReminders.isSkipped, false),
      eq(medicineReminders.smsReminderSent, false)
    ));
  }

  async markReminderTaken(id: string): Promise<MedicineReminder | undefined> {
    const [updatedReminder] = await db.update(medicineReminders)
      .set({ isTaken: true, takenAt: new Date() })
      .where(eq(medicineReminders.id, id))
      .returning();
    return updatedReminder || undefined;
  }

  async markReminderSkipped(id: string): Promise<MedicineReminder | undefined> {
    const [updatedReminder] = await db.update(medicineReminders)
      .set({ isSkipped: true, skippedAt: new Date() })
      .where(eq(medicineReminders.id, id))
      .returning();
    return updatedReminder || undefined;
  }

  async updateReminderStatus(id: string, status: 'taken' | 'skipped'): Promise<MedicineReminder | undefined> {
    const updateData: any = {};
    
    if (status === 'taken') {
      updateData.isTaken = true;
      updateData.takenAt = new Date();
      updateData.isSkipped = false;
      updateData.skippedAt = null;
    } else if (status === 'skipped') {
      updateData.isSkipped = true;
      updateData.skippedAt = new Date();
      updateData.isTaken = false;
      updateData.takenAt = null;
    }
    
    const [updatedReminder] = await db.update(medicineReminders)
      .set(updateData)
      .where(eq(medicineReminders.id, id))
      .returning();
    
    return updatedReminder || undefined;
  }

  async resetReminderStatus(id: string): Promise<MedicineReminder | undefined> {
    const [updatedReminder] = await db.update(medicineReminders)
      .set({ 
        isTaken: false, 
        isSkipped: false, 
        takenAt: null, 
        skippedAt: null 
      })
      .where(eq(medicineReminders.id, id))
      .returning();
    
    return updatedReminder || undefined;
  }

  // Delay Notifications
  async createDelayNotification(notification: InsertDelayNotification): Promise<DelayNotification> {
    const [newNotification] = await db.insert(delayNotifications).values(notification).returning();
    return newNotification;
  }

  async getActiveDelayNotifications(doctorId: string): Promise<DelayNotification[]> {
    return await db.select().from(delayNotifications)
      .where(and(
        eq(delayNotifications.doctorId, doctorId),
        eq(delayNotifications.isResolved, false)
      ))
      .orderBy(desc(delayNotifications.createdAt));
  }

  async resolveDelayNotification(id: string): Promise<DelayNotification | undefined> {
    const [resolvedNotification] = await db.update(delayNotifications)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(delayNotifications.id, id))
      .returning();
    return resolvedNotification || undefined;
  }

  // Home Visits
  async createHomeVisit(visit: InsertHomeVisit): Promise<HomeVisit> {
    const [newVisit] = await db.insert(homeVisits).values(visit).returning();
    return newVisit;
  }

  async getHomeVisit(id: string): Promise<HomeVisit | undefined> {
    const [visit] = await db.select().from(homeVisits).where(eq(homeVisits.id, id));
    return visit || undefined;
  }

  async getHomeVisitWithDetails(id: string): Promise<any | undefined> {
    const [result] = await db.select({
      id: homeVisits.id,
      appointmentId: homeVisits.appointmentId,
      doctorId: homeVisits.doctorId,
      patientId: homeVisits.patientId,
      address: homeVisits.address,
      latitude: homeVisits.latitude,
      longitude: homeVisits.longitude,
      travelStartTime: homeVisits.travelStartTime,
      arrivalTime: homeVisits.arrivalTime,
      departureTime: homeVisits.departureTime,
      travelEndTime: homeVisits.travelEndTime,
      distance: homeVisits.distance,
      travelDuration: homeVisits.travelDuration,
      visitNotes: homeVisits.visitNotes,
      createdAt: homeVisits.createdAt,
      appointment: appointments,
      patient: {
        id: sql`patient.id`,
        phoneNumber: sql`patient.phone_number`,
        role: sql`patient.role`,
        firstName: sql`patient.first_name`,
        lastName: sql`patient.last_name`,
        email: sql`patient.email`,
        dateOfBirth: sql`patient.date_of_birth`,
        address: sql`patient.address`,
        emergencyContact: sql`patient.emergency_contact`,
        isActive: sql`patient.is_active`,
        isApproved: sql`patient.is_approved`,
        createdAt: sql`patient.created_at`,
        updatedAt: sql`patient.updated_at`,
      },
      doctor: {
        id: sql`doctor.id`,
        phoneNumber: sql`doctor.phone_number`,
        role: sql`doctor.role`,
        firstName: sql`doctor.first_name`,
        lastName: sql`doctor.last_name`,
        email: sql`doctor.email`,
        dateOfBirth: sql`doctor.date_of_birth`,
        address: sql`doctor.address`,
        emergencyContact: sql`doctor.emergency_contact`,
        isActive: sql`doctor.is_active`,
        isApproved: sql`doctor.is_approved`,
        createdAt: sql`doctor.created_at`,
        updatedAt: sql`doctor.updated_at`,
      }
    })
    .from(homeVisits)
    .innerJoin(appointments, eq(homeVisits.appointmentId, appointments.id))
    .innerJoin(sql`${users} AS patient`, sql`${homeVisits.patientId} = patient.id`)
    .innerJoin(sql`${users} AS doctor`, sql`${homeVisits.doctorId} = doctor.id`)
    .where(eq(homeVisits.id, id));
    
    return result || undefined;
  }

  async getDoctorHomeVisits(doctorId: string, date?: Date): Promise<any[]> {
    let whereConditions = [eq(homeVisits.doctorId, doctorId)];
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereConditions.push(
        gte(appointments.appointmentDate, startOfDay),
        lte(appointments.appointmentDate, endOfDay)
      );
    }
    
    return await db.select({
      id: homeVisits.id,
      appointmentId: homeVisits.appointmentId,
      doctorId: homeVisits.doctorId,
      patientId: homeVisits.patientId,
      address: homeVisits.address,
      latitude: homeVisits.latitude,
      longitude: homeVisits.longitude,
      travelStartTime: homeVisits.travelStartTime,
      arrivalTime: homeVisits.arrivalTime,
      departureTime: homeVisits.departureTime,
      travelEndTime: homeVisits.travelEndTime,
      distance: homeVisits.distance,
      travelDuration: homeVisits.travelDuration,
      visitNotes: homeVisits.visitNotes,
      createdAt: homeVisits.createdAt,
      appointment: {
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        appointmentDate: appointments.appointmentDate,
        duration: appointments.duration,
        type: appointments.type,
        status: appointments.status,
        location: appointments.location,
        notes: appointments.notes,
        symptoms: appointments.symptoms,
        diagnosis: appointments.diagnosis,
        treatmentPlan: appointments.treatmentPlan,
        isDelayed: appointments.isDelayed,
        delayMinutes: appointments.delayMinutes,
        delayReason: appointments.delayReason,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt
      },
      patient: {
        id: users.id,
        phoneNumber: users.phoneNumber,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        dateOfBirth: users.dateOfBirth,
        address: users.address,
        emergencyContact: users.emergencyContact,
        isActive: users.isActive,
        isApproved: users.isApproved,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      }
    })
    .from(homeVisits)
    .innerJoin(appointments, eq(homeVisits.appointmentId, appointments.id))
    .innerJoin(users, eq(homeVisits.patientId, users.id))
    .where(and(...whereConditions))
    .orderBy(asc(appointments.appointmentDate));
  }

  async updateHomeVisit(id: string, visit: Partial<InsertHomeVisit>): Promise<HomeVisit | undefined> {
    const [updatedVisit] = await db.update(homeVisits)
      .set(visit)
      .where(eq(homeVisits.id, id))
      .returning();
    return updatedVisit || undefined;
  }

  // Medical History
  async createMedicalHistory(history: InsertMedicalHistory): Promise<MedicalHistory> {
    const [newHistory] = await db.insert(medicalHistory).values(history).returning();
    return newHistory;
  }

  async getPatientMedicalHistory(patientId: string): Promise<(MedicalHistory & { doctor: User })[]> {
    return await db.select({
      id: medicalHistory.id,
      patientId: medicalHistory.patientId,
      appointmentId: medicalHistory.appointmentId,
      doctorId: medicalHistory.doctorId,
      condition: medicalHistory.condition,
      symptoms: medicalHistory.symptoms,
      diagnosis: medicalHistory.diagnosis,
      treatment: medicalHistory.treatment,
      medications: medicalHistory.medications,
      allergies: medicalHistory.allergies,
      vitalSigns: medicalHistory.vitalSigns,
      labResults: medicalHistory.labResults,
      notes: medicalHistory.notes,
      recordDate: medicalHistory.recordDate,
      createdAt: medicalHistory.createdAt,
      doctor: users
    })
    .from(medicalHistory)
    .innerJoin(users, eq(medicalHistory.doctorId, users.id))
    .where(eq(medicalHistory.patientId, patientId))
    .orderBy(desc(medicalHistory.recordDate));
  }

  async getMedicalHistoryByAppointment(appointmentId: string): Promise<MedicalHistory | undefined> {
    const [history] = await db.select().from(medicalHistory)
      .where(eq(medicalHistory.appointmentId, appointmentId));
    return history || undefined;
  }

  // Admin-specific methods implementation
  async getAllQueueTokens(): Promise<any[]> {
    return await db.select({
      id: queueTokens.id,
      tokenNumber: queueTokens.tokenNumber,
      patientId: queueTokens.patientId,
      doctorId: queueTokens.doctorId,
      appointmentId: queueTokens.appointmentId,
      status: queueTokens.status,
      estimatedWaitTime: queueTokens.estimatedWaitTime,
      calledAt: queueTokens.calledAt,
      completedAt: queueTokens.completedAt,
      priority: queueTokens.priority,
      createdAt: queueTokens.createdAt,
      patient: {
        id: sql`patient.id`,
        firstName: sql`patient.first_name`,
        lastName: sql`patient.last_name`,
        phoneNumber: sql`patient.phone_number`,
        email: sql`patient.email`,
        role: sql`patient.role`,
      },
      doctor: {
        id: sql`doctor.id`,
        firstName: sql`doctor.first_name`,
        lastName: sql`doctor.last_name`,
        phoneNumber: sql`doctor.phone_number`,
        email: sql`doctor.email`,
        role: sql`doctor.role`,
      }
    })
    .from(queueTokens)
    .innerJoin(sql`${users} AS patient`, sql`${queueTokens.patientId} = patient.id`)
    .innerJoin(sql`${users} AS doctor`, sql`${queueTokens.doctorId} = doctor.id`)
    .orderBy(desc(queueTokens.createdAt));
  }

  async getAllAppointments(): Promise<any[]> {
    return await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      appointmentDate: appointments.appointmentDate,
      duration: appointments.duration,
      type: appointments.type,
      status: appointments.status,
      location: appointments.location,
      notes: appointments.notes,
      symptoms: appointments.symptoms,
      diagnosis: appointments.diagnosis,
      treatmentPlan: appointments.treatmentPlan,
      isDelayed: appointments.isDelayed,
      delayMinutes: appointments.delayMinutes,
      delayReason: appointments.delayReason,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      patient: {
        id: sql`patient.id`,
        firstName: sql`patient.first_name`,
        lastName: sql`patient.last_name`,
        phoneNumber: sql`patient.phone_number`,
        email: sql`patient.email`,
        role: sql`patient.role`,
      },
      doctor: {
        id: sql`doctor.id`,
        firstName: sql`doctor.first_name`,
        lastName: sql`doctor.last_name`,
        phoneNumber: sql`doctor.phone_number`,
        email: sql`doctor.email`,
        role: sql`doctor.role`,
      }
    })
    .from(appointments)
    .innerJoin(sql`${users} AS patient`, sql`${appointments.patientId} = patient.id`)
    .innerJoin(sql`${users} AS doctor`, sql`${appointments.doctorId} = doctor.id`)
    .orderBy(desc(appointments.appointmentDate));
  }

  async getAllPatients(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'patient')).orderBy(asc(users.firstName));
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    return await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      appointmentDate: appointments.appointmentDate,
      duration: appointments.duration,
      type: appointments.type,
      status: appointments.status,
      location: appointments.location,
      notes: appointments.notes,
      symptoms: appointments.symptoms,
      diagnosis: appointments.diagnosis,
      treatmentPlan: appointments.treatmentPlan,
      isDelayed: appointments.isDelayed,
      delayMinutes: appointments.delayMinutes,
      delayReason: appointments.delayReason,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      patient: {
        id: sql`patient.id`,
        firstName: sql`patient.first_name`,
        lastName: sql`patient.last_name`,
        phoneNumber: sql`patient.phone_number`,
        email: sql`patient.email`,
        role: sql`patient.role`,
      },
      doctor: {
        id: sql`doctor.id`,
        firstName: sql`doctor.first_name`,
        lastName: sql`doctor.last_name`,
        phoneNumber: sql`doctor.phone_number`,
        email: sql`doctor.email`,
        role: sql`doctor.role`,
      }
    })
    .from(appointments)
    .innerJoin(sql`${users} AS patient`, sql`${appointments.patientId} = patient.id`)
    .innerJoin(sql`${users} AS doctor`, sql`${appointments.doctorId} = doctor.id`)
    .where(and(
      gte(appointments.appointmentDate, startDate),
      lte(appointments.appointmentDate, endDate)
    ))
    .orderBy(desc(appointments.appointmentDate));
  }

  async getActiveStaffCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        eq(users.isApproved, true),
        sql`${users.role} IN ('doctor', 'staff', 'admin')`
      ));
    
    return result[0]?.count || 0;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db.update(appointments)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment || undefined;
  }

  async updateUserApproval(id: string, isApproved: boolean): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ isApproved, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
}

export const storage = new DatabaseStorage();
