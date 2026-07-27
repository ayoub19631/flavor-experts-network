// ─── Shared Application Types ────────────────────────────────────────────────
// Single source of truth for all shared interfaces across the app.

export type SubscriptionTier = "free" | "professional" | "enterprise";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
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
  is_verified?: boolean;
  is_active?: boolean;
  last_seen?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Member {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  specialty: string | null;
  linkedin_url: string | null;
  joined_at: string;
  avatar_url: string | null;
  is_featured: boolean;
  title?: string;
  company?: string;
  location?: string;
  bio?: string;
  member_type?: "individual" | "company" | "expert";
  years_experience?: number;
  website?: string;
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
  title: string;
  title_ar?: string | null;
  description: string;
  description_ar?: string | null;
  level: string;
  duration_hours: number;
  image_url: string | null;
  is_published: boolean;
  premium: boolean;
  created_at: string;
}
