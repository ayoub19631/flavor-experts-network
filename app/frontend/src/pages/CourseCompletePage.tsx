import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import SoftPageLoader from "@/components/SoftPageLoader";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchCourseBySlug, fetchMyEnrollment, issueCertificate } from "@/lib/academy";
import type { AcademyCertificate } from "@/lib/academy-types";
import { toast } from "sonner";

export default function CourseCompletePage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [complete, setComplete] = useState(false);
  const [certificate, setCertificate] = useState<AcademyCertificate | null>(null);

  usePageMeta({ title: t("academy.finish"), path: `/learn/${slug}/complete`, noIndex: true });

  useEffect(() => {
    (async () => {
      const { course } = await fetchCourseBySlug(slug);
      if (!course || !user) {
        setLoading(false);
        return;
      }
      const enrollment = await fetchMyEnrollment(course.id, user.id);
      setComplete(enrollment?.status === "completed");
      setLoading(false);
    })();
  }, [slug, user?.id]);

  const issue = async () => {
    const { course } = await fetchCourseBySlug(slug);
    if (!course) return;
    const { certificate: issued, error } = await issueCertificate(course.id);
    if (error) toast.error(error);
    else setCertificate(issued);
  };

  if (loading) return <><Navbar /><SoftPageLoader /></>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-xl mx-auto px-4 text-center space-y-4">
        <h1 className="text-3xl font-bold">{complete ? t("academy.finish") : t("academy.progress")}</h1>
        {complete ? (
          <>
            <Button onClick={issue}>{t("academy.issue")}</Button>
            {certificate && (
              <div className="rounded-xl border p-6 space-y-2">
                <p className="font-semibold">{certificate.course_title}</p>
                <p>{certificate.recipient_name}</p>
                <p className="text-sm text-muted-foreground">{certificate.verification_code}</p>
                <Button asChild variant="outline">
                  <Link to={`/certificates/${certificate.verification_code}`}>{t("academy.verify")}</Link>
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">{t("academy.dashboard.empty")}</p>
        )}
        <Button asChild variant="outline"><Link to="/learn">{t("academy.dashboard")}</Link></Button>
      </div>
    </div>
  );
}
