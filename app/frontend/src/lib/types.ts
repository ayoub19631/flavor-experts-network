// ─── Shared Application Types ────────────────────────────────────────────────
// Single source of truth for all shared interfaces across the app.

export type SubscriptionTier = "free" | "professional" | "enterprise";

export interface ProfileEducation {
  school: string;
  degree?: string;
  year?: string;
}

export interface ProfileWorkExperience {
  title: string;
  company?: string;
  period?: string;
  description?: string;
}

export interface ProfileProject {
  name: string;
  description?: string;
  url?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  cover_url?: string | null;
  subscription_tier: SubscriptionTier;
  subscription_active: boolean;
  is_admin: boolean;
  platform_preview_access?: boolean;
  // Extended professional profile fields (v3)
  role?: string;
  company?: string;
  location?: string;
  bio?: string;
  account_type?: "individual" | "company";
  linkedin_url?: string;
  website_url?: string;
  phone?: string;
  specialty?: string | null;
  years_experience?: number | null;
  skills?: string[] | null;
  education?: ProfileEducation[] | null;
  work_experience?: ProfileWorkExperience[] | null;
  projects?: ProfileProject[] | null;
  is_verified?: boolean;
  is_active?: boolean;
  last_seen?: string | null;
  created_at: string;
  updated_at?: string;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
  country?: string | null;
  preferred_language?: string | null;
  is_test_account?: boolean;
  verification_type?: string | null;
  verified_at?: string | null;
  adult_confirmed_at?: string | null;
}

export interface Member {
  id: string;
  full_name: string;
  email?: string | null; // admin-only column — not present in public member_directory
  role: string;
  specialty: string | null;
  linkedin_url: string | null;
  joined_at: string;
  avatar_url: string | null;
  cover_url?: string | null;
  is_featured: boolean;
  title?: string;
  company?: string;
  location?: string;
  bio?: string;
  member_type?: "individual" | "company" | "expert";
  years_experience?: number;
  website?: string;
  profile_id?: string | null;
  skills?: string[] | null;
  education?: ProfileEducation[] | null;
  work_experience?: ProfileWorkExperience[] | null;
  projects?: ProfileProject[] | null;
}

export interface IndustryNews {
  id: string;
  title: string;
  content: string | null;
  summary: string | null;
  category: string;
  image_url: string | null;
  source_url: string | null;
  author: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface EducationalResource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  link: string | null;
  category: string;
  image_url: string | null;
  premium: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  created_at: string;
}

export interface EnterpriseRequest {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  services_interested: string | null;
  message: string | null;
  status: "new" | "contacted" | "converted" | "rejected";
  user_id?: string | null;
  company_size?: string;
  industry?: string;
  website?: string;
  contact_phone?: string;
  logo_url?: string;
  updated_at?: string;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  description: string | null;
  is_featured: boolean;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string | null;
  status: "pending" | "active" | "unsubscribed";
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ForumCategory {
  id: string;
  name: string;
  name_ar?: string | null;
  slug: string;
  description: string | null;
  description_ar?: string | null;
  sort_order: number;
  is_published: boolean;
}

export interface ForumAuthor {
  full_name: string;
  avatar_url: string | null;
}

export interface ForumTopic {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
  author?: ForumAuthor;
}

export interface ForumReply {
  id: string;
  topic_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: ForumAuthor;
}

export interface ConsultationRequest {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  topic: string;
  preferred_date?: string | null;
  message: string;
  status: string;
  created_at: string;
}

export interface Course {
  id: string;
  slug?: string | null;
  title: string;
  title_ar?: string | null;
  description: string;
  description_ar?: string | null;
  level: string;
  duration_hours: number;
  estimated_minutes?: number | null;
  image_url: string | null;
  is_published: boolean;
  premium: boolean;
  status?: "draft" | "review" | "published" | "archived";
  primary_language?: string;
  has_capstone?: boolean;
  version_number?: number;
  created_at: string;
}

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  level: string;
  image_url?: string | null;
  sort_order: number;
  is_published: boolean;
}

export type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface MemberConnection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  message?: string | null;
  created_at: string;
}

export type EmploymentType = "full_time" | "part_time" | "contract" | "remote" | "internship";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";

export interface JobListing {
  id: string;
  company_id: string;
  title: string;
  title_ar?: string | null;
  description: string;
  description_ar?: string | null;
  company_name: string;
  location?: string | null;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  salary_range?: string | null;
  apply_url?: string | null;
  skills?: string[] | null;
  is_published: boolean;
  status: "open" | "closed" | "draft" | "pending_review" | "published" | "paused" | "expired" | "rejected";
  slug?: string | null;
  workplace_type?: "on_site" | "hybrid" | "remote" | null;
  created_at: string;
  updated_at?: string;
  expires_at?: string | null;
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter?: string | null;
  resume_url?: string | null;
  status: "submitted" | "reviewed" | "rejected" | "accepted" | "reviewing" | "shortlisted" | "interview" | "offered" | "hired" | "withdrawn";
  resume_path?: string | null;
  resume_bucket?: string | null;
  created_at: string;
}

export type ReactionType = "like" | "celebrate" | "support" | "insightful" | "curious";

export interface SocialPost {
  id: string;
  author_id: string;
  body: string;
  image_url?: string | null;
  is_published: boolean;
  is_hidden: boolean;
  comments_disabled?: boolean;
  likes_count: number;
  comments_count?: number;
  repost_of_id?: string | null;
  created_at: string;
  updated_at?: string;
  author?: ForumAuthor & {
    role?: string | null;
    company?: string | null;
    account_type?: string | null;
    member_id?: string | null;
  };
  liked_by_me?: boolean;
  my_reaction?: ReactionType | null;
  original?: SocialPost | null;
}

export interface SocialPostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_comment_id?: string | null;
  is_hidden?: boolean;
  created_at: string;
  updated_at?: string;
  author?: ForumAuthor;
}
