import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Plus, Upload } from "lucide-react";
import Navbar from "@/components/Navbar";
import SoftPageLoader from "@/components/SoftPageLoader";
import TeachingDisclaimer from "@/components/academy/TeachingDisclaimer";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  fetchCourseStats,
  fetchCourseTranslations,
  fetchLessonsForModules,
  fetchModuleTranslations,
  fetchModules,
  publishCourse,
  uploadAcademyFile,
} from "@/lib/academy";
import type { AcademyCourse, AcademyLang, AcademyLesson, AcademyLessonTranslation, AcademyModule } from "@/lib/academy-types";
import { toast } from "sonner";

function QuizBuilder({ courseId, modules }: { courseId: string; modules: AcademyModule[] }) {
  const [quizzes, setQuizzes] = useState<Array<{ id: string; title: string | null; module_id: string | null }>>([]);
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState("Correct answer\nWrong one\nWrong two");
  const [quizId, setQuizId] = useState<string>("");

  const load = async () => {
    const { data } = await supabase.from("quizzes").select("id, title, module_id").eq("course_id", courseId);
    setQuizzes(data || []);
    if (data?.[0] && !quizId) setQuizId(data[0].id);
  };
  useEffect(() => {
    load();
  }, [courseId]);

  const addQuestion = async () => {
    if (!quizId || !prompt.trim()) return;
    const { data: question } = await supabase
      .from("quiz_questions")
      .insert({ quiz_id: quizId, prompt: prompt.trim(), prompt_ar: prompt.trim(), sort_order: Date.now() % 1000 })
      .select("id")
      .single();
    if (!question) return;
    const lines = choices.split("\n").map((line) => line.trim()).filter(Boolean);
    const splitLine = (line: string) => {
      const [en, ar] = line.split("|").map((part) => part.trim());
      return { en, ar: ar || en };
    };
    await supabase.from("quiz_answers").insert(
      lines.map((line, index) => {
        const parts = splitLine(line);
        return {
          question_id: question.id,
          body: parts.en,
          body_ar: parts.ar,
          sort_order: index + 1,
          is_correct: index === 0,
        };
      }),
    );
    setPrompt("");
    toast.success("Question added. First line is the correct answer.");
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">First answer line is stored as the correct choice. Provide Arabic on the same line after a pipe if needed (EN | AR).</p>
      <select className="h-10 rounded-md border bg-background px-3 text-sm w-full" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
        {quizzes.map((quiz) => (
          <option key={quiz.id} value={quiz.id}>{quiz.title || quiz.id} {quiz.module_id ? "" : ""}</option>
        ))}
      </select>
      <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Question prompt" />
      <Textarea rows={4} value={choices} onChange={(e) => setChoices(e.target.value)} placeholder={"Correct answer\nDistractor"} />
      <Button onClick={addQuestion} disabled={!modules.length}>Add question</Button>
    </div>
  );
}

