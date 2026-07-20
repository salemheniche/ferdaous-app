-- Add guardian role to user_role enum
ALTER TYPE "public"."user_role" ADD VALUE 'guardian';
--> statement-breakpoint

-- Add guardian_phone and guardian_user_id to students table
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "guardian_phone" varchar(20);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "guardian_user_id" integer;
--> statement-breakpoint

-- Update guardian_user_id FK after adding column
ALTER TABLE "students" ADD CONSTRAINT "students_guardian_user_id_users_id_fk"
  FOREIGN KEY ("guardian_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "sender_id" integer,
  "target_type" varchar(20) NOT NULL DEFAULT 'all',
  "target_ids" text,
  "is_read_by" text DEFAULT '[]',
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_users_id_fk"
  FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
