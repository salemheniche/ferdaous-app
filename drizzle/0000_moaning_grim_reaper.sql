CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'excused');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."group_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('available', 'occupied', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('waiting', 'active', 'withdrawn', 'graduated');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'teacher');--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer,
	"student_id" integer NOT NULL,
	"attendance_date" date NOT NULL,
	"status" "attendance_status" DEFAULT 'present' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"amount" varchar(20),
	"payment_date" date,
	"for_month" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"joined_date" date
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_number" varchar(50),
	"name" varchar(100) NOT NULL,
	"group_type" varchar(50),
	"room_id" integer,
	"capacity" integer,
	"status" "group_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "groups_group_number_unique" UNIQUE("group_number")
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"relation" varchar(50),
	"phone" varchar(20),
	"email" varchar(150),
	"address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"room_number" varchar(20),
	"floor" varchar(50),
	"capacity" integer,
	"status" "room_status" DEFAULT 'available' NOT NULL,
	"equipment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_of_week" varchar(20),
	"start_time" varchar(10),
	"end_time" varchar(10),
	"group_id" integer,
	"subject_id" integer,
	"teacher_id" integer,
	"room_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_number" varchar(50),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"gender" "gender",
	"birth_date" date,
	"birth_place" varchar(100),
	"address" text,
	"phone" varchar(20),
	"guardian_name" varchar(150),
	"guardian_id" integer,
	"avatar" varchar(255),
	"educational_level" varchar(100),
	"social_status" varchar(100),
	"enrollment_date" date,
	"withdrawal_date" date,
	"status" "student_status" DEFAULT 'waiting' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "students_student_number_unique" UNIQUE("student_number")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_code" varchar(20),
	"name" varchar(100) NOT NULL,
	"description" text,
	"weekly_sessions" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subjects_subject_code_unique" UNIQUE("subject_code")
);
--> statement-breakpoint
CREATE TABLE "teacher_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"subject_id" integer
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_number" varchar(50),
	"full_name" varchar(150) NOT NULL,
	"qualification" varchar(255),
	"phone" varchar(20),
	"email" varchar(150),
	"hire_date" date,
	"base_salary" varchar(20),
	"avatar" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "teachers_teacher_number_unique" UNIQUE("teacher_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"username" varchar(100) NOT NULL,
	"phone" varchar(20),
	"password" varchar(255) NOT NULL,
	"full_name" varchar(150),
	"email" varchar(150),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"teacher_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_groups" ADD CONSTRAINT "teacher_groups_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_groups" ADD CONSTRAINT "teacher_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_groups" ADD CONSTRAINT "teacher_groups_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;