import { supabase } from "@/lib/supabase";
import type {
  AcademyCertificate,
  AcademyCourse,
  AcademyCurriculumRow,
  AcademyEnrollment,
  AcademyLab,
  AcademyLang,
  AcademyLesson,
  AcademyLessonTranslation,
  AcademyModule,
  AcademyModuleTranslation,
  AcademyQuiz,
  AcademyTranslation,
  CapstonePayload,
} from "@/lib/academy-types";

export async function fetchPublishedCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return { courses: (data as AcademyCourse[]) || [], error: error?.message || null };
}

export async function fetchAllCoursesAdmin() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("updated_at", { ascending: false });
  return { courses: (data as AcademyCourse[]) || [], error: error?.message || null };
}

export async function fetchCourseBySlug(slug: string) {
  const { data, error } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  return { course: (data as AcademyCourse | null) || null, error: error?.message || null };
}

export async function fetchCourseTranslations(courseId: string) {
  const { data } = await supabase.from("course_translations").select("*").eq("course_id", courseId);
  return (data as AcademyTranslation[]) || [];
}

export async function fetchModules(courseId: string) {
  const { data } = await supabase
    .from("course_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  return (data as AcademyModule[]) || [];
}

export async function fetchModuleTranslations(moduleIds: string[]) {
  if (moduleIds.length === 0) return [];
  const { data } = await supabase.from("module_translations").select("*").in("module_id", moduleIds);
  return (data as AcademyModuleTranslation[]) || [];
}

export async function fetchCurriculum(courseId: string, language: AcademyLang) {
  const { data, error } = await supabase
    .from("academy_curriculum")
    .select("*")
    .eq("course_id", courseId)
    .eq("language", language)
    .order("module_sort", { ascending: true });
  return { rows: (data as AcademyCurriculumRow[]) || [], error: error?.message || null };
}

export async function fetchLessonsForModules(moduleIds: string[]) {
  if (moduleIds.length === 0) return [];
  const { data } = await supabase
    .from("lessons")
    .select("*")
    .in("module_id", moduleIds)
    .order("sort_order", { ascending: true });
  return (data as AcademyLesson[]) || [];
}

export async function fetchLessonBundle(lessonId: string, language: AcademyLang) {
  const { data: lesson, error } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (error || !lesson) return { lesson: null, translation: null, error: error?.message || "Lesson unavailable" };
  const { data: translation } = await supabase
    .from("lesson_translations")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("language", language)
    .maybeSingle();
  const fallback =
    translation ||
    (
      await supabase.from("lesson_translations").select("*").eq("lesson_id", lessonId).eq("language", "en").maybeSingle()
    ).data;
  return {
    lesson: lesson as AcademyLesson,
    translation: (fallback as AcademyLessonTranslation) || null,
    error: null as string | null,
  };
}

export async function enrollInCourse(courseId: string, pathId?: string | null) {
  const { data, error } = await supabase.rpc("academy_enroll", {
    p_course_id: courseId,
    p_path_id: pathId || null,
  });
  return { id: data as string | null, error: error?.message || null };
}

export async function fetchMyEnrollment(courseId: string, userId: string) {
  const { data } = await supabase
    .from("course_enrollments")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as AcademyEnrollment | null) || null;
}

export async function fetchMyEnrollments(userId: string) {
  const { data } = await supabase.from("course_enrollments").select("*").eq("user_id", userId);
  return (data as AcademyEnrollment[]) || [];
}

export async function fetchMyLessonProgress(courseId: string, userId: string) {
  const { data } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status, last_position")
    .eq("course_id", courseId)
    .eq("user_id", userId);
  return data || [];
}

export async function saveLessonProgress(lessonId: string, position = 0) {
  const { error } = await supabase.rpc("academy_save_lesson_progress", {
    p_lesson_id: lessonId,
    p_position: position,
  });
  return { error: error?.message || null };
}

export async function completeLesson(lessonId: string, position = 0) {
  const { data, error } = await supabase.rpc("academy_complete_lesson", {
    p_lesson_id: lessonId,
    p_position: position,
  });
  return { progress: (data as number) ?? 0, error: error?.message || null };
}

export async function fetchQuiz(quizId: string) {
  const { data, error } = await supabase.rpc("academy_get_quiz", { p_quiz_id: quizId });
  return { quiz: data, error: error?.message || null };
}

