import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  date,
  timestamp,
  boolean,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher', 'guardian'])
export const studentStatusEnum = pgEnum('student_status', ['waiting', 'active', 'withdrawn', 'graduated'])
export const genderEnum = pgEnum('gender', ['male', 'female'])
export const roomStatusEnum = pgEnum('room_status', ['available', 'occupied', 'maintenance'])
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late', 'excused'])
export const groupStatusEnum = pgEnum('group_status', ['open', 'closed'])

// Settings table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
})

// Users table (admin + teachers + guardians login)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  role: userRoleEnum('role').notNull().default('admin'),
  username: varchar('username', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 150 }),
  email: varchar('email', { length: 150 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  teacherId: integer('teacher_id'), // link to teachers table if role=teacher
  createdAt: timestamp('created_at').defaultNow(),
})

// Notifications (الإشعارات)
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  senderId: integer('sender_id').references(() => users.id, { onDelete: 'set null' }),
  targetType: varchar('target_type', { length: 20 }).notNull().default('all'), // all | teachers | guardians | specific
  targetIds: text('target_ids'), // JSON array of user IDs for specific targeting
  isReadBy: text('is_read_by').default('[]'), // JSON array of user IDs who read it
  createdAt: timestamp('created_at').defaultNow(),
})

// Rooms (القاعات)
export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  roomNumber: varchar('room_number', { length: 20 }),
  floor: varchar('floor', { length: 50 }),
  capacity: integer('capacity'),
  status: roomStatusEnum('status').notNull().default('available'),
  equipment: text('equipment'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Guardians (أولياء الأمور)
export const guardians = pgTable('guardians', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  relation: varchar('relation', { length: 50 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 150 }),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Students (الطلاب)
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  studentNumber: varchar('student_number', { length: 50 }).unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  gender: genderEnum('gender'),
  birthDate: date('birth_date'),
  birthPlace: varchar('birth_place', { length: 100 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  guardianName: varchar('guardian_name', { length: 150 }),
  guardianPhone: varchar('guardian_phone', { length: 20 }),
  guardianUserId: integer('guardian_user_id').references(() => users.id, { onDelete: 'set null' }),
  guardianId: integer('guardian_id').references(() => guardians.id, { onDelete: 'set null' }),
  avatar: varchar('avatar', { length: 255 }),
  educationalLevel: varchar('educational_level', { length: 100 }),
  socialStatus: varchar('social_status', { length: 100 }),
  enrollmentDate: date('enrollment_date'),
  withdrawalDate: date('withdrawal_date'),
  status: studentStatusEnum('status').notNull().default('waiting'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Teachers (المعلمون)
export const teachers = pgTable('teachers', {
  id: serial('id').primaryKey(),
  teacherNumber: varchar('teacher_number', { length: 50 }).unique(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  qualification: varchar('qualification', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 150 }),
  hireDate: date('hire_date'),
  baseSalary: varchar('base_salary', { length: 20 }),
  avatar: varchar('avatar', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  userId: integer('user_id'), // linked user account
  createdAt: timestamp('created_at').defaultNow(),
})

// Subjects (المواد)
export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  subjectCode: varchar('subject_code', { length: 20 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  weeklySessions: integer('weekly_sessions').default(1),
  createdAt: timestamp('created_at').defaultNow(),
})

// Groups / Fossets (الأفواج)
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  groupNumber: varchar('group_number', { length: 50 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  groupType: varchar('group_type', { length: 50 }),
  roomId: integer('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  capacity: integer('capacity'),
  status: groupStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Group Students (ربط الطلاب بالأفواج)
export const groupStudents = pgTable('group_students', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  joinedDate: date('joined_date'),
})

// Schedules (الجداول الدراسية)
export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  dayOfWeek: varchar('day_of_week', { length: 20 }),
  startTime: varchar('start_time', { length: 10 }),
  endTime: varchar('end_time', { length: 10 }),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }),
  roomId: integer('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
})

// Attendances (الحضور والغياب)
export const attendances = pgTable('attendances', {
  id: serial('id').primaryKey(),
  scheduleId: integer('schedule_id').references(() => schedules.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  attendanceDate: date('attendance_date').notNull(),
  status: attendanceStatusEnum('status').notNull().default('present'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Fee payments (الرسوم المالية)
export const feePayments = pgTable('fee_payments', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id, { onDelete: 'cascade' }),
  amount: varchar('amount', { length: 20 }),
  paymentDate: date('payment_date'),
  forMonth: varchar('for_month', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Teacher-Group assignments
export const teacherGroups = pgTable('teacher_groups', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
})

// Relations
export const studentsRelations = relations(students, ({ one, many }) => ({
  guardian: one(guardians, { fields: [students.guardianId], references: [guardians.id] }),
  groupStudents: many(groupStudents),
  attendances: many(attendances),
  feePayments: many(feePayments),
}))

export const groupsRelations = relations(groups, ({ one, many }) => ({
  room: one(rooms, { fields: [groups.roomId], references: [rooms.id] }),
  groupStudents: many(groupStudents),
  schedules: many(schedules),
  teacherGroups: many(teacherGroups),
}))

export const groupStudentsRelations = relations(groupStudents, ({ one }) => ({
  group: one(groups, { fields: [groupStudents.groupId], references: [groups.id] }),
  student: one(students, { fields: [groupStudents.studentId], references: [students.id] }),
}))

export const teachersRelations = relations(teachers, ({ many }) => ({
  schedules: many(schedules),
  teacherGroups: many(teacherGroups),
}))

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  group: one(groups, { fields: [schedules.groupId], references: [groups.id] }),
  subject: one(subjects, { fields: [schedules.subjectId], references: [subjects.id] }),
  teacher: one(teachers, { fields: [schedules.teacherId], references: [teachers.id] }),
  room: one(rooms, { fields: [schedules.roomId], references: [rooms.id] }),
  attendances: many(attendances),
}))

export const attendancesRelations = relations(attendances, ({ one }) => ({
  student: one(students, { fields: [attendances.studentId], references: [students.id] }),
  schedule: one(schedules, { fields: [attendances.scheduleId], references: [schedules.id] }),
}))

export const teacherGroupsRelations = relations(teacherGroups, ({ one }) => ({
  teacher: one(teachers, { fields: [teacherGroups.teacherId], references: [teachers.id] }),
  group: one(groups, { fields: [teacherGroups.groupId], references: [groups.id] }),
  subject: one(subjects, { fields: [teacherGroups.subjectId], references: [subjects.id] }),
}))

// Expenses (المصروفات)
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  category: varchar('category', { length: 100 }),
  amount: varchar('amount', { length: 20 }),
  expenseDate: date('expense_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Donations (التبرعات)
export const donations = pgTable('donations', {
  id: serial('id').primaryKey(),
  donorName: varchar('donor_name', { length: 150 }),
  amount: varchar('amount', { length: 20 }),
  donationDate: date('donation_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Salary payments (رواتب المعلمين)
export const salaryPayments = pgTable('salary_payments', {
  id: serial('id').primaryKey(),
  teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }),
  forMonth: varchar('for_month', { length: 20 }),
  baseSalary: varchar('base_salary', { length: 20 }),
  bonus: varchar('bonus', { length: 20 }).default('0'),
  deduction: varchar('deduction', { length: 20 }).default('0'),
  netSalary: varchar('net_salary', { length: 20 }),
  paymentDate: date('payment_date'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Push subscriptions (اشتراكات الإشعارات)
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Activity Logs (سجل العمليات)
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userFullName: varchar('user_full_name', { length: 150 }),
  userRole: varchar('user_role', { length: 20 }),
  action: varchar('action', { length: 100 }).notNull(), // create | update | delete | login | logout | attendance | notification
  entity: varchar('entity', { length: 50 }),  // student | teacher | group | attendance | notification | user
  entityId: integer('entity_id'),
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON extra info
  createdAt: timestamp('created_at').defaultNow(),
})
