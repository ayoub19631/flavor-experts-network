export type AcademyStatus = "draft" | "review" | "published" | "archived";
export type AcademyLang = "en" | "ar";
export type EnrollmentStatus = "enrolled" | "in_progress" | "completed";
export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export const ACADEMY_DISCLAIMER =
  "Teaching Prototype — For supervised R&D training and evaluation only.";

export const ACADEMY_DISCLAIMER_AR =
  "نموذج تعليمي — للتدريب والتقييم في البحث والتطوير تحت إشراف فقط.";

export const ACADEMY_REGULATORY_NOTE =
  "Verify food-grade status, supplier specifications, intended application, and applicable EU, USA, and India requirements before any non-training use. Teaching formulas are not commercially approved.";

export const ACADEMY_REGULATORY_NOTE_AR =
  "تحقق من صلاحية الدرجة الغذائية، ومواصفات المورّد، والاستخدام المقصود، ومتطلبات الاتحاد الأوروبي والولايات المتحدة والهند قبل أي استخدام خارج التدريب. الصيغ التعليمية ليست معتمدة تجارياً.";

export const CAPSTONE_FIELDS = [
  "sensory_brief",
  "formula",
  "materials",
  "weights",
  "preparation",
  "ppe_safety",
  "storage",
  "application_matrix",
  "coded_sensory",
  "revision",
  "regulatory_checklist",
  "recommendation",
  "limitations",
] as const;

export type CapstoneField = (typeof CAPSTONE_FIELDS)[number];

export type AcademyCourse = {
  id: string;
  slug: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  level: string;
  duration_hours: number;
  estimated_minutes?: number | null;
  image_url?: string | null;
  is_published: boolean;
  premium: boolean;
  status: AcademyStatus;
  primary_language: string;
  version_number: number;
  instructor_id?: string | null;
  has_capstone: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export type AcademyTranslation = {
  id: string;
  course_id: string;
  language: AcademyLang;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  outcomes?: string | null;
  audience?: string | null;
};

export type AcademyModule = {
  id: string;
  course_id: string;
  sort_order: number;
  status: AcademyStatus;
  estimated_minutes: number;
  has_lab: boolean;
};

export type AcademyModuleTranslation = {
  id: string;
  module_id: string;
  language: AcademyLang;
  title: string;
  objective?: string | null;
  summary?: string | null;
};

export type AcademyLesson = {
  id: string;
  module_id: string;
  sort_order: number;
  status: AcademyStatus;
  estimated_minutes: number;
  has_lab: boolean;
  has_quiz: boolean;
};

export type AcademyLessonTranslation = {
  id: string;
  lesson_id: string;
  language: AcademyLang;
  title: string;
  objective?: string | null;
  body?: string | null;
  worked_example?: string | null;
  knowledge_check?: KnowledgeCheck | null;
  summary?: string | null;
};

export type KnowledgeCheck = {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
};

export type AcademyCurriculumRow = {
  lesson_id: string;
  module_id: string;
  course_id: string;
  lesson_sort: number;
  module_sort: number;
  estimated_minutes: number;
  has_lab: boolean;
  language: AcademyLang;
  lesson_title: string;
  module_title: string;
};

export type AcademyEnrollment = {
  id: string;
  user_id: string;
  course_id: string;
  path_id?: string | null;
  status: EnrollmentStatus;
  progress_pct: number;
  last_lesson_id?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AcademyQuiz = {
  id: string;
  module_id?: string | null;
  course_id: string;
  kind: "module" | "final";
  pass_percent: number;
  status: AcademyStatus;
};

export type AcademyQuizQuestion = {
  id: string;
  quiz_id: string;
  sort_order: number;
  prompt: string;
  prompt_ar?: string | null;
};

export type AcademyQuizChoice = {
  id: string;
  question_id: string;
  sort_order: number;
  body: string;
  body_ar?: string | null;
};

export type AcademyResource = {
  id: string;
  lesson_id?: string | null;
  course_id: string;
  kind: "summary" | "worksheet" | "reading" | "other";
  title: string;
  title_ar?: string | null;
  file_url: string;
};

export type AcademyLab = {
  id: string;
  module_id?: string | null;
  course_id: string;
  title: string;
  title_ar?: string | null;
  brief?: string | null;
  brief_ar?: string | null;
  worksheet_url?: string | null;
};

export type AcademyCertificate = {
  id: string;
  course_id: string;
  user_id: string;
  verification_code: string;
  issued_at: string;
  recipient_name: string;
  course_title: string;
};

export type CapstonePayload = Record<CapstoneField, string>;

export function emptyCapstone(): CapstonePayload {
  return CAPSTONE_FIELDS.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {} as CapstonePayload);
}
