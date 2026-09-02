import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, GraduationCap, Loader2, Pencil, Plus, RefreshCw, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { publishCourse } from "@/lib/academy";
import type { Course } from "@/lib/types";
import { toast } from "sonner";

const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

const emptyForm = {
  title: "",
  title_ar: "",
  description: "",
  description_ar: "",
  level: "beginner",
  duration_hours: "1",
  image_url: "",
  is_published: false,
};

export default function AdminCoursesPanel() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCourses((data as Course[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialog(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setForm({
      title: course.title || "",
      title_ar: course.title_ar || "",
      description: course.description || "",
      description_ar: course.description_ar || "",
      level: course.level || "beginner",
      duration_hours: String(course.duration_hours ?? 1),
      image_url: course.image_url || "",
      is_published: course.is_published,
    });
    setDialog(true);
  };

  const attachToLearningPath = async (courseId: string, level: string) => {
    const normalized = level.toLowerCase();
    const slug =
      ["beginner", "intro", "fundamental"].includes(normalized)
        ? "flavor-fundamentals"
        : ["intermediate", "mid"].includes(normalized)
          ? "formulation-practice"
          : "industry-leadership";
    const { data: path } = await supabase
      .from("learning_paths")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!path?.id) return;
    await supabase.from("learning_path_courses").upsert(
      { path_id: path.id, course_id: courseId, sort_order: Date.now() % 100000 },
      { onConflict: "path_id,course_id" },
    );
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSaving(true);
    const slug = form.title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    const payload = {
      title: form.title.trim(),
      title_ar: form.title_ar.trim() || null,
      description: form.description.trim(),
      description_ar: form.description_ar.trim() || null,
      level: form.level,
      duration_hours: Number(form.duration_hours) || 1,
      image_url: form.image_url.trim() || null,
      is_published: form.is_published,
      status: form.is_published ? "published" : "draft",
      slug: editing?.slug || `${slug || "course"}-${Date.now().toString(36)}`,
      premium: false,
      updated_at: new Date().toISOString(),
    };
    let courseId = editing?.id ?? null;
    let error = null as { message: string } | null;
    if (editing) {
      const res = await supabase.from("courses").update(payload).eq("id", editing.id);
      error = res.error;
    } else {
      const res = await supabase.from("courses").insert(payload).select("id").single();
      error = res.error;
      courseId = res.data?.id ?? null;
    }
    if (!error && courseId && form.is_published) {
      const published = await publishCourse(courseId, "Admin catalog publish");
      if (published.error) {
        setSaving(false);
        toast.error(published.error);
        return;
      }
      await attachToLearningPath(courseId, form.level);
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(editing ? "Course updated" : form.is_published ? "Course published" : "Draft course created");
      setDialog(false);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    setBusyId(id);
    const { error } = await supabase.from("courses").delete().eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Entry deleted");
      load();
    }
  };

  const togglePublished = async (course: Course) => {
    setBusyId(course.id);
    if (!course.is_published) {
      const published = await publishCourse(course.id, "Admin catalog publish");
      if (!published.error) await attachToLearningPath(course.id, course.level);
      setBusyId(null);
      if (published.error) toast.error(published.error);
      else load();
      return;
    }
    const { error } = await supabase
      .from("courses")
      .update({ status: "draft" })
      .eq("id", course.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            Internal catalog
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Internal catalog only. Public visitors see Industry Insights; existing rows stay in the database.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Public books and research now live under{" "}
          <Link to="/admin/publications" className="text-primary font-medium">Publications</Link>
          . This catalog remains an internal Academy tool and is not the public library.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add entry
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No catalog rows yet</p>
            <Button size="sm" onClick={openAdd} className="gap-2">
              <Plus className="w-3.5 h-3.5" /> Create first draft
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm truncate">{course.title}</p>
                    <Badge variant="secondary">{course.level}</Badge>
                    <Badge className={course.is_published ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 border-0" : "bg-secondary text-muted-foreground border-0"}>
                      {course.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                  <p className="text-xs text-muted-foreground">{course.duration_hours} hours</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-8" disabled={busyId === course.id} onClick={() => togglePublished(course)}>
                    {course.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1" asChild>
                    <a href={`/admin/academy/${course.id}`}>Builder</a>
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEdit(course)}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600" disabled={busyId === course.id} onClick={() => remove(course.id)}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit entry" : "Add entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Title (Arabic)</Label>
              <Input value={form.title_ar} onChange={(e) => setForm((p) => ({ ...p, title_ar: e.target.value }))} dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (Arabic)</Label>
              <Textarea rows={3} value={form.description_ar} onChange={(e) => setForm((p) => ({ ...p, description_ar: e.target.value }))} dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm((p) => ({ ...p, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (hours)</Label>
                <Input type="number" min="0.5" step="0.5" value={form.duration_hours} onChange={(e) => setForm((p) => ({ ...p, duration_hours: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} />
              Published
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              {editing ? "Save" : form.is_published ? "Publish" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
