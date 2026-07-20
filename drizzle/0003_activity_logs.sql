CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "users"("id") ON DELETE set null,
  "user_full_name" varchar(150),
  "user_role" varchar(20),
  "action" varchar(100) NOT NULL,
  "entity" varchar(50),
  "entity_id" integer,
  "description" text NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT now()
);