export async function submitQuiz(quizId: string, answers: Array<{ question_id: string; answer_id: string }>) {
  const { data, error } = await supabase.rpc("academy_submit_quiz", {
    p_quiz_id: quizId,
    p_answers: answers,
  });
  return { result: data, error: error?.message || null };
}

export async function fetchModuleQuiz(moduleId: string) {
  const { data } = await supabase
    .from("quizzes")
    .select("id, course_id, module_id, kind, pass_percent, status, title, title_ar")
    .eq("module_id", moduleId)
    .maybeSingle();
  return (data as AcademyQuiz | null) || null;
}

export async function fetchLabs(courseId: string) {
  const { data } = await supabase.from("lab_assignments").select("*").eq("course_id", courseId);
  return (data as AcademyLab[]) || [];
}

export async function submitLab(input: {
  assignment_id: string;
  course_id: string;
  user_id: string;
  notes: string;
  file_url?: string | null;
}) {
  const { error } = await supabase.from("lab_submissions").upsert(
    {
      assignment_id: input.assignment_id,
      course_id: input.course_id,
      user_id: input.user_id,
      notes: input.notes,
      file_url: input.file_url || null,
      status: "submitted",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "assignment_id,user_id" },
  );
  if (!error) await supabase.rpc("academy_recalc_progress", { p_course_id: input.course_id, p_user_id: input.user_id });
  return { error: error?.message || null };
}

export async function submitCapstone(input: {
  course_id: string;
  user_id: string;
  payload: CapstonePayload;
  file_url?: string | null;
}) {
  const { error } = await supabase.from("capstone_submissions").upsert(
    {
      course_id: input.course_id,
      user_id: input.user_id,
      payload: input.payload,
      file_url: input.file_url || null,
      status: "submitted",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "course_id,user_id" },
  );
  if (!error) await supabase.rpc("academy_recalc_progress", { p_course_id: input.course_id, p_user_id: input.user_id });
  return { error: error?.message || null };
}

export async function fetchCapstone(courseId: string, userId: string) {
  const { data } = await supabase
    .from("capstone_submissions")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function issueCertificate(courseId: string) {
  const { data, error } = await supabase.rpc("academy_issue_certificate", { p_course_id: courseId });
  return { certificate: (data as AcademyCertificate | null) || null, error: error?.message || null };
}

export async function verifyCertificate(code: string) {
  const { data, error } = await supabase.rpc("academy_verify_certificate", { p_code: code });
  return { result: data, error: error?.message || null };
}

export async function publishCourse(courseId: string, notes?: string) {
  const { data, error } = await supabase.rpc("academy_publish_course", {
    p_course_id: courseId,
    p_notes: notes || null,
  });
  return { version: data as number | null, error: error?.message || null };
}

export async function fetchComments(lessonId: string) {
  const { data } = await supabase
    .from("lesson_comments")
    .select("id, body, author_id, created_at")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true })
    .limit(50);
  return data || [];
}

export async function postComment(input: { lesson_id: string; course_id: string; author_id: string; body: string }) {
  const { error } = await supabase.from("lesson_comments").insert(input);
  return { error: error?.message || null };
}

export async function fetchCourseStats(courseId: string) {
  const [{ count: enrollments }, { data: rows }] = await Promise.all([
    supabase.from("course_enrollments").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    supabase.from("course_enrollments").select("status, progress_pct").eq("course_id", courseId),
  ]);
  const list = rows || [];
  const completed = list.filter((row) => row.status === "completed").length;
  const avg =
    list.length === 0 ? 0 : Math.round(list.reduce((sum, row) => sum + (row.progress_pct || 0), 0) / list.length);
  return { enrollments: enrollments || 0, completed, averageProgress: avg };
}

export function pickLocalized(
  language: string,
  en: string | null | undefined,
  ar?: string | null,
) {
  return language === "ar" && ar ? ar : en || ar || "";
}

export function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function uploadAcademyFile(path: string, file: File) {
  if (file.size > 20 * 1024 * 1024) {
    return { url: null, path: null, bucket: null, error: "File must be under 20MB" };
  }
  if (file.type && !ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return { url: null, path: null, bucket: null, error: "File type is not allowed" };
  }
  const { error } = await supabase.storage.from("academy").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) return { url: null, path: null, bucket: null, error: error.message };
  const { data, error: signedError } = await supabase.storage.from("academy").createSignedUrl(path, 60 * 15);
  return {
    url: data?.signedUrl || null,
    path,
    bucket: "academy",
    error: signedError?.message || null,
  };
}
