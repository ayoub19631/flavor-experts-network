-- Generated schema-only stand-in of Production public tables, excluding Phase 6 publication objects.
-- Local/CI fresh-db only. Not a Production migration. Includes PKs/uniques needed by ON CONFLICT.

CREATE TABLE IF NOT EXISTS public."account_deletion_requests" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "reason" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."analytics_events" (
  "id" uuid NOT NULL,
  "user_id" uuid,
  "event_name" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "metadata" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."audit_logs" (
  "id" uuid NOT NULL,
  "actor_id" uuid,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "old_values" jsonb,
  "new_values" jsonb,
  "reason" text,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."author_profiles" (
  "id" uuid NOT NULL,
  "full_name" text,
  "avatar_url" text,
  "role" text,
  "company" text,
  "account_type" text,
  "is_active" boolean NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."capstone_submissions" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "payload" jsonb NOT NULL,
  "file_url" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("course_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."comment_mentions" (
  "comment_id" uuid NOT NULL,
  "mentioned_user_id" uuid NOT NULL,
  PRIMARY KEY ("comment_id", "mentioned_user_id")
);

CREATE TABLE IF NOT EXISTS public."company_invitations" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "status" text NOT NULL,
  "invited_by" uuid,
  "created_at" timestamptz NOT NULL,
  "invited_user_id" uuid,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."company_members" (
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("company_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."consultation_bookings" (
  "id" uuid NOT NULL,
  "expert_id" uuid NOT NULL,
  "requester_id" uuid NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "timezone" text NOT NULL,
  "status" text NOT NULL,
  "meeting_url" text,
  "private_notes" text,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."consultation_experts" (
  "user_id" uuid NOT NULL,
  "topics" text[] NOT NULL,
  "duration_minutes" integer NOT NULL,
  "timezone" text NOT NULL,
  "is_published" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "headline" text,
  PRIMARY KEY ("user_id")
);

CREATE TABLE IF NOT EXISTS public."consultation_requests" (
  "id" uuid NOT NULL,
  "user_id" uuid,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "topic" text NOT NULL,
  "preferred_date" text,
  "message" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "deletion_reason" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."contact_messages" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "subject" text,
  "message" text NOT NULL,
  "status" text,
  "created_at" timestamptz NOT NULL,
  "admin_reply" text,
  "replied_at" timestamptz,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."content_reports" (
  "id" uuid NOT NULL,
  "reporter_id" uuid NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "reason" text NOT NULL,
  "details" text,
  "status" text NOT NULL,
  "assigned_to" uuid,
  "resolution" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "priority" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."conversation_members" (
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "last_read_at" timestamptz,
  PRIMARY KEY ("conversation_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."conversation_messages" (
  "id" uuid NOT NULL,
  "conversation_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."conversation_preferences" (
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "archived" boolean NOT NULL,
  "muted" boolean NOT NULL,
  PRIMARY KEY ("conversation_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."conversation_reads" (
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "last_read_at" timestamptz NOT NULL,
  PRIMARY KEY ("conversation_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."conversations" (
  "id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."course_certificates" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "verification_code" text NOT NULL,
  "recipient_name" text NOT NULL,
  "course_title" text NOT NULL,
  "issued_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("course_id", "user_id"),
  UNIQUE ("verification_code")
);

CREATE TABLE IF NOT EXISTS public."course_enrollments" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "path_id" uuid,
  "status" text NOT NULL,
  "progress_pct" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "last_lesson_id" uuid,
  "completed_at" timestamptz,
  PRIMARY KEY ("id"),
  UNIQUE ("user_id", "course_id")
);

CREATE TABLE IF NOT EXISTS public."course_instructors" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("course_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."course_modules" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "sort_order" integer NOT NULL,
  "status" text NOT NULL,
  "estimated_minutes" integer NOT NULL,
  "has_lab" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."course_translations" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "language" text NOT NULL,
  "title" text NOT NULL,
  "subtitle" text,
  "description" text,
  "outcomes" text,
  "audience" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id"),
  UNIQUE ("course_id", "language")
);

CREATE TABLE IF NOT EXISTS public."course_versions" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "status" text NOT NULL,
  "notes" text,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id"),
  UNIQUE ("course_id", "version_number")
);

CREATE TABLE IF NOT EXISTS public."courses" (
  "id" uuid NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "description" text,
  "description_ar" text,
  "level" text,
  "duration_hours" numeric,
  "image_url" text,
  "is_published" boolean NOT NULL,
  "premium" boolean NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "slug" text,
  "status" text NOT NULL,
  "version_number" integer NOT NULL,
  "instructor_id" uuid,
  "estimated_minutes" integer,
  "primary_language" text NOT NULL,
  "has_capstone" boolean NOT NULL,
  "published_at" timestamptz,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id"),
  UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS public."educational_resources" (
  "id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "type" text,
  "link" text,
  "category" text,
  "image_url" text,
  "created_at" timestamptz NOT NULL,
  "premium" boolean NOT NULL,
  "is_published" boolean NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "deletion_reason" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."email_logs" (
  "id" uuid NOT NULL,
  "email_type" text NOT NULL,
  "recipient" text NOT NULL,
  "subject" text,
  "resend_id" text,
  "status" text NOT NULL,
  "meta" jsonb,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."enterprise_requests" (
  "id" uuid NOT NULL,
  "company_name" text NOT NULL,
  "contact_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "services_interested" text,
  "message" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "user_id" uuid,
  "company_size" text,
  "industry" text,
  "website" text,
  "contact_phone" text,
  "logo_url" text,
  "updated_at" timestamptz,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "deletion_reason" text,
  "lead_status" text NOT NULL,
  "assigned_admin" uuid,
  "priority" text NOT NULL,
  "internal_notes" text,
  "follow_up_at" timestamptz,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."event_registrations" (
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("event_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."events" (
  "id" uuid NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "event_type" text NOT NULL,
  "organizer" text,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "timezone" text NOT NULL,
  "mode" text NOT NULL,
  "location" text,
  "registration_url" text,
  "capacity" integer,
  "language" text NOT NULL,
  "cover_path" text,
  "status" text NOT NULL,
  "recording_url" text,
  "created_by" uuid,
  "created_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  PRIMARY KEY ("id"),
  UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS public."followed_topics" (
  "user_id" uuid NOT NULL,
  "topic" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("user_id", "topic")
);

CREATE TABLE IF NOT EXISTS public."forum_categories" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "name_ar" text,
  "slug" text NOT NULL,
  "description" text,
  "description_ar" text,
  "sort_order" integer NOT NULL,
  "is_published" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS public."forum_replies" (
  "id" uuid NOT NULL,
  "topic_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "deletion_reason" text,
  "is_accepted" boolean NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."forum_reply_mentions" (
  "reply_id" uuid NOT NULL,
  "mentioned_user_id" uuid NOT NULL,
  PRIMARY KEY ("reply_id", "mentioned_user_id")
);

CREATE TABLE IF NOT EXISTS public."forum_topic_mentions" (
  "topic_id" uuid NOT NULL,
  "mentioned_user_id" uuid NOT NULL,
  PRIMARY KEY ("topic_id", "mentioned_user_id")
);

CREATE TABLE IF NOT EXISTS public."forum_topics" (
  "id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "is_pinned" boolean NOT NULL,
  "is_locked" boolean NOT NULL,
  "reply_count" integer NOT NULL,
  "last_reply_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "deletion_reason" text,
  "tags" text[] NOT NULL,
  "is_solved" boolean NOT NULL,
  "accepted_reply_id" uuid,
  "search_vector" tsvector,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."forum_watches" (
  "topic_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  PRIMARY KEY ("topic_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."industry_news" (
  "id" uuid NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "summary" text,
  "category" text,
  "image_url" text,
  "source_url" text,
  "published_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "author" text,
  "is_published" boolean NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "external_id" text,
  "ingestion_source" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."job_alerts" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "query" text,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."job_applications" (
  "id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "applicant_id" uuid NOT NULL,
  "cover_letter" text,
  "resume_url" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "resume_path" text,
  "resume_bucket" text,
  "company_notes" text,
  "withdrawn_at" timestamptz,
  PRIMARY KEY ("id"),
  UNIQUE ("job_id", "applicant_id")
);

CREATE TABLE IF NOT EXISTS public."job_listings" (
  "id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "description" text NOT NULL,
  "description_ar" text,
  "company_name" text NOT NULL,
  "location" text,
  "employment_type" text NOT NULL,
  "experience_level" text NOT NULL,
  "salary_range" text,
  "apply_url" text,
  "skills" text[],
  "is_published" boolean NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "expires_at" timestamptz,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "deletion_reason" text,
  "search_vector" tsvector,
  "slug" text,
  "workplace_type" text,
  "country" text,
  "city" text,
  "salary_min" numeric,
  "salary_max" numeric,
  "salary_currency" text,
  "salary_period" text,
  "application_deadline" timestamptz,
  "published_at" timestamptz,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."lab_assignments" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "module_id" uuid,
  "title" text NOT NULL,
  "title_ar" text,
  "brief" text,
  "brief_ar" text,
  "worksheet_url" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."lab_submissions" (
  "id" uuid NOT NULL,
  "assignment_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "notes" text,
  "file_url" text,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("assignment_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."learning_path_courses" (
  "path_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "sort_order" integer NOT NULL,
  PRIMARY KEY ("path_id", "course_id")
);

CREATE TABLE IF NOT EXISTS public."learning_paths" (
  "id" uuid NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "description" text,
  "description_ar" text,
  "level" text NOT NULL,
  "image_url" text,
  "sort_order" integer NOT NULL,
  "is_published" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "status" text NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id"),
  UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS public."lesson_comments" (
  "id" uuid NOT NULL,
  "lesson_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."lesson_progress" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "lesson_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "status" text NOT NULL,
  "last_position" integer NOT NULL,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("user_id", "lesson_id")
);

CREATE TABLE IF NOT EXISTS public."lesson_resources" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "lesson_id" uuid,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "file_url" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "storage_path" text,
  "bucket_name" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."lesson_translations" (
  "id" uuid NOT NULL,
  "lesson_id" uuid NOT NULL,
  "language" text NOT NULL,
  "title" text NOT NULL,
  "objective" text,
  "body" text,
  "worked_example" text,
  "knowledge_check" jsonb,
  "summary" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id"),
  UNIQUE ("lesson_id", "language")
);

CREATE TABLE IF NOT EXISTS public."lessons" (
  "id" uuid NOT NULL,
  "module_id" uuid NOT NULL,
  "sort_order" integer NOT NULL,
  "status" text NOT NULL,
  "estimated_minutes" integer NOT NULL,
  "has_lab" boolean NOT NULL,
  "has_quiz" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."market_briefings" (
  "id" uuid NOT NULL,
  "briefing_date" date NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "summary" text NOT NULL,
  "summary_ar" text,
  "body_en" text NOT NULL,
  "body_ar" text,
  "highlights" jsonb NOT NULL,
  "sources" jsonb NOT NULL,
  "commodities" jsonb NOT NULL,
  "is_published" boolean NOT NULL,
  "generated_by" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("briefing_date")
);

CREATE TABLE IF NOT EXISTS public."market_materials" (
  "id" uuid NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "category" text,
  "unit" text,
  PRIMARY KEY ("id"),
  UNIQUE ("slug")
);

CREATE TABLE IF NOT EXISTS public."market_price_points" (
  "id" uuid NOT NULL,
  "material_id" uuid NOT NULL,
  "source_id" uuid,
  "country" text,
  "currency" text,
  "unit" text,
  "price_min" numeric,
  "price_max" numeric,
  "price_ref" numeric,
  "observation_date" date,
  "published_at" timestamptz,
  "reliability" text NOT NULL,
  "notes" text,
  "is_published" boolean NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."market_sources" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "url" text,
  "reliability" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."market_watchlists" (
  "user_id" uuid NOT NULL,
  "material_id" uuid NOT NULL,
  PRIMARY KEY ("user_id", "material_id")
);

CREATE TABLE IF NOT EXISTS public."member_blocks" (
  "blocker_id" uuid NOT NULL,
  "blocked_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("blocker_id", "blocked_id")
);

CREATE TABLE IF NOT EXISTS public."member_connections" (
  "id" uuid NOT NULL,
  "requester_id" uuid NOT NULL,
  "addressee_id" uuid NOT NULL,
  "status" text NOT NULL,
  "message" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("requester_id", "addressee_id")
);

CREATE TABLE IF NOT EXISTS public."member_directory_data" (
  "id" uuid NOT NULL,
  "full_name" text,
  "role" text,
  "specialty" text,
  "linkedin_url" text,
  "joined_at" timestamptz,
  "avatar_url" text,
  "cover_url" text,
  "is_featured" boolean NOT NULL,
  "title" text,
  "company" text,
  "location" text,
  "bio" text,
  "member_type" text,
  "years_experience" integer,
  "website" text,
  "profile_id" uuid,
  "skills" text[] NOT NULL,
  "education" jsonb NOT NULL,
  "work_experience" jsonb NOT NULL,
  "projects" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."member_follows" (
  "follower_id" uuid NOT NULL,
  "following_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("follower_id", "following_id")
);

CREATE TABLE IF NOT EXISTS public."member_mutes" (
  "muter_id" uuid NOT NULL,
  "muted_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("muter_id", "muted_id")
);

CREATE TABLE IF NOT EXISTS public."member_recommendations" (
  "id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "relationship" text NOT NULL,
  "body" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."members" (
  "id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "email" text,
  "role" text,
  "specialty" text,
  "linkedin_url" text,
  "joined_at" timestamptz NOT NULL,
  "avatar_url" text,
  "is_featured" boolean,
  "title" text,
  "company" text,
  "location" text,
  "bio" text,
  "member_type" text,
  "years_experience" integer,
  "website" text,
  "profile_id" uuid,
  "cover_url" text,
  "skills" text[],
  "education" jsonb,
  "work_experience" jsonb,
  "projects" jsonb,
  PRIMARY KEY ("id"),
  UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS public."message_attachments" (
  "id" uuid NOT NULL,
  "message_id" uuid NOT NULL,
  "storage_path" text NOT NULL,
  "bucket_name" text NOT NULL,
  "mime_type" text,
  "file_size" bigint,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."moderation_actions" (
  "id" uuid NOT NULL,
  "actor_id" uuid,
  "report_id" uuid,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "action" text NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."module_translations" (
  "id" uuid NOT NULL,
  "module_id" uuid NOT NULL,
  "language" text NOT NULL,
  "title" text NOT NULL,
  "objective" text,
  "summary" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id"),
  UNIQUE ("module_id", "language")
);

CREATE TABLE IF NOT EXISTS public."newsletter_subscribers" (
  "id" uuid NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "status" text NOT NULL,
  "source" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS public."notification_deliveries" (
  "id" uuid NOT NULL,
  "notification_id" uuid,
  "channel" text NOT NULL,
  "status" text NOT NULL,
  "error" text,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."notification_preferences" (
  "user_id" uuid NOT NULL,
  "in_app" boolean NOT NULL,
  "email" boolean NOT NULL,
  "digest" text NOT NULL,
  "types" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("user_id")
);

CREATE TABLE IF NOT EXISTS public."notifications" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "type" text NOT NULL,
  "link" text,
  "is_read" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "actor_id" uuid,
  "entity_type" text,
  "entity_id" text,
  "metadata" jsonb NOT NULL,
  "idempotency_key" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."partners" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "logo_url" text,
  "website_url" text,
  "description" text,
  "is_featured" boolean NOT NULL,
  "sort_order" integer NOT NULL,
  "is_published" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."platform_roles" (
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "granted_by" uuid,
  "granted_at" timestamptz NOT NULL,
  PRIMARY KEY ("user_id", "role")
);

CREATE TABLE IF NOT EXISTS public."poll_options" (
  "id" uuid NOT NULL,
  "poll_id" uuid NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."poll_votes" (
  "poll_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("poll_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."polls" (
  "id" uuid NOT NULL,
  "post_id" uuid NOT NULL,
  "question" text NOT NULL,
  "closes_at" timestamptz,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("post_id")
);

CREATE TABLE IF NOT EXISTS public."post_media" (
  "id" uuid NOT NULL,
  "post_id" uuid NOT NULL,
  "storage_path" text NOT NULL,
  "bucket_name" text NOT NULL,
  "mime_type" text,
  "sort_order" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."post_mentions" (
  "post_id" uuid NOT NULL,
  "mentioned_user_id" uuid NOT NULL,
  PRIMARY KEY ("post_id", "mentioned_user_id")
);

CREATE TABLE IF NOT EXISTS public."profile_views" (
  "id" uuid NOT NULL,
  "viewer_id" uuid,
  "viewed_profile_id" uuid NOT NULL,
  "viewed_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."quiz_answers" (
  "id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "sort_order" integer NOT NULL,
  "body" text NOT NULL,
  "body_ar" text,
  "is_correct" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."quiz_attempts" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "quiz_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "answers" jsonb NOT NULL,
  "score_percent" integer NOT NULL,
  "passed" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."quiz_questions" (
  "id" uuid NOT NULL,
  "quiz_id" uuid NOT NULL,
  "sort_order" integer NOT NULL,
  "prompt" text NOT NULL,
  "prompt_ar" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."quizzes" (
  "id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "module_id" uuid,
  "kind" text NOT NULL,
  "pass_percent" integer NOT NULL,
  "status" text NOT NULL,
  "title" text,
  "title_ar" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."resource_secure_links" (
  "resource_id" uuid NOT NULL,
  "url" text NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("resource_id")
);

CREATE TABLE IF NOT EXISTS public."saved_jobs" (
  "user_id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("user_id", "job_id")
);

CREATE TABLE IF NOT EXISTS public."search_recents" (
  "user_id" uuid NOT NULL,
  "query" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("user_id", "query")
);

CREATE TABLE IF NOT EXISTS public."skill_endorsements" (
  "endorser_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "skill" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("endorser_id", "profile_id", "skill")
);

CREATE TABLE IF NOT EXISTS public."social_post_comments" (
  "id" uuid NOT NULL,
  "post_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "body" text NOT NULL,
  "is_hidden" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "parent_comment_id" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "deletion_reason" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."social_post_likes" (
  "post_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "reaction" text NOT NULL,
  PRIMARY KEY ("post_id", "user_id")
);

CREATE TABLE IF NOT EXISTS public."social_post_saves" (
  "user_id" uuid NOT NULL,
  "post_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("user_id", "post_id")
);

CREATE TABLE IF NOT EXISTS public."social_posts" (
  "id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "body" text NOT NULL,
  "image_url" text,
  "is_published" boolean NOT NULL,
  "is_hidden" boolean NOT NULL,
  "likes_count" integer NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "comments_count" integer NOT NULL,
  "repost_of_id" uuid,
  "comments_disabled" boolean NOT NULL,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "deletion_reason" text,
  "is_draft" boolean NOT NULL,
  "scheduled_at" timestamptz,
  "link_url" text,
  "link_title" text,
  "search_vector" tsvector,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."user_profiles" (
  "id" uuid NOT NULL,
  "email" text NOT NULL,
  "full_name" text NOT NULL,
  "avatar_url" text,
  "subscription_tier" text NOT NULL,
  "subscription_active" boolean NOT NULL,
  "is_admin" boolean NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "role" text,
  "company" text,
  "location" text,
  "bio" text,
  "account_type" text,
  "linkedin_url" text,
  "website_url" text,
  "phone" text,
  "is_verified" boolean,
  "is_active" boolean,
  "last_seen" timestamptz,
  "platform_preview_access" boolean NOT NULL,
  "email_opt_in" boolean NOT NULL,
  "welcome_email_sent" boolean NOT NULL,
  "marketing_opt_in" boolean NOT NULL,
  "cover_url" text,
  "specialty" text,
  "years_experience" integer,
  "skills" text[],
  "education" jsonb,
  "work_experience" jsonb,
  "projects" jsonb,
  "terms_accepted_at" timestamptz,
  "terms_version" text,
  "country" text,
  "preferred_language" text,
  "is_test_account" boolean NOT NULL,
  "verification_type" text,
  "verified_at" timestamptz,
  "adult_confirmed_at" timestamptz,
  "hide_from_directory" boolean NOT NULL,
  "open_to_work" boolean NOT NULL,
  "open_to_consulting" boolean NOT NULL,
  "available_for_peer_review" boolean NOT NULL,
  "orcid" text,
  "google_scholar_url" text,
  "researchgate_url" text,
  "profile_slug" text,
  "connection_privacy" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."verification_documents" (
  "id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "storage_path" text NOT NULL,
  "bucket_name" text NOT NULL,
  "mime_type" text,
  "uploaded_by" uuid,
  "created_at" timestamptz NOT NULL,
  "original_name" text,
  "file_size" bigint,
  "checksum" text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."verification_requests" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "status" text NOT NULL,
  "notes" text,
  "reviewer_id" uuid,
  "decision_reason" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "organization_name" text,
  "country" text,
  "website" text,
  "full_name" text,
  "attestation_accepted" boolean NOT NULL,
  "extra" jsonb NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."verification_review_actions" (
  "id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "actor_id" uuid,
  "action" text NOT NULL,
  "reason" text,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

