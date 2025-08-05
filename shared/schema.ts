import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, real, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "staff", "doctor", "nurse", "patient"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]);
export const appointmentTypeEnum = pgEnum("appointment_type", ["clinic", "home_visit", "telehealth"]);
export const queueStatusEnum = pgEnum("queue_status", ["waiting", "called", "in_progress", "completed", "missed"]);
export const medicineFrequencyEnum = pgEnum("medicine_frequency", ["once_daily", "twice_daily", "three_times_daily", "four_times_daily", "as_needed", "weekly", "monthly"]);
export const prescriptionStatusEnum = pgEnum("prescription_status", ["active", "completed", "cancelled", "paused"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  role: userRoleEnum("role").notNull().default("patient"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: varchar("email", { length: 255 }),
  dateOfBirth: timestamp("date_of_birth"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  isActive: boolean("is_active").notNull().default(true),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

// OTP sessions table
export const otpSessions = pgTable("otp_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

// Auth sessions table
export const authSessions = pgTable("auth_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").notNull().default(sql`NOW()`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

// Staff GPS verification table
export const staffVerifications = pgTable("staff_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  checkedInAt: timestamp("checked_in_at").notNull().default(sql`NOW()`),
  checkedOutAt: timestamp("checked_out_at"),
  workLocation: text("work_location").notNull(),
  isValid: boolean("is_valid").notNull().default(true),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: varchar("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").notNull().default(30), // minutes
  type: appointmentTypeEnum("type").notNull().default("clinic"),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  location: text("location"),
  notes: text("notes"),
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  treatmentPlan: text("treatment_plan"),
  isDelayed: boolean("is_delayed").notNull().default(false),
  delayMinutes: integer("delay_minutes").default(0),
  delayReason: text("delay_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

// Queue management table
export const queueTokens = pgTable("queue_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenNumber: integer("token_number").notNull(),
  patientId: varchar("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: varchar("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  status: queueStatusEnum("status").notNull().default("waiting"),
  estimatedWaitTime: integer("estimated_wait_time").default(0), // minutes
  calledAt: timestamp("called_at"),
  completedAt: timestamp("completed_at"),
  priority: integer("priority").notNull().default(1), // 1=normal, 2=urgent, 3=emergency
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

// Medicines table
export const medicines = pgTable("medicines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  dosageForm: text("dosage_form").notNull(), // tablet, capsule, syrup, etc.
  strength: text("strength"), // 500mg, 10ml, etc.
  manufacturer: text("manufacturer"),
  stock: integer("stock").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

// Prescriptions table
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId: varchar("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  medicineId: varchar("medicine_id").notNull().references(() => medicines.id, { onDelete: "cascade" }),
  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  dosage: text("dosage").notNull(),
  frequency: medicineFrequencyEnum("frequency").notNull(),
  instructions: text("instructions"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  totalDoses: integer("total_doses"),
  completedDoses: integer("completed_doses").notNull().default(0),
  status: prescriptionStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

// Medicine reminders table
export const medicineReminders = pgTable("medicine_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prescriptionId: varchar("prescription_id").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  takenAt: timestamp("taken_at"),
  skippedAt: timestamp("skipped_at"),
  isTaken: boolean("is_taken").notNull().default(false),
  isSkipped: boolean("is_skipped").notNull().default(false),
  smsReminderSent: boolean("sms_reminder_sent").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

// Doctor delay notifications table
export const delayNotifications = pgTable("delay_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  delayMinutes: integer("delay_minutes").notNull(),
  reason: text("reason"),
  affectedPatientsCount: integer("affected_patients_count").notNull().default(0),
  notificationsSent: integer("notifications_sent").notNull().default(0),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  resolvedAt: timestamp("resolved_at"),
});

// Home visits table
export const homeVisits = pgTable("home_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  doctorId: varchar("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  travelStartTime: timestamp("travel_start_time"),
  arrivalTime: timestamp("arrival_time"),
  departureTime: timestamp("departure_time"),
  travelEndTime: timestamp("travel_end_time"),
  distance: real("distance"), // in kilometers
  travelDuration: integer("travel_duration"), // in minutes
  visitNotes: text("visit_notes"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

// Medical history table
export const medicalHistory = pgTable("medical_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appointmentId: varchar("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  doctorId: varchar("doctor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  condition: text("condition").notNull(),
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  medications: jsonb("medications"),
  allergies: text("allergies"),
  vitalSigns: jsonb("vital_signs"), // blood pressure, heart rate, etc.
  labResults: jsonb("lab_results"),
  notes: text("notes"),
  recordDate: timestamp("record_date").notNull().default(sql`NOW()`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  authSessions: many(authSessions),
  staffVerifications: many(staffVerifications),
  patientAppointments: many(appointments, { relationName: "patient_appointments" }),
  doctorAppointments: many(appointments, { relationName: "doctor_appointments" }),
  patientQueueTokens: many(queueTokens, { relationName: "patient_queue_tokens" }),
  doctorQueueTokens: many(queueTokens, { relationName: "doctor_queue_tokens" }),
  patientPrescriptions: many(prescriptions, { relationName: "patient_prescriptions" }),
  doctorPrescriptions: many(prescriptions, { relationName: "doctor_prescriptions" }),
  delayNotifications: many(delayNotifications),
  patientHomeVisits: many(homeVisits, { relationName: "patient_home_visits" }),
  doctorHomeVisits: many(homeVisits, { relationName: "doctor_home_visits" }),
  medicalHistory: many(medicalHistory),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const staffVerificationsRelations = relations(staffVerifications, ({ one }) => ({
  staff: one(users, { fields: [staffVerifications.staffId], references: [users.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(users, { fields: [appointments.patientId], references: [users.id], relationName: "patient_appointments" }),
  doctor: one(users, { fields: [appointments.doctorId], references: [users.id], relationName: "doctor_appointments" }),
  queueTokens: many(queueTokens),
  prescriptions: many(prescriptions),
  homeVisits: many(homeVisits),
  medicalHistory: many(medicalHistory),
}));

export const queueTokensRelations = relations(queueTokens, ({ one }) => ({
  patient: one(users, { fields: [queueTokens.patientId], references: [users.id], relationName: "patient_queue_tokens" }),
  doctor: one(users, { fields: [queueTokens.doctorId], references: [users.id], relationName: "doctor_queue_tokens" }),
  appointment: one(appointments, { fields: [queueTokens.appointmentId], references: [appointments.id] }),
}));

export const medicinesRelations = relations(medicines, ({ many }) => ({
  prescriptions: many(prescriptions),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  patient: one(users, { fields: [prescriptions.patientId], references: [users.id], relationName: "patient_prescriptions" }),
  doctor: one(users, { fields: [prescriptions.doctorId], references: [users.id], relationName: "doctor_prescriptions" }),
  medicine: one(medicines, { fields: [prescriptions.medicineId], references: [medicines.id] }),
  appointment: one(appointments, { fields: [prescriptions.appointmentId], references: [appointments.id] }),
  reminders: many(medicineReminders),
}));

export const medicineRemindersRelations = relations(medicineReminders, ({ one }) => ({
  prescription: one(prescriptions, { fields: [medicineReminders.prescriptionId], references: [prescriptions.id] }),
}));

export const delayNotificationsRelations = relations(delayNotifications, ({ one }) => ({
  doctor: one(users, { fields: [delayNotifications.doctorId], references: [users.id] }),
}));

export const homeVisitsRelations = relations(homeVisits, ({ one }) => ({
  appointment: one(appointments, { fields: [homeVisits.appointmentId], references: [appointments.id] }),
  doctor: one(users, { fields: [homeVisits.doctorId], references: [users.id], relationName: "doctor_home_visits" }),
  patient: one(users, { fields: [homeVisits.patientId], references: [users.id], relationName: "patient_home_visits" }),
}));

export const medicalHistoryRelations = relations(medicalHistory, ({ one }) => ({
  patient: one(users, { fields: [medicalHistory.patientId], references: [users.id] }),
  doctor: one(users, { fields: [medicalHistory.doctorId], references: [users.id] }),
  appointment: one(appointments, { fields: [medicalHistory.appointmentId], references: [appointments.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOtpSessionSchema = createInsertSchema(otpSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({
  id: true,
  createdAt: true,
});

export const insertStaffVerificationSchema = createInsertSchema(staffVerifications).omit({
  id: true,
  checkedInAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQueueTokenSchema = createInsertSchema(queueTokens).omit({
  id: true,
  createdAt: true,
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({
  id: true,
  createdAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicineReminderSchema = createInsertSchema(medicineReminders).omit({
  id: true,
  createdAt: true,
});

export const insertDelayNotificationSchema = createInsertSchema(delayNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertHomeVisitSchema = createInsertSchema(homeVisits).omit({
  id: true,
  createdAt: true,
});

export const insertMedicalHistorySchema = createInsertSchema(medicalHistory).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type OtpSession = typeof otpSessions.$inferSelect;
export type InsertOtpSession = z.infer<typeof insertOtpSessionSchema>;
export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;
export type StaffVerification = typeof staffVerifications.$inferSelect;
export type InsertStaffVerification = z.infer<typeof insertStaffVerificationSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type QueueToken = typeof queueTokens.$inferSelect;
export type InsertQueueToken = z.infer<typeof insertQueueTokenSchema>;
export type Medicine = typeof medicines.$inferSelect;
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type MedicineReminder = typeof medicineReminders.$inferSelect;
export type InsertMedicineReminder = z.infer<typeof insertMedicineReminderSchema>;
export type DelayNotification = typeof delayNotifications.$inferSelect;
export type InsertDelayNotification = z.infer<typeof insertDelayNotificationSchema>;
export type HomeVisit = typeof homeVisits.$inferSelect;
export type InsertHomeVisit = z.infer<typeof insertHomeVisitSchema>;
export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type InsertMedicalHistory = z.infer<typeof insertMedicalHistorySchema>;
