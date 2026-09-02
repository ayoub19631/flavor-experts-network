export const PUBLICATION_TYPES = [
  "book",
  "original_research",
  "review_article",
  "technical_note",
  "industrial_case_study",
  "formulation_study",
  "sensory_study",
  "regulatory_update",
  "white_paper",
  "method_protocol",
] as const;

export type PublicationType = (typeof PUBLICATION_TYPES)[number];

export const PUBLICATION_STATUSES = [
  "draft",
  "submitted",
  "editorial_check",
  "under_review",
  "revision_required",
  "revised",
  "accepted",
  "scheduled",
  "published",
  "corrected",
  "retracted",
  "archived",
] as const;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_VISIBILITIES = ["public", "members", "private"] as const;
export type PublicationVisibility = (typeof PUBLICATION_VISIBILITIES)[number];

export const FILE_KINDS = [
  "cover",
  "full_pdf",
  "chapter_pdf",
  "supplementary",
  "dataset",
  "worksheet",
  "figure",
  "other",
] as const;
export type PublicationFileKind = (typeof FILE_KINDS)[number];

export const AUDIENCE_LEVELS = ["introductory", "intermediate", "advanced", "specialist"] as const;
export type AudienceLevel = (typeof AUDIENCE_LEVELS)[number];

export type ResearchSections = {
  introduction?: string;
  methods?: string;
  results?: string;
  discussion?: string;
  conclusion?: string;
  funding?: string;
  conflict_of_interest?: string;
  data_availability?: string;
  regulatory_scope?: string;
};

export type PublicationAuthor = {
  id: string;
  publication_id: string;
  profile_id?: string | null;
  full_name: string;
  affiliation?: string | null;
  country?: string | null;
  orcid?: string | null;
  email?: string | null;
  author_order: number;
  is_corresponding: boolean;
  contribution?: string | null;
};

export type PublicationCategory = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
};

export type PublicationFile = {
  id: string;
  publication_id: string;
  storage_path: string;
  bucket_name: string;
  kind: PublicationFileKind;
  mime_type?: string | null;
  file_size?: number | null;
  language?: "en" | "ar" | null;
  is_downloadable: boolean;
  visibility: PublicationVisibility;
  uploaded_by?: string | null;
  created_at: string;
};

export type PublicationReference = {
  id: string;
  publication_id: string;
  sort_order: number;
  citation_text?: string | null;
  title?: string | null;
  authors?: string | null;
  journal_or_publisher?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  url?: string | null;
};

export type BookChapter = {
  id: string;
  publication_id: string;
  slug: string;
  sort_order: number;
  status: "draft" | "review" | "published" | "archived";
  estimated_reading_minutes: number;
  title?: string | null;
  summary?: string | null;
  body?: string | null;
};

export type PublicationTranslation = {
  id?: string;
  publication_id: string;
  language: "en" | "ar";
  title: string;
  subtitle?: string | null;
  abstract?: string | null;
  description?: string | null;
  body?: string | null;
  sections?: ResearchSections;
  seo_title?: string | null;
  seo_description?: string | null;
  funding_statement?: string | null;
  conflict_of_interest?: string | null;
  data_availability?: string | null;
};

export type Publication = {
  id: string;
  type: PublicationType;
  slug: string;
  status: PublicationStatus;
  visibility: PublicationVisibility;
  primary_language: "en" | "ar";
  title: string;
  subtitle?: string | null;
  abstract?: string | null;
  description?: string | null;
  cover_image_path?: string | null;
  license?: string | null;
  doi?: string | null;
  isbn?: string | null;
  version_number: number;
  audience_level?: AudienceLevel | null;
  application_area?: string | null;
  regulatory_scope?: string | null;
  keywords: string[];
  is_featured: boolean;
  retraction_notice?: string | null;
  correction_notice?: string | null;
  created_by?: string | null;
  published_by?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  scheduled_at?: string | null;
  publication_authors?: PublicationAuthor[];
  publication_files?: PublicationFile[];
  publication_references?: PublicationReference[];
  publication_translations?: PublicationTranslation[];
  book_chapters?: BookChapter[];
  publication_category_map?: Array<{
    category_id: string;
    publication_categories?: PublicationCategory | PublicationCategory[] | null;
  }>;
};

export type PublicationVersion = {
  id: string;
  publication_id: string;
  version_number: number;
  status: string;
  change_notes?: string | null;
  snapshot_data: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  published_at?: string | null;
};

export type ReadingProgress = {
  id: string;
  user_id: string;
  publication_id: string;
  chapter_id?: string | null;
  progress_percent: number;
  last_position?: string | null;
  last_read_at: string;
};

export type PublicationBookmark = {
  id: string;
  user_id: string;
  publication_id: string;
  chapter_id?: string | null;
  position?: string | null;
  note?: string | null;
  created_at: string;
};

export type AccessContext = {
  userId?: string | null;
  isAdmin?: boolean;
  isEditor?: boolean;
  isAssignedReviewer?: boolean;
};

export type FileAccessContext = AccessContext & {
  isUploader?: boolean;
};
