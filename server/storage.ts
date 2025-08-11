import { 
  users, otpSessions, emailOtpSessions, authSessions, staffVerifications, staffPresence, appointments, 
  queueTokens, medicines, prescriptions, medicineReminders, delayNotifications,
  homeVisits, medicalHistory, patientFeedback, clinics, emergencyRequests,
  type User, type InsertUser, type OtpSession, type InsertOtpSession,
  type EmailOtpSession, type InsertEmailOtpSession,
  type AuthSession, type InsertAuthSession, type StaffVerification, type InsertStaffVerification,
  type StaffPresence, type InsertStaffPresence,
  type Appointment, type InsertAppointment, type QueueToken, type InsertQueueToken,
  type Medicine, type InsertMedicine, type Prescription, type InsertPrescription,
  type MedicineReminder, type InsertMedicineReminder, type DelayNotification, type InsertDelayNotification,
  type HomeVisit, type InsertHomeVisit, type MedicalHistory, type InsertMedicalHistory,
  type PatientFeedback, type InsertPatientFeedback, type Clinic, type InsertClinic,
  type EmergencyRequest, type InsertEmergencyRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql, not } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  approveUser(id: string): Promise<User | undefined>;
  deactivateUser(id: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByClinic(clinicId: string): Promise<User[]>;
  getUsersByRoleAndClinic(role: string, clinicId: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getPatients(): Promise<User[]>;
  getActiveStaffCount(): Promise<number>;
  updateUserApproval(id: string, isApproved: boolean): Promise<User | undefined>;
  
  // OTP Sessions
  createOtpSession(session: InsertOtpSession): Promise<OtpSession>;
  getOtpSession(phoneNumber: string): Promise<OtpSession | undefined>;
  invalidateOtpSession(phoneNumber: string): Promise<void>;
  incrementOtpAttempts(phoneNumber: string): Promise<void>;
  
  // Email OTP Sessions
  createEmailOtpSession(session: InsertEmailOtpSession): Promise<EmailOtpSession>;
  getEmailOtpSession(email: string): Promise<EmailOtpSession | undefined>;
  invalidateEmailOtpSession(email: string): Promise<void>;
  incrementEmailOtpAttempts(email: string): Promise<void>;

  // Temporary Signup Data
  storeTempSignupData(email: string, data: any): Promise<void>;
  getTempSignupData(email: string): Promise<any>;
  deleteTempSignupData(email: string): Promise<void>;
  
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
  
  // Staff Presence
  createOrUpdateStaffPresence(staffId: string, date: Date, clinicId?: string): Promise<StaffPresence>;
  createStaffPresence(data: InsertStaffPresence): Promise<StaffPresence>;
  getStaffPresence(staffId: string, date: Date): Promise<StaffPresence | undefined>;
  getStaffPresenceForDate(date: Date): Promise<(StaffPresence & { staff: User })[]>;
  updateStaffPresence(id: string, updates: Partial<InsertStaffPresence>): Promise<StaffPresence | undefined>;
  getTodayStaffPresence(): Promise<(StaffPresence & { staff: User })[]>;
  markStaffPresent(staffId: string, clinicId: string): Promise<StaffPresence>;
  updateStaffCheckout(staffId: string): Promise<StaffPresence | undefined>;
  
  // Appointments
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentWithDetails(id: string): Promise<(Appointment & { patient: User; doctor: User }) | undefined>;
  getUserAppointments(userId: string, role: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getAppointmentsByDate(date: Date, doctorId?: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  cancelAppointment(id: string): Promise<Appointment | undefined>;
  getAppointments(userId?: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date, clinicId?: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getAppointmentById(id: string): Promise<Appointment | null>;
  getPendingAppointments(): Promise<(Appointment & { patient: User; doctor: User })[]>;
  updateUserStatus(userId: string, status: { isApproved: boolean }): Promise<void>;
  getUserByPhone(phoneNumber: string): Promise<User | null>;
  
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
  getMedicinesByClinic(clinicId: string): Promise<Medicine[]>;
  getClinicMedicines(clinicId: string): Promise<Medicine[]>;
  searchMedicines(query: string): Promise<Medicine[]>;
  searchClinicMedicines(query: string, clinicId: string): Promise<Medicine[]>;
  addMedicine(medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medicine>;
  getMedicineById(medicineId: string): Promise<Medicine | null>;
  updateMedicine(medicineId: string, updates: Partial<Medicine>): Promise<Medicine | null>;
  deleteMedicine(medicineId: string): Promise<boolean>;
  
  // Prescriptions
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPrescription(id: string): Promise<Prescription | undefined>;
  getPrescriptionWithDetails(id: string): Promise<(Prescription & { medicine: Medicine; patient: User; doctor: User }) | undefined>;
  getPatientPrescriptions(patientId: string): Promise<(Prescription & { medicine: Medicine; doctor: User })[]>;
  deletePrescription(prescriptionId: string): Promise<boolean>;
  deleteFutureReminders(prescriptionId: string): Promise<boolean>;
  
  // Admin-specific methods
  getAllQueueTokens(): Promise<(QueueToken & { patient: User; doctor: User })[]>;
  getAllAppointments(): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getAllPatients(): Promise<User[]>;
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

  // Patient Feedback
  createPatientFeedback(feedback: InsertPatientFeedback): Promise<PatientFeedback>;
  getAllPatientFeedback(): Promise<(PatientFeedback & { patient?: User; appointment?: Appointment })[]>;
  getPatientFeedbackById(id: string): Promise<PatientFeedback | null>;
  getPatientFeedbackByPatientId(patientId: string): Promise<PatientFeedback[]>;
  markFeedbackAsRead(id: string): Promise<PatientFeedback | null>;

  // Clinic Management
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  getAllClinics(): Promise<Clinic[]>;
  getClinicById(id: string): Promise<Clinic | null>;
  updateClinic(id: string, clinic: Partial<InsertClinic>): Promise<Clinic | null>;
  deleteClinic(id: string): Promise<boolean>;
  getClinicUserCount(clinicId: string): Promise<number>;
  getClinicStats(clinicId: string): Promise<{
    totalUsers: number;
    totalAppointments: number;
    totalMedicines: number;
    activeStaff: number;
  }>;

  // Clinic-specific data methods
  getAppointmentsByClinic(clinicId: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getUsersByClinic(clinicId: string): Promise<User[]>;
  getPatientsByClinic(clinicId: string): Promise<User[]>;
  getQueueTokensByClinic(clinicId: string): Promise<(QueueToken & { patient: User; doctor: User })[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date, clinicId?: string): Promise<(Appointment & { patient: User; doctor: User })[]>;
  getActiveStaffCountByClinic(clinicId: string): Promise<number>;

  // Emergency Requests
  createEmergencyRequest(request: InsertEmergencyRequest): Promise<EmergencyRequest>;
  getEmergencyRequest(id: string): Promise<EmergencyRequest | undefined>;
  getEmergencyRequestsForClinic(clinicId: string): Promise<(EmergencyRequest & { patient: User })[]>;
  getEmergencyRequestsForPatient(patientId: string): Promise<(EmergencyRequest & { doctor?: User })[]>;
  updateEmergencyRequestStatus(id: string, status: string, doctorId?: string): Promise<EmergencyRequest | undefined>;
  getActiveEmergencyRequests(): Promise<(EmergencyRequest & { patient: User; doctor?: User })[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user || null;
  }

  async updateUserApproval(id: string, isApproved: boolean): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ isApproved, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
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

  async getUsersByRoleAndClinic(role: string, clinicId: string): Promise<User[]> {
    return await db.select().from(users).where(
      and(
        eq(users.role, role as any),
        eq(users.clinicId, clinicId)
      )
    );
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getPatients(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'patient'));
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

  // Email OTP Sessions
  async createEmailOtpSession(session: InsertEmailOtpSession): Promise<EmailOtpSession> {
    const [newSession] = await db.insert(emailOtpSessions).values(session).returning();
    return newSession;
  }

  async getEmailOtpSession(email: string): Promise<EmailOtpSession | undefined> {
    const [session] = await db.select().from(emailOtpSessions)
      .where(and(
        eq(emailOtpSessions.email, email),
        eq(emailOtpSessions.isUsed, false),
        gte(emailOtpSessions.expiresAt, new Date())
      ))
      .orderBy(desc(emailOtpSessions.createdAt));
    return session || undefined;
  }

  async invalidateEmailOtpSession(email: string): Promise<void> {
    await db.update(emailOtpSessions)
      .set({ isUsed: true })
      .where(eq(emailOtpSessions.email, email));
  }

  async incrementEmailOtpAttempts(email: string): Promise<void> {
    await db.update(emailOtpSessions)
      .set({ attempts: sql`${emailOtpSessions.attempts} + 1` })
      .where(eq(emailOtpSessions.email, email));
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
    console.log(`Storage: Getting appointments for user ${userId} with role ${role}`);
    console.log(`Storage: Looking for appointments where patientId = ${userId}`);
    
    // For dashboard context, show appointments from today onwards (include today)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const appointmentRecords = await db.select().from(appointments)
      .where(
        and(
          eq(appointments.patientId, userId),
          gte(appointments.appointmentDate, today), // Include today's appointments
          sql`${appointments.status} IN ('scheduled', 'confirmed', 'pending_approval')`
        )
      )
      .orderBy(asc(appointments.appointmentDate))
      .limit(5); // Show multiple appointments for context
    
    console.log(`Storage: Raw Drizzle query returned ${appointmentRecords.length} appointments from today onwards`);
    console.log(`Storage: Today's date filter start:`, today.toISOString());
    if (appointmentRecords.length > 0) {
      console.log(`Storage: First appointment:`, appointmentRecords[0]);
      appointmentRecords.forEach((apt, index) => {
        console.log(`Storage: Appointment ${index + 1}: ${apt.id} at ${apt.appointmentDate}`);
      });
    }
    
    console.log(`Storage: Found ${appointmentRecords.length} appointments from today onwards for user ${userId}`);
    
    // Manually join with users
    const appointmentsWithUsers = [];
    for (const appointment of appointmentRecords) {
      const [patient] = await db.select().from(users).where(eq(users.id, appointment.patientId));
      const [doctor] = await db.select().from(users).where(eq(users.id, appointment.doctorId));
      
      if (patient && doctor) {
        appointmentsWithUsers.push({
          ...appointment,
          patient,
          doctor
        });
      } else {
        console.log(`Storage: Missing user data for appointment ${appointment.id} - patient: ${!!patient}, doctor: ${!!doctor}`);
      }
    }
    
    console.log(`Storage: Returning ${appointmentsWithUsers.length} appointments with user data for user ${userId}`);
    return appointmentsWithUsers;
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

  async getAppointmentById(id: string): Promise<Appointment | null> {
    const [appointment] = await db.select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);
    return appointment || null;
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
    console.log('Storage: Getting appointments for admin...');
    
    // For admin dashboard, prioritize pending approvals and show all active appointments
    const appointmentRecords = await db.select().from(appointments)
      .where(sql`${appointments.status} NOT IN ('completed', 'cancelled', 'no_show')`)
      .orderBy(
        sql`CASE WHEN ${appointments.status} = 'pending_approval' THEN 0 ELSE 1 END`,
        desc(appointments.appointmentDate)
      );
    console.log('Storage: Direct query found active appointments:', appointmentRecords?.length || 0);
    
    // Manually join with users
    const appointmentsWithUsers = [];
    for (const appointment of appointmentRecords) {
      const [patient] = await db.select().from(users).where(eq(users.id, appointment.patientId));
      const [doctor] = await db.select().from(users).where(eq(users.id, appointment.doctorId));
      
      if (patient && doctor) {
        appointmentsWithUsers.push({
          ...appointment,
          patient,
          doctor
        });
      } else {
        console.log(`Storage: Missing user data for appointment ${appointment.id} - patient: ${!!patient}, doctor: ${!!doctor}`);
      }
    }
    
    console.log('Storage: Final result with users:', appointmentsWithUsers.length);
    return appointmentsWithUsers;
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

  async getNextTokenNumber(doctorId: string, appointmentId?: string): Promise<number> {
    // If there's an appointmentId, assign token number based on appointment time order
    if (appointmentId) {
      return this.getTokenNumberByAppointmentTime(doctorId, appointmentId);
    }
    
    // Fallback to sequential numbering for walk-ins
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

  async getTokenNumberByAppointmentTime(doctorId: string, appointmentId: string): Promise<number> {
    // Get the appointment to find its time
    const appointment = await db.select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    
    if (!appointment.length) {
      // Fallback to sequential if appointment not found
      return this.getNextTokenNumber(doctorId);
    }
    
    const appointmentTime = appointment[0].appointmentDate;
    
    // Get all appointments for today for this doctor, ordered by time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysAppointments = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.appointmentDate, today),
        lte(appointments.appointmentDate, tomorrow)
      ))
      .orderBy(asc(appointments.appointmentDate));
    
    // Find the position of this appointment in the time-ordered list
    const appointmentIndex = todaysAppointments.findIndex(apt => apt.id === appointmentId);
    
    if (appointmentIndex === -1) {
      // Fallback if appointment not found in today's list
      return this.getNextTokenNumber(doctorId);
    }
    
    // Token number should be based on appointment time order (1-indexed)
    return appointmentIndex + 1;
  }

  async reorderQueueByAppointmentTime(doctorId: string): Promise<void> {
    // Get all queue tokens for this doctor for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db.select({
      token: queueTokens,
      appointment: appointments
    })
    .from(queueTokens)
    .leftJoin(appointments, eq(queueTokens.appointmentId, appointments.id))
    .where(and(
      eq(queueTokens.doctorId, doctorId),
      eq(queueTokens.status, 'waiting'),
      gte(queueTokens.createdAt, today),
      lte(queueTokens.createdAt, tomorrow)
    ));

    console.log('🔥 REORDER - Found tokens:', result.length);
    
    // Sort tokens by appointment time (with walk-ins last)
    const sortedTokens = result.sort((a, b) => {
      const aTime = a.appointment?.appointmentDate;
      const bTime = b.appointment?.appointmentDate;
      
      console.log(`🔥 REORDER - Comparing: ${a.token.id} (${aTime}) vs ${b.token.id} (${bTime})`);
      
      // If both have appointments, sort by appointment time
      if (aTime && bTime) {
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      }
      
      // If only one has an appointment, put that one first
      if (aTime && !bTime) return -1;
      if (!aTime && bTime) return 1;
      
      // If neither has an appointment, sort by creation time (walk-ins)
      return new Date(a.token.createdAt).getTime() - new Date(b.token.createdAt).getTime();
    });

    console.log('🔥 REORDER - Sorted order:');
    sortedTokens.forEach((item, index) => {
      const appointmentTime = item.appointment?.appointmentDate || 'No appointment';
      console.log(`  ${index + 1}. Token ${item.token.id} - Appointment: ${appointmentTime}`);
    });

    // Update token numbers to match the new order
    for (let i = 0; i < sortedTokens.length; i++) {
      const item = sortedTokens[i];
      const newTokenNumber = i + 1;
      
      console.log(`🔥 REORDER - Updating token ${item.token.id}: ${item.token.tokenNumber} -> ${newTokenNumber}`);
      
      if (item.token.tokenNumber !== newTokenNumber) {
        await db.update(queueTokens)
          .set({ tokenNumber: newTokenNumber })
          .where(eq(queueTokens.id, item.token.id));
        
        console.log(`🔥 REORDER - Updated token ${item.token.id} to position ${newTokenNumber}`);
      }
    }
    
    console.log('🔥 REORDER - Queue reordering completed');
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

  async removeDuplicateQueueTokens(): Promise<void> {
    console.log('🔥 CLEANUP - Starting duplicate queue token removal...');
    
    // Find duplicate tokens (same patient + doctor combination)
    const duplicates = await db.select({
      patientId: queueTokens.patientId,
      doctorId: queueTokens.doctorId,
      count: sql<number>`COUNT(*)`
    })
    .from(queueTokens)
    .where(eq(queueTokens.status, 'waiting'))
    .groupBy(queueTokens.patientId, queueTokens.doctorId)
    .having(sql`COUNT(*) > 1`);

    console.log(`🔥 CLEANUP - Found ${duplicates.length} duplicate patient-doctor combinations`);

    for (const duplicate of duplicates) {
      console.log(`🔥 CLEANUP - Processing duplicates for patient ${duplicate.patientId} with doctor ${duplicate.doctorId}`);
      
      // Get all tokens for this patient-doctor combination, ordered by creation date (keep the oldest)
      const tokens = await db.select()
        .from(queueTokens)
        .where(and(
          eq(queueTokens.patientId, duplicate.patientId),
          eq(queueTokens.doctorId, duplicate.doctorId),
          eq(queueTokens.status, 'waiting')
        ))
        .orderBy(asc(queueTokens.createdAt));

      if (tokens.length > 1) {
        // Keep the first (oldest) token, remove the rest
        const tokenToKeep = tokens[0];
        const tokensToRemove = tokens.slice(1);

        console.log(`🔥 CLEANUP - Keeping token ${tokenToKeep.id}, removing ${tokensToRemove.length} duplicates`);

        for (const tokenToRemove of tokensToRemove) {
          await db.delete(queueTokens).where(eq(queueTokens.id, tokenToRemove.id));
          console.log(`🔥 CLEANUP - Removed duplicate token ${tokenToRemove.id}`);
        }
      }
    }

    console.log('🔥 CLEANUP - Duplicate removal completed');
  }

  async updateQueueTokenWaitTime(id: string, estimatedWaitTime: number): Promise<QueueToken | undefined> {
    const [updatedToken] = await db.update(queueTokens)
      .set({ estimatedWaitTime })
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

  async getMedicinesByClinic(clinicId: string): Promise<Medicine[]> {
    return await db.select().from(medicines)
      .where(eq(medicines.clinicId, clinicId))
      .orderBy(asc(medicines.name));
  }

  async getClinicMedicines(clinicId: string): Promise<Medicine[]> {
    // Only return medicines that are NOT patient-added (exclude manufacturer = 'Patient Added')
    return await db.select().from(medicines)
      .where(and(
        eq(medicines.clinicId, clinicId),
        not(eq(medicines.manufacturer, 'Patient Added'))
      ))
      .orderBy(asc(medicines.name));
  }

  async searchMedicines(query: string): Promise<Medicine[]> {
    return await db.select().from(medicines)
      .where(sql`${medicines.name} ILIKE ${'%' + query + '%'}`)
      .orderBy(asc(medicines.name));
  }

  async searchClinicMedicines(query: string, clinicId: string): Promise<Medicine[]> {
    // Only search medicines that are NOT patient-added (exclude manufacturer = 'Patient Added')
    return await db.select().from(medicines)
      .where(and(
        eq(medicines.clinicId, clinicId),
        not(eq(medicines.manufacturer, 'Patient Added')),
        sql`${medicines.name} ILIKE ${'%' + query + '%'}`
      ))
      .orderBy(asc(medicines.name));
  }

  async addMedicine(medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medicine> {
    const [newMedicine] = await db.insert(medicines).values(medicine).returning();
    return newMedicine;
  }

  async createPatientMedicine(medicine: Omit<InsertMedicine, 'clinicId'>): Promise<Medicine> {
    // For patient-added medicines, use default clinic ID
    const medicineData = {
      ...medicine,
      clinicId: 'default-clinic-id'
    };
    const [newMedicine] = await db.insert(medicines).values(medicineData).returning();
    return newMedicine;
  }

  async getMedicineById(medicineId: string): Promise<Medicine | null> {
    const [medicine] = await db.select().from(medicines).where(eq(medicines.id, medicineId));
    return medicine || null;
  }

  async updateMedicine(medicineId: string, updates: Partial<Medicine>): Promise<Medicine | null> {
    const [updatedMedicine] = await db.update(medicines)
      .set(updates)
      .where(eq(medicines.id, medicineId))
      .returning();
    return updatedMedicine || null;
  }

  async deleteMedicine(medicineId: string): Promise<boolean> {
    try {
      // First, delete all associated reminders
      await db.delete(medicineReminders)
        .where(sql`prescription_id IN (SELECT id FROM prescriptions WHERE medicine_id = ${medicineId})`);
      
      // Then, delete all associated prescriptions
      await db.delete(prescriptions)
        .where(eq(prescriptions.medicineId, medicineId));
      
      // Finally, delete the medicine
      await db.delete(medicines)
        .where(eq(medicines.id, medicineId));
      
      return true;
    } catch (error) {
      console.error('Error deleting medicine:', error);
      return false;
    }
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

  async deletePrescription(prescriptionId: string): Promise<boolean> {
    try {
      // First, delete all associated medicine reminders
      await db.delete(medicineReminders)
        .where(eq(medicineReminders.prescriptionId, prescriptionId));
      
      // Then, delete the prescription
      await db.delete(prescriptions)
        .where(eq(prescriptions.id, prescriptionId));
      
      return true;
    } catch (error) {
      console.error('Error deleting prescription:', error);
      return false;
    }
  }

  async deleteFutureReminders(prescriptionId: string): Promise<boolean> {
    try {
      // Delete all reminders from today onwards (including today's remaining reminders)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      await db.delete(medicineReminders)
        .where(and(
          eq(medicineReminders.prescriptionId, prescriptionId),
          gte(medicineReminders.scheduledAt, today),
          eq(medicineReminders.isTaken, false), // Only delete untaken reminders
          eq(medicineReminders.isSkipped, false) // Only delete unskipped reminders
        ));
      
      console.log('🔥 Deleted future reminders from today onwards for prescription:', prescriptionId);
      return true;
    } catch (error) {
      console.error('Error deleting future reminders:', error);
      return false;
    }
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
    // Use direct SQL query with proper joins
    const whereConditions = [eq(prescriptions.patientId, patientId)];
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereConditions.push(
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
      medicineName: medicines.name,
      dosage: prescriptions.dosage,
      instructions: prescriptions.instructions,
      frequency: prescriptions.frequency
    })
    .from(medicineReminders)
    .innerJoin(prescriptions, eq(medicineReminders.prescriptionId, prescriptions.id))
    .innerJoin(medicines, eq(prescriptions.medicineId, medicines.id))
    .where(and(...whereConditions))
    .orderBy(asc(medicineReminders.scheduledAt));
  }

  async getDueReminders(): Promise<any[]> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Use direct SQL query to avoid relation issues
    return await db.select({
      id: medicineReminders.id,
      prescriptionId: medicineReminders.prescriptionId,
      scheduledAt: medicineReminders.scheduledAt,
      patientName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      patientPhone: users.phoneNumber,
      medicineName: medicines.name,
      dosage: prescriptions.dosage,
      instructions: prescriptions.instructions
    })
    .from(medicineReminders)
    .innerJoin(prescriptions, eq(medicineReminders.prescriptionId, prescriptions.id))
    .innerJoin(users, eq(prescriptions.patientId, users.id))
    .innerJoin(medicines, eq(prescriptions.medicineId, medicines.id))
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

  async getAllActiveDelayNotifications(): Promise<DelayNotification[]> {
    return await db.select().from(delayNotifications)
      .where(eq(delayNotifications.isResolved, false))
      .orderBy(desc(delayNotifications.createdAt));
  }

  // Patient Feedback Methods
  async createPatientFeedback(feedback: InsertPatientFeedback): Promise<PatientFeedback> {
    const [newFeedback] = await db.insert(patientFeedback).values(feedback).returning();
    return newFeedback;
  }

  async getAllPatientFeedback(): Promise<(PatientFeedback & { patient?: User; appointment?: Appointment })[]> {
    const feedbackRecords = await db.select().from(patientFeedback)
      .orderBy(desc(patientFeedback.createdAt));
    
    // Manually join with users and appointments - handle anonymous feedback
    const feedbackWithUsers = [];
    for (const feedback of feedbackRecords) {
      let patient = undefined;
      if (feedback.patientId) {
        const [patientRecord] = await db.select().from(users).where(eq(users.id, feedback.patientId));
        patient = patientRecord;
      }
      
      let appointment = undefined;
      if (feedback.appointmentId) {
        const [apt] = await db.select().from(appointments).where(eq(appointments.id, feedback.appointmentId));
        appointment = apt;
      }
      
      // Include feedback regardless of whether patient exists (for anonymous feedback)
      feedbackWithUsers.push({
        ...feedback,
        patient,
        appointment
      });
    }
    
    return feedbackWithUsers;
  }

  async getPatientFeedbackById(id: string): Promise<PatientFeedback | null> {
    const [feedback] = await db.select()
      .from(patientFeedback)
      .where(eq(patientFeedback.id, id));
    return feedback || null;
  }

  async getPatientFeedbackByPatientId(patientId: string): Promise<PatientFeedback[]> {
    return await db.select().from(patientFeedback)
      .where(eq(patientFeedback.patientId, patientId))
      .orderBy(desc(patientFeedback.createdAt));
  }

  async markFeedbackAsRead(id: string): Promise<PatientFeedback | null> {
    const [updatedFeedback] = await db.update(patientFeedback)
      .set({ isRead: true })
      .where(eq(patientFeedback.id, id))
      .returning();
    return updatedFeedback || null;
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
    .where(sql`${queueTokens.status} IN ('waiting', 'called', 'in_progress')`) // Filter out completed/cancelled tokens
    .orderBy(asc(queueTokens.tokenNumber)); // Order by token number for proper queue display
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

  async getAppointmentsByDateRange(startDate: Date, endDate: Date, clinicId?: string): Promise<any[]> {
    let whereConditions = [
      gte(appointments.appointmentDate, startDate),
      lte(appointments.appointmentDate, endDate)
    ];
    
    if (clinicId) {
      whereConditions.push(eq(appointments.clinicId, clinicId));
    }
    
    return await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      clinicId: appointments.clinicId,
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
        dateOfBirth: sql`patient.date_of_birth`,
        address: sql`patient.address`,
        emergencyContact: sql`patient.emergency_contact`,
        clinicId: sql`patient.clinic_id`,
        isActive: sql`patient.is_active`,
        isApproved: sql`patient.is_approved`,
        createdAt: sql`patient.created_at`,
        updatedAt: sql`patient.updated_at`
      },
      doctor: {
        id: sql`doctor.id`,
        firstName: sql`doctor.first_name`,
        lastName: sql`doctor.last_name`,
        phoneNumber: sql`doctor.phone_number`,
        email: sql`doctor.email`,
        role: sql`doctor.role`,
        dateOfBirth: sql`doctor.date_of_birth`,
        address: sql`doctor.address`,
        emergencyContact: sql`doctor.emergency_contact`,
        clinicId: sql`doctor.clinic_id`,
        isActive: sql`doctor.is_active`,
        isApproved: sql`doctor.is_approved`,
        createdAt: sql`doctor.created_at`,
        updatedAt: sql`doctor.updated_at`
      }
    })
    .from(appointments)
    .innerJoin(sql`${users} AS patient`, sql`${appointments.patientId} = patient.id`)
    .innerJoin(sql`${users} AS doctor`, sql`${appointments.doctorId} = doctor.id`)
    .where(and(...whereConditions))
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



  async getPendingAppointments(): Promise<(Appointment & { patient: User; doctor: User })[]> {
    const result = await db.select({
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
        firstName: sql`doctor.first_name`,
        lastName: sql`doctor.last_name`,
        phoneNumber: sql`doctor.phone_number`,
        email: sql`doctor.email`,
        role: sql`doctor.role`,
        dateOfBirth: sql`doctor.date_of_birth`,
        address: sql`doctor.address`,
        emergencyContact: sql`doctor.emergency_contact`,
        isActive: sql`doctor.is_active`,
        isApproved: sql`doctor.is_approved`,
        createdAt: sql`doctor.created_at`,
        updatedAt: sql`doctor.updated_at`,
      }
    })
    .from(appointments)
    .innerJoin(sql`${users} AS patient`, sql`${appointments.patientId} = patient.id`)
    .innerJoin(sql`${users} AS doctor`, sql`${appointments.doctorId} = doctor.id`)
    .where(eq(appointments.status, 'pending_approval'))
    .orderBy(desc(appointments.createdAt));

    return result as any[];
  }

  async updateUserStatus(userId: string, status: { isApproved: boolean }): Promise<void> {
    await db.update(users)
      .set({ isApproved: status.isApproved, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Staff Presence Implementation
  async createOrUpdateStaffPresence(staffId: string, date: Date, clinicId?: string): Promise<StaffPresence> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if presence record exists for this date
    const existing = await db.select()
      .from(staffPresence)
      .where(and(
        eq(staffPresence.staffId, staffId),
        gte(staffPresence.date, startOfDay),
        lte(staffPresence.date, endOfDay)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record to mark present
      const [updated] = await db.update(staffPresence)
        .set({ 
          isPresent: true, 
          checkInTime: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(staffPresence.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Get clinicId from the staff user if not provided
      const staffUser = await this.getUser(staffId);
      if (!staffUser) {
        throw new Error('Staff user not found');
      }
      
      // Create new presence record
      const [newPresence] = await db.insert(staffPresence)
        .values({
          staffId,
          clinicId: clinicId || staffUser.clinicId,
          date: startOfDay,
          isPresent: true,
          checkInTime: new Date(),
          markedByAdmin: false
        })
        .returning();
      return newPresence;
    }
  }

  async getStaffPresence(staffId: string, date: Date): Promise<StaffPresence | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [presence] = await db.select()
      .from(staffPresence)
      .where(and(
        eq(staffPresence.staffId, staffId),
        gte(staffPresence.date, startOfDay),
        lte(staffPresence.date, endOfDay)
      ))
      .limit(1);

    return presence || undefined;
  }

  async getStaffPresenceForDate(date: Date): Promise<(StaffPresence & { staff: User })[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db.query.staffPresence.findMany({
      where: and(
        gte(staffPresence.date, startOfDay),
        lte(staffPresence.date, endOfDay)
      ),
      with: {
        staff: true
      }
    });
  }

  async updateStaffPresence(id: string, updates: Partial<InsertStaffPresence>): Promise<StaffPresence | undefined> {
    const [updated] = await db.update(staffPresence)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(staffPresence.id, id))
      .returning();
    return updated || undefined;
  }

  async getTodayStaffPresence(): Promise<(StaffPresence & { staff: User })[]> {
    const today = new Date();
    return this.getStaffPresenceForDate(today);
  }

  async createStaffPresence(data: InsertStaffPresence): Promise<StaffPresence> {
    const startOfDay = new Date(data.date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const [newPresence] = await db.insert(staffPresence)
      .values({
        ...data,
        date: startOfDay,
        checkInTime: data.isPresent ? (data.checkInTime || new Date()) : undefined,
        checkOutTime: data.checkOutTime || undefined
      })
      .returning();
    return newPresence;
  }

  async markStaffPresent(staffId: string, clinicId: string): Promise<StaffPresence> {
    const today = new Date();
    return this.createOrUpdateStaffPresence(staffId, today, clinicId);
  }

  async updateStaffCheckout(staffId: string): Promise<StaffPresence | undefined> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [updated] = await db.update(staffPresence)
      .set({ 
        checkOutTime: new Date(),
        updatedAt: new Date() 
      })
      .where(and(
        eq(staffPresence.staffId, staffId),
        gte(staffPresence.date, startOfDay),
        lte(staffPresence.date, endOfDay)
      ))
      .returning();
    
    return updated || undefined;
  }

  // Clinic Management
  async createClinic(clinic: InsertClinic): Promise<Clinic> {
    const [newClinic] = await db.insert(clinics)
      .values(clinic)
      .returning();
    return newClinic;
  }

  async getAllClinics(): Promise<Clinic[]> {
    return await db.select().from(clinics);
  }

  async getClinicById(id: string): Promise<Clinic | null> {
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic || null;
  }

  async updateClinic(id: string, clinic: Partial<InsertClinic>): Promise<Clinic | null> {
    const [updated] = await db.update(clinics)
      .set({ ...clinic, updatedAt: new Date() })
      .where(eq(clinics.id, id))
      .returning();
    return updated || null;
  }

  async deleteClinic(id: string): Promise<boolean> {
    const result = await db.delete(clinics)
      .where(eq(clinics.id, id));
    return result.rowCount > 0;
  }

  async getClinicUserCount(clinicId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.clinicId, clinicId));
    return result.count;
  }

  async getClinicStats(clinicId: string): Promise<{
    totalUsers: number;
    totalAppointments: number;
    totalMedicines: number;
    activeStaff: number;
  }> {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.clinicId, clinicId));

    const [appointmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.clinicId, clinicId));

    const [medicineCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(medicines)
      .where(eq(medicines.clinicId, clinicId));

    const [activeStaffCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(
        eq(users.clinicId, clinicId),
        eq(users.isActive, true),
        sql`${users.role} IN ('staff', 'doctor')`
      ));

    return {
      totalUsers: userCount.count,
      totalAppointments: appointmentCount.count,
      totalMedicines: medicineCount.count,
      activeStaff: activeStaffCount.count
    };
  }

  // Clinic-specific data methods

  async getAppointmentsByClinic(clinicId: string): Promise<(Appointment & { patient: User; doctor: User })[]> {
    return await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      clinicId: appointments.clinicId,
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
        id: sql`${users.id}`.as('patient_id'),
        phoneNumber: sql`${users.phoneNumber}`.as('patient_phone'),
        role: sql`${users.role}`.as('patient_role'),
        firstName: sql`${users.firstName}`.as('patient_first_name'),
        lastName: sql`${users.lastName}`.as('patient_last_name'),
        email: sql`${users.email}`.as('patient_email'),
        dateOfBirth: sql`${users.dateOfBirth}`.as('patient_dob'),
        address: sql`${users.address}`.as('patient_address'),
        emergencyContact: sql`${users.emergencyContact}`.as('patient_emergency'),
        clinicId: sql`${users.clinicId}`.as('patient_clinic_id'),
        isActive: sql`${users.isActive}`.as('patient_is_active'),
        isApproved: sql`${users.isApproved}`.as('patient_is_approved'),
        createdAt: sql`${users.createdAt}`.as('patient_created_at'),
        updatedAt: sql`${users.updatedAt}`.as('patient_updated_at')
      },
      doctor: {
        id: sql`doctor.id`.as('doctor_id'),
        phoneNumber: sql`doctor.phone_number`.as('doctor_phone'),
        role: sql`doctor.role`.as('doctor_role'),
        firstName: sql`doctor.first_name`.as('doctor_first_name'),
        lastName: sql`doctor.last_name`.as('doctor_last_name'),
        email: sql`doctor.email`.as('doctor_email'),
        dateOfBirth: sql`doctor.date_of_birth`.as('doctor_dob'),
        address: sql`doctor.address`.as('doctor_address'),
        emergencyContact: sql`doctor.emergency_contact`.as('doctor_emergency'),
        clinicId: sql`doctor.clinic_id`.as('doctor_clinic_id'),
        isActive: sql`doctor.is_active`.as('doctor_is_active'),
        isApproved: sql`doctor.is_approved`.as('doctor_is_approved'),
        createdAt: sql`doctor.created_at`.as('doctor_created_at'),
        updatedAt: sql`doctor.updated_at`.as('doctor_updated_at')
      }
    })
    .from(appointments)
    .leftJoin(users, eq(appointments.patientId, users.id))
    .leftJoin(sql`${users} as doctor`, sql`${appointments.doctorId} = doctor.id`)
    .where(eq(appointments.clinicId, clinicId))
    .orderBy(desc(appointments.appointmentDate)) as any;
  }

  async getUsersByClinic(clinicId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.clinicId, clinicId));
  }

  async getPatientsByClinic(clinicId: string): Promise<User[]> {
    return await db.select().from(users)
      .where(and(eq(users.clinicId, clinicId), eq(users.role, 'patient')));
  }

  async getQueueTokensByClinic(clinicId: string): Promise<(QueueToken & { patient: User; doctor: User })[]> {
    return await db.select({
      id: queueTokens.id,
      patientId: queueTokens.patientId,
      doctorId: queueTokens.doctorId,
      clinicId: queueTokens.clinicId,
      tokenNumber: queueTokens.tokenNumber,
      status: queueTokens.status,
      estimatedWaitTime: queueTokens.estimatedWaitTime,
      checkedInAt: queueTokens.checkedInAt,
      calledAt: queueTokens.calledAt,
      completedAt: queueTokens.completedAt,
      createdAt: queueTokens.createdAt,
      updatedAt: queueTokens.updatedAt,
      patient: {
        id: sql`${users.id}`.as('patient_id'),
        phoneNumber: sql`${users.phoneNumber}`.as('patient_phone'),
        role: sql`${users.role}`.as('patient_role'),
        firstName: sql`${users.firstName}`.as('patient_first_name'),
        lastName: sql`${users.lastName}`.as('patient_last_name'),
        email: sql`${users.email}`.as('patient_email'),
        dateOfBirth: sql`${users.dateOfBirth}`.as('patient_dob'),
        address: sql`${users.address}`.as('patient_address'),
        emergencyContact: sql`${users.emergencyContact}`.as('patient_emergency'),
        clinicId: sql`${users.clinicId}`.as('patient_clinic_id'),
        isActive: sql`${users.isActive}`.as('patient_is_active'),
        isApproved: sql`${users.isApproved}`.as('patient_is_approved'),
        createdAt: sql`${users.createdAt}`.as('patient_created_at'),
        updatedAt: sql`${users.updatedAt}`.as('patient_updated_at')
      },
      doctor: {
        id: sql`doctor.id`.as('doctor_id'),
        phoneNumber: sql`doctor.phone_number`.as('doctor_phone'),
        role: sql`doctor.role`.as('doctor_role'),
        firstName: sql`doctor.first_name`.as('doctor_first_name'),
        lastName: sql`doctor.last_name`.as('doctor_last_name'),
        email: sql`doctor.email`.as('doctor_email'),
        dateOfBirth: sql`doctor.date_of_birth`.as('doctor_dob'),
        address: sql`doctor.address`.as('doctor_address'),
        emergencyContact: sql`doctor.emergency_contact`.as('doctor_emergency'),
        clinicId: sql`doctor.clinic_id`.as('doctor_clinic_id'),
        isActive: sql`doctor.is_active`.as('doctor_is_active'),
        isApproved: sql`doctor.is_approved`.as('doctor_is_approved'),
        createdAt: sql`doctor.created_at`.as('doctor_created_at'),
        updatedAt: sql`doctor.updated_at`.as('doctor_updated_at')
      }
    })
    .from(queueTokens)
    .leftJoin(users, eq(queueTokens.patientId, users.id))
    .leftJoin(sql`${users} as doctor`, sql`${queueTokens.doctorId} = doctor.id`)
    .where(eq(queueTokens.clinicId, clinicId))
    .orderBy(asc(queueTokens.tokenNumber)) as any;
  }

  async getActiveStaffCountByClinic(clinicId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(
        eq(users.clinicId, clinicId),
        eq(users.isActive, true),
        sql`${users.role} IN ('staff', 'doctor', 'admin')`
      ));
    return result.count;
  }

  // Temporary Signup Data Storage (in-memory for development)
  private tempSignupData: Map<string, any> = new Map();

  async storeTempSignupData(email: string, data: any): Promise<void> {
    // Store with expiration (10 minutes)
    const expirationTime = Date.now() + 10 * 60 * 1000;
    this.tempSignupData.set(email, { ...data, expiresAt: expirationTime });
  }

  async getTempSignupData(email: string): Promise<any> {
    const data = this.tempSignupData.get(email);
    if (!data) return null;
    
    // Check if expired
    if (Date.now() > data.expiresAt) {
      this.tempSignupData.delete(email);
      return null;
    }
    
    return data;
  }

  async deleteTempSignupData(email: string): Promise<void> {
    this.tempSignupData.delete(email);
  }

  // Emergency Requests Implementation
  async createEmergencyRequest(request: InsertEmergencyRequest): Promise<EmergencyRequest> {
    const [newRequest] = await db.insert(emergencyRequests).values(request).returning();
    return newRequest;
  }

  async getEmergencyRequest(id: string): Promise<EmergencyRequest | undefined> {
    const [request] = await db.select().from(emergencyRequests).where(eq(emergencyRequests.id, id));
    return request || undefined;
  }

  async getEmergencyRequestsForClinic(clinicId: string): Promise<(EmergencyRequest & { patient: User })[]> {
    return await db.select({
      id: emergencyRequests.id,
      patientId: emergencyRequests.patientId,
      doctorId: emergencyRequests.doctorId,
      clinicId: emergencyRequests.clinicId,
      urgencyLevel: emergencyRequests.urgencyLevel,
      symptoms: emergencyRequests.symptoms,
      contactMethod: emergencyRequests.contactMethod,
      location: emergencyRequests.location,
      notes: emergencyRequests.notes,
      status: emergencyRequests.status,
      acknowledgedAt: emergencyRequests.acknowledgedAt,
      resolvedAt: emergencyRequests.resolvedAt,
      createdAt: emergencyRequests.createdAt,
      updatedAt: emergencyRequests.updatedAt,
      patient: users
    })
    .from(emergencyRequests)
    .innerJoin(users, eq(emergencyRequests.patientId, users.id))
    .where(eq(emergencyRequests.clinicId, clinicId))
    .orderBy(desc(emergencyRequests.createdAt));
  }

  async getEmergencyRequestsForPatient(patientId: string): Promise<(EmergencyRequest & { doctor?: User })[]> {
    return await db.select({
      id: emergencyRequests.id,
      patientId: emergencyRequests.patientId,
      doctorId: emergencyRequests.doctorId,
      clinicId: emergencyRequests.clinicId,
      urgencyLevel: emergencyRequests.urgencyLevel,
      symptoms: emergencyRequests.symptoms,
      contactMethod: emergencyRequests.contactMethod,
      location: emergencyRequests.location,
      notes: emergencyRequests.notes,
      status: emergencyRequests.status,
      acknowledgedAt: emergencyRequests.acknowledgedAt,
      resolvedAt: emergencyRequests.resolvedAt,
      createdAt: emergencyRequests.createdAt,
      updatedAt: emergencyRequests.updatedAt,
      doctor: users
    })
    .from(emergencyRequests)
    .leftJoin(users, eq(emergencyRequests.doctorId, users.id))
    .where(eq(emergencyRequests.patientId, patientId))
    .orderBy(desc(emergencyRequests.createdAt));
  }

  async updateEmergencyRequestStatus(id: string, status: string, doctorId?: string): Promise<EmergencyRequest | undefined> {
    const updates: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (status === 'acknowledged') {
      updates.acknowledgedAt = new Date();
    }
    
    if (status === 'resolved') {
      updates.resolvedAt = new Date();
    }
    
    if (doctorId) {
      updates.doctorId = doctorId;
    }

    const [updatedRequest] = await db.update(emergencyRequests)
      .set(updates)
      .where(eq(emergencyRequests.id, id))
      .returning();
    return updatedRequest || undefined;
  }

  async getActiveEmergencyRequests(): Promise<(EmergencyRequest & { patient: User; doctor?: User })[]> {
    return await db.select({
      id: emergencyRequests.id,
      patientId: emergencyRequests.patientId,
      doctorId: emergencyRequests.doctorId,
      clinicId: emergencyRequests.clinicId,
      urgencyLevel: emergencyRequests.urgencyLevel,
      symptoms: emergencyRequests.symptoms,
      contactMethod: emergencyRequests.contactMethod,
      location: emergencyRequests.location,
      notes: emergencyRequests.notes,
      status: emergencyRequests.status,
      acknowledgedAt: emergencyRequests.acknowledgedAt,
      resolvedAt: emergencyRequests.resolvedAt,
      createdAt: emergencyRequests.createdAt,
      updatedAt: emergencyRequests.updatedAt,
      patient: {
        id: sql`patient.id`,
        firstName: sql`patient.first_name`,
        lastName: sql`patient.last_name`,
        phoneNumber: sql`patient.phone_number`,
        email: sql`patient.email`,
        role: sql`patient.role`,
        dateOfBirth: sql`patient.date_of_birth`,
        address: sql`patient.address`,
        emergencyContact: sql`patient.emergency_contact`,
        clinicId: sql`patient.clinic_id`,
        isActive: sql`patient.is_active`,
        isApproved: sql`patient.is_approved`,
        createdAt: sql`patient.created_at`,
        updatedAt: sql`patient.updated_at`
      },
      doctor: {
        id: sql`doctor.id`,
        firstName: sql`doctor.first_name`,
        lastName: sql`doctor.last_name`,
        phoneNumber: sql`doctor.phone_number`,
        email: sql`doctor.email`,
        role: sql`doctor.role`,
        dateOfBirth: sql`doctor.date_of_birth`,
        address: sql`doctor.address`,
        emergencyContact: sql`doctor.emergency_contact`,
        clinicId: sql`doctor.clinic_id`,
        isActive: sql`doctor.is_active`,
        isApproved: sql`doctor.is_approved`,
        createdAt: sql`doctor.created_at`,
        updatedAt: sql`doctor.updated_at`
      }
    })
    .from(emergencyRequests)
    .innerJoin(sql`${users} AS patient`, sql`${emergencyRequests.patientId} = patient.id`)
    .leftJoin(sql`${users} AS doctor`, sql`${emergencyRequests.doctorId} = doctor.id`)
    .where(sql`${emergencyRequests.status} IN ('pending', 'acknowledged', 'in_progress')`)
    .orderBy(desc(emergencyRequests.createdAt));
  }

  // Clinic hours validation method
  async isWithinClinicHours(clinicId: string, dateTime: Date): Promise<boolean> {
    const clinic = await this.getClinicById(clinicId);
    if (!clinic) return false;

    const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const timeString = dateTime.toTimeString().substring(0, 5); // "HH:MM"
    
    // Map day of week to clinic hours format
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    const hours = clinic.operatingHours as any;
    if (!hours || !hours[dayName]) return false;
    
    const dayHours = hours[dayName];
    if (!dayHours.isOpen) return false;
    
    return timeString >= dayHours.start && timeString <= dayHours.end;
  }
}

export const storage = new DatabaseStorage();