function ResourceUploader({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: AcademyLesson[];
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"summary" | "worksheet" | "reading" | "other">("summary");
  const [lessonId, setLessonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [resources, setResources] = useState<Array<{ id: string; title: string; kind: string }>>([]);

  const load = async () => {
    const { data } = await supabase
      .from("lesson_resources")
      .select("id, title, kind")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    setResources(data || []);
  };
  useEffect(() => {
    load();
  }, [courseId]);

  const upload = async (file: File | undefined) => {
    if (!file || !title.trim()) {
      toast.error("Title and file are required");
      return;
    }
    setBusy(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `resources/${courseId}/${kind}-${Date.now()}-${safeName}`;
    const uploaded = await uploadAcademyFile(path, file);
    if (uploaded.error || !uploaded.url) {
      setBusy(false);
      toast.error(uploaded.error || "Upload failed");
      return;
    }
    const { error } = await supabase.from("lesson_resources").insert({
      course_id: courseId,
      lesson_id: lessonId || null,
      kind,
      title: title.trim(),
      file_url: uploaded.url,
    });
    if (kind === "worksheet" && lessonId) {
      const lesson = lessons.find((item) => item.id === lessonId);
      if (lesson) {
        await supabase.from("lab_assignments").insert({
          course_id: courseId,
          module_id: lesson.module_id,
          title: title.trim(),
          worksheet_url: uploaded.url,
          brief: "Teaching Prototype — For supervised R&D training and evaluation only.",
          status: "draft",
        });
      }
    }
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Resource uploaded");
      setTitle("");
      load();
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        PDF, images, CSV, XLSX, or DOCX up to 20MB. Worksheets stay training-only.
      </p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" aria-label="Resource title" />
      <div className="grid sm:grid-cols-2 gap-2">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Resource kind">
          <option value="summary">Lesson summary</option>
          <option value="worksheet">Laboratory worksheet</option>
          <option value="reading">Reading</option>
          <option value="other">Other</option>
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={lessonId} onChange={(e) => setLessonId(e.target.value)} aria-label="Related lesson">
          <option value="">Course-level resource</option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>Lesson {lesson.sort_order}</option>
          ))}
        </select>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <Upload className="w-4 h-4" />
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.xlsx,.docx"
          disabled={busy}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </label>
      <ul className="text-sm space-y-1">
        {resources.map((resource) => (
          <li key={resource.id}>{resource.kind}: {resource.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AcademyBuilderPage() {
  const { courseId = "" } = useParams();
  const [params] = useSearchParams();
  const preview = params.get("preview") === "1";
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [en, setEn] = useState({ title: "", subtitle: "", description: "", outcomes: "", audience: "" });
  const [ar, setAr] = useState({ title: "", subtitle: "", description: "", outcomes: "", audience: "" });
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [moduleTitles, setModuleTitles] = useState<Record<string, { en: string; ar: string }>>({});
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [lessonEn, setLessonEn] = useState({ title: "", objective: "", body: "", worked_example: "", summary: "" });
  const [lessonAr, setLessonAr] = useState({ title: "", objective: "", body: "", worked_example: "", summary: "" });
  const [stats, setStats] = useState({ enrollments: 0, completed: 0, averageProgress: 0 });
  const [versions, setVersions] = useState<Array<{ id: string; version_number: number; status: string; notes?: string; created_at: string }>>([]);

  usePageMeta({ title: t("admin.academy.builder"), path: `/admin/academy/${courseId}`, noIndex: true });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
    if (!data) {
      setLoading(false);
      return;
    }
    setCourse(data as AcademyCourse);
    const translations = await fetchCourseTranslations(courseId);
    const enRow = translations.find((item) => item.language === "en");
    const arRow = translations.find((item) => item.language === "ar");
    setEn({
      title: enRow?.title || data.title || "",
      subtitle: enRow?.subtitle || "",
      description: enRow?.description || data.description || "",
      outcomes: enRow?.outcomes || "",
      audience: enRow?.audience || "",
    });
    setAr({
      title: arRow?.title || data.title_ar || "",
      subtitle: arRow?.subtitle || "",
      description: arRow?.description || data.description_ar || "",
      outcomes: arRow?.outcomes || "",
      audience: arRow?.audience || "",
    });
    const moduleRows = await fetchModules(courseId);
    setModules(moduleRows);
    const titles = await fetchModuleTranslations(moduleRows.map((item) => item.id));
    const titleMap: Record<string, { en: string; ar: string }> = {};
    titles.forEach((item) => {
      titleMap[item.module_id] = titleMap[item.module_id] || { en: "", ar: "" };
      titleMap[item.module_id][item.language as AcademyLang] = item.title;
    });
    setModuleTitles(titleMap);
    const lessonRows = await fetchLessonsForModules(moduleRows.map((item) => item.id));
    setLessons(lessonRows);
    const { data: versionRows } = await supabase
      .from("course_versions")
      .select("id, version_number, status, notes, created_at")
      .eq("course_id", courseId)
      .order("version_number", { ascending: false });
    setVersions(versionRows || []);
    setStats(await fetchCourseStats(courseId));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [courseId]);

  useEffect(() => {
    if (!selectedLesson) return;
    (async () => {
      const { data } = await supabase.from("lesson_translations").select("*").eq("lesson_id", selectedLesson);
      const rows = (data as AcademyLessonTranslation[]) || [];
      const enRow = rows.find((item) => item.language === "en");
      const arRow = rows.find((item) => item.language === "ar");
      setLessonEn({
        title: enRow?.title || "",
        objective: enRow?.objective || "",
        body: enRow?.body || "",
        worked_example: enRow?.worked_example || "",
        summary: enRow?.summary || "",
      });
      setLessonAr({
        title: arRow?.title || "",
        objective: arRow?.objective || "",
        body: arRow?.body || "",
        worked_example: arRow?.worked_example || "",
        summary: arRow?.summary || "",
      });
    })();
  }, [selectedLesson]);

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, AcademyLesson[]>();
    lessons.forEach((lesson) => {
      const list = map.get(lesson.module_id) || [];
      list.push(lesson);
      map.set(lesson.module_id, list.sort((a, b) => a.sort_order - b.sort_order));
    });
    return map;
  }, [lessons]);

  const saveCourse = async () => {
    if (!course) return;
    setSaving(true);
    await supabase.from("courses").update({
      title: en.title,
      title_ar: ar.title,
      description: en.description,
      description_ar: ar.description,
      slug: course.slug,
      level: course.level,
      estimated_minutes: course.estimated_minutes,
      has_capstone: course.has_capstone,
      updated_at: new Date().toISOString(),
    }).eq("id", course.id);
    await supabase.from("course_translations").upsert([
      { course_id: course.id, language: "en", ...en },
      { course_id: course.id, language: "ar", ...ar },
    ], { onConflict: "course_id,language" });
    setSaving(false);
    toast.success("Saved");
    load();
  };

  const saveLesson = async () => {
    if (!selectedLesson) return;
    setSaving(true);
    await supabase.from("lesson_translations").upsert([
      { lesson_id: selectedLesson, language: "en", ...lessonEn },
      { lesson_id: selectedLesson, language: "ar", ...lessonAr },
    ], { onConflict: "lesson_id,language" });
    setSaving(false);
    toast.success("Lesson saved");
  };

  const moveModule = async (module: AcademyModule, direction: -1 | 1) => {
    const ordered = [...modules].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((item) => item.id === module.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    await Promise.all([
      supabase.from("course_modules").update({ sort_order: swap.sort_order }).eq("id", module.id),
      supabase.from("course_modules").update({ sort_order: module.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  const addModule = async () => {
    const sort = (modules[modules.length - 1]?.sort_order || 0) + 1;
    const { data } = await supabase.from("course_modules").insert({
      course_id: courseId,
      sort_order: sort,
      status: "draft",
      estimated_minutes: 20,
    }).select("id").single();
    if (data?.id) {
      await supabase.from("module_translations").insert([
        { module_id: data.id, language: "en", title: `Module ${sort}` },
        { module_id: data.id, language: "ar", title: `الوحدة ${sort}` },
      ]);
    }
    load();
  };

  const addLesson = async (moduleId: string) => {
    const existing = lessonsByModule.get(moduleId) || [];
    const { data } = await supabase.from("lessons").insert({
      module_id: moduleId,
      sort_order: existing.length + 1,
      status: "draft",
      estimated_minutes: 8,
    }).select("id").single();
    if (data?.id) {
      await supabase.from("lesson_translations").insert([
        { lesson_id: data.id, language: "en", title: "New lesson", body: "" },
        { lesson_id: data.id, language: "ar", title: "درس جديد", body: "" },
      ]);
      setSelectedLesson(data.id);
    }
    load();
  };

  const doPublish = async () => {
    if (!confirm("Publish this course version? It will become visible in the catalog.")) return;
    const { error } = await publishCourse(courseId, "Admin publish");
    if (error) toast.error(error);
    else {
      toast.success("Published");
      load();
    }
  };

  if (loading) return <><Navbar /><SoftPageLoader /></>;
  if (!course) return <><Navbar /><div className="pt-28 text-center">Course not found</div></>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-6xl mx-auto px-4 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" asChild>
            <Link to="/admin"><ArrowLeft className="w-4 h-4 me-2" /> Admin</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/academy/${courseId}?preview=1`)}>{t("admin.academy.preview")}</Button>
            <Button onClick={doPublish}>{t("admin.academy.publish")}</Button>
          </div>
        </div>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="text-sm text-muted-foreground">Status: {course.status} · v{course.version_number}</p>
        {preview && <TeachingDisclaimer />}

        <Tabs defaultValue="details">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="lesson">Lesson editor</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="stats">{t("admin.academy.stats")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Tabs defaultValue="en">
              <TabsList>
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ar">العربية</TabsTrigger>
              </TabsList>
              <TabsContent value="en" className="space-y-3">
                <Label>Title</Label>
                <Input value={en.title} onChange={(e) => setEn((p) => ({ ...p, title: e.target.value }))} />
                <Label>Subtitle</Label>
                <Input value={en.subtitle} onChange={(e) => setEn((p) => ({ ...p, subtitle: e.target.value }))} />
                <Label>Description</Label>
                <Textarea rows={5} value={en.description} onChange={(e) => setEn((p) => ({ ...p, description: e.target.value }))} />
                <Label>Outcomes</Label>
                <Textarea rows={4} value={en.outcomes} onChange={(e) => setEn((p) => ({ ...p, outcomes: e.target.value }))} />
              </TabsContent>
              <TabsContent value="ar" className="space-y-3" dir="rtl">
                <Label>العنوان</Label>
                <Input value={ar.title} onChange={(e) => setAr((p) => ({ ...p, title: e.target.value }))} />
                <Label>الوصف</Label>
                <Textarea rows={5} value={ar.description} onChange={(e) => setAr((p) => ({ ...p, description: e.target.value }))} />
                <Label>النواتج</Label>
                <Textarea rows={4} value={ar.outcomes} onChange={(e) => setAr((p) => ({ ...p, outcomes: e.target.value }))} />
              </TabsContent>
            </Tabs>
            <Button onClick={saveCourse} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save details"}</Button>
          </TabsContent>

          <TabsContent value="curriculum" className="space-y-3">
            <Button size="sm" onClick={addModule} className="gap-1"><Plus className="w-4 h-4" /> Module</Button>
            {modules.map((module) => (
              <Card key={module.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{moduleTitles[module.id]?.en || "Module"}</p>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => moveModule(module, -1)} aria-label="Move up"><ChevronUp className="w-4 h-4" /></Button>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => moveModule(module, 1)} aria-label="Move down"><ChevronDown className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => addLesson(module.id)}>Lesson</Button>
                    </div>
                  </div>
                  <ul className="text-sm space-y-1">
                    {(lessonsByModule.get(module.id) || []).map((lesson) => (
                      <li key={lesson.id}>
                        <button type="button" className="text-primary hover:underline" onClick={() => setSelectedLesson(lesson.id)}>
                          Lesson {lesson.sort_order} · {lesson.estimated_minutes} min
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="lesson" className="space-y-3">
            {!selectedLesson ? <p className="text-sm text-muted-foreground">Select a lesson from Curriculum.</p> : (
              <>
                <Tabs defaultValue="en">
                  <TabsList>
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="ar">العربية</TabsTrigger>
                  </TabsList>
                  <TabsContent value="en" className="space-y-2">
                    <Input value={lessonEn.title} onChange={(e) => setLessonEn((p) => ({ ...p, title: e.target.value }))} placeholder="Title" />
                    <Input value={lessonEn.objective} onChange={(e) => setLessonEn((p) => ({ ...p, objective: e.target.value }))} placeholder="Objective" />
                    <Textarea rows={10} value={lessonEn.body} onChange={(e) => setLessonEn((p) => ({ ...p, body: e.target.value }))} placeholder="Lesson markdown" />
                    <Textarea rows={4} value={lessonEn.worked_example} onChange={(e) => setLessonEn((p) => ({ ...p, worked_example: e.target.value }))} placeholder="Worked example" />
                    <Textarea rows={3} value={lessonEn.summary} onChange={(e) => setLessonEn((p) => ({ ...p, summary: e.target.value }))} placeholder="Summary" />
                  </TabsContent>
                  <TabsContent value="ar" className="space-y-2" dir="rtl">
                    <Input value={lessonAr.title} onChange={(e) => setLessonAr((p) => ({ ...p, title: e.target.value }))} />
                    <Textarea rows={10} value={lessonAr.body} onChange={(e) => setLessonAr((p) => ({ ...p, body: e.target.value }))} />
                    <Textarea rows={3} value={lessonAr.summary} onChange={(e) => setLessonAr((p) => ({ ...p, summary: e.target.value }))} />
                  </TabsContent>
                </Tabs>
                <Button onClick={saveLesson} disabled={saving}>Save lesson</Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-3">
            <QuizBuilder courseId={courseId} modules={modules} />
          </TabsContent>

          <TabsContent value="resources" className="space-y-3">
            <ResourceUploader courseId={courseId} lessons={lessons} />
          </TabsContent>

          <TabsContent value="versions">
            <div className="space-y-2">
              {versions.map((version) => (
                <Card key={version.id}>
                  <CardContent className="p-4 text-sm">
                    v{version.version_number} · {version.status} · {new Date(version.created_at).toLocaleString()}
                    {version.notes ? ` — ${version.notes}` : ""}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid sm:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.enrollments}</p><p className="text-sm text-muted-foreground">Enrollments</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.completed}</p><p className="text-sm text-muted-foreground">Completions</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.averageProgress}%</p><p className="text-sm text-muted-foreground">Average progress</p></CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
