import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import TeachingDisclaimer from "@/components/academy/TeachingDisclaimer";
import SoftPageLoader from "@/components/SoftPageLoader";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchCourseBySlug, fetchLabs, submitLab, uploadAcademyFile } from "@/lib/academy";
import { toast } from "sonner";

export default function AcademyLabPage() {
  const { slug = "", labId = "" } = useParams();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");

  usePageMeta({ title: t("academy.lab"), path: `/learn/${slug}/lab/${labId}`, noIndex: true });

  useEffect(() => {
    (async () => {
      const { course } = await fetchCourseBySlug(slug);
      if (!course) {
        setLoading(false);
        return;
      }
      setCourseId(course.id);
      const labs = await fetchLabs(course.id);
      const lab = labs.find((item) => item.id === labId);
      setTitle((lang === "ar" && lab?.title_ar ? lab.title_ar : lab?.title) || t("academy.lab"));
      setBrief((lang === "ar" && lab?.brief_ar ? lab.brief_ar : lab?.brief) || "");
      setLoading(false);
    })();
  }, [slug, labId, lang]);

  const onFile = async (file: File) => {
    if (!user || !courseId) return;
    const { url, error } = await uploadAcademyFile(`submissions/${user.id}/${courseId}/${file.name}`, file);
    if (error) toast.error(error);
    else setFileUrl(url);
  };

  const onSubmit = async () => {
    if (!user || !courseId) return;
    const { error } = await submitLab({
      assignment_id: labId,
      course_id: courseId,
      user_id: user.id,
      notes,
      file_url: fileUrl,
    });
    if (error) toast.error(error);
    else toast.success(t("academy.completed"));
  };

  if (loading) return <><Navbar /><SoftPageLoader /></>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 space-y-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <TeachingDisclaimer />
        <p className="text-sm whitespace-pre-wrap">{brief}</p>
        <Textarea rows={10} value={notes} onChange={(event) => setNotes(event.target.value)} aria-label={t("academy.lab")} />
        <input type="file" onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
        <Button onClick={onSubmit}>{t("academy.submit")}</Button>
        <Button asChild variant="outline"><Link to={`/courses/${slug}`}>{t("general.back")}</Link></Button>
      </div>
    </div>
  );
}
