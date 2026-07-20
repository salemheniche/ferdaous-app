CREATE TABLE "donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"donor_name" varchar(150),
	"amount" varchar(20),
	"donation_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100),
	"amount" varchar(20),
	"expense_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_id" integer,
	"for_month" varchar(20),
	"base_salary" varchar(20),
	"bonus" varchar(20) DEFAULT '0',
	"deduction" varchar(20) DEFAULT '0',
	"net_salary" varchar(20),
	"payment_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;