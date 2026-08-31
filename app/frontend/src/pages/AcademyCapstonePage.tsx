import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import TeachingDisclaimer from "@/components/academy/TeachingDisclaimer";
import SoftPageLoader from "@/components/SoftPageLoader";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchCapstone, fetchCourseBySlug, submitCapstone, uploadAcademyFile } from "@/lib/academy";
import { CAPSTONE_FIELDS, emptyCapstone, type CapstonePayload } from "@/lib/academy-types";
import { toast } from "sonner";

const LABELS: Record<string, { en: string; ar: string }> = {
  sensory_brief: { en: "Sensory brief", ar: "الموجز الحسي" },
  formula: { en: "100% formula", ar: "صيغة 100٪" },
  materials: { en: "Material codes and versions", ar: "رموز المواد والإصدارات" },
  weights: { en: "Weights", ar: "الأوزان" },
  preparation: { en: "Preparation method", ar: "طريقة التحضير" },
  ppe_safety: { en: "PPE and safety", ar: "الوقاية والسلامة" },
  storage: { en: "Storage instructions", ar: "تعليمات التخزين" },
  application_matrix: { en: "Application matrix", ar: "مصفوفة التطبيق" },
  coded_sensory: { en: "Coded sensory evaluation", ar: "التقييم الحسي المرمّز" },
  revision: { en: "One documented formula revision", ar: "مراجعة صيغة موثّقة واحدة" },
  regulatory_checklist: { en: "Regulatory and safety checklist", ar: "قائمة تنظيمية وسلامة" },
  recommendation: { en: "Final recommendation", ar: "التوصية النهائية" },
  limitations: { en: "Limitations", ar: "الحدود" },
};

export default function AcademyCapstonePage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [payload, setPayload] = useState<CapstonePayload>(emptyCapstone());
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  usePageMeta({ title: t("academy.capstone"), path: `/learn/${slug}/capstone`, noIndex: true });

  useEffect(() => {
    (async () => {
      const { course } = await fetchCourseBySlug(slug);
      if (!course || !user) {
        setLoading(false);
        return;
      }
      setCourseId(course.id);
      const existing = await fetchCapstone(course.id, user.id);
      if (existing?.payload) setPayload({ ...emptyCapstone(), ...(existing.payload as CapstonePayload) });
      setLoading(false);
    })();
  }, [slug, user?.id]);

  const onSubmit = async () => {
    if (!user || !courseId) return;
    const missing = CAPSTONE_FIELDS.filter((field) => !payload[field].trim());
    if (missing.length) {
      toast.error(lang === "ar" ? "أكمل كل الأقسام المطلوبة" : "Complete every required section");
      return;
    }
    const { error } = await submitCapstone({ course_id: courseId, user_id: user.id, payload, file_url: fileUrl });
    if (error) toast.error(error);
    else toast.success(t("academy.completed"));
  };

  if (loading) return <><Navbar /><SoftPageLoader /></>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 space-y-5">
        <h1 className="text-2xl font-bold">{t("academy.capstone")}</h1>
        <TeachingDisclaimer />
        {CAPSTONE_FIELDS.map((field) => (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={field}>{lang === "ar" ? LABELS[field].ar : LABELS[field].en}</Label>
            <Textarea
              id={field}
              rows={field === "formula" ? 8 : 4}
              value={payload[field]}
              onChange={(event) => setPayload((prev) => ({ ...prev, [field]: event.target.value }))}
            />
          </div>
        ))}
        <input
          type="file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file || !user || !courseId) return;
            const { url, error } = await uploadAcademyFile(`submissions/${user.id}/${courseId}/capstone-${file.name}`, file);
            if (error) toast.error(error);
            else setFileUrl(url);
          }}
        />
        <Button onClick={onSubmit}>{t("academy.submit")}</Button>
        <Button asChild variant="outline"><Link to={`/courses/${slug}`}>{t("general.back")}</Link></Button>
      </div>
    </div>
  );
}
