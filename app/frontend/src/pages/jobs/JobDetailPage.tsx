import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import SeoJsonLd from "@/components/SeoJsonLd";
import { SITE } from "@/lib/site-config";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { toast } from "sonner";
import CommunitySafetyMenu from "@/components/CommunitySafetyMenu";

type Job = {
  id: string;
  slug?: string | null;
  title: string;
  company_name: string;
  location?: string | null;
  employment_type?: string | null;
  description?: string | null;
  workplace_type?: string | null;
  country?: string | null;
  city?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  application_deadline?: string | null;
  apply_url?: string | null;
  status?: string | null;
  is_published?: boolean | null;
  created_at?: string | null;
};

export default function JobDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { lang } = useI18n();
  const [job, setJob] = useState<Job | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("job_listings")
      .select("*")
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as Job | null;
        if (!row || row.status === "draft" || row.status === "rejected") {
          setMissing(true);
          setJob(null);
          return;
        }
        setJob(row);
      });
  }, [slug]);

  usePageMeta({
    title: job ? `${job.title} · ${job.company_name}` : (lang === "ar" ? "وظيفة" : "Job"),
    description: job?.description?.slice(0, 160) || SITE.description,
    path: `/jobs/${slug || ""}`,
  });

  if (missing || !job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <p className="pt-28 text-center text-muted-foreground">{lang === "ar" ? "لم يتم العثور على الوظيفة أو أنها غير منشورة." : "This job was not found or is not published."}</p>
      </div>
    );
  }

  const jobUrl = `${SITE.canonicalOrigin}/jobs/${job.slug || job.id}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: job.description || job.title,
          datePosted: (job.created_at || new Date().toISOString()).slice(0, 10),
          hiringOrganization: { "@type": "Organization", name: job.company_name },
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.city || job.location || "",
              addressCountry: job.country || "",
            },
          },
          employmentType: (job.employment_type || "FULL_TIME").toUpperCase(),
          url: jobUrl,
        }}
      />
      <article className="pt-24 pb-16 mx-auto max-w-3xl px-4 space-y-4">
        <p className="text-xs uppercase tracking-wide text-primary">{job.company_name}</p>
        <h1 className="text-3xl font-bold">{job.title}</h1>
        <p className="text-muted-foreground">{[job.workplace_type, job.city || job.location, job.country].filter(Boolean).join(" · ")}</p>
        {job.salary_min != null && <p>{job.salary_min}–{job.salary_max} {job.salary_currency}</p>}
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{job.description}</div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/jobs">{lang === "ar" ? "كل الوظائف" : "All jobs"}</Link></Button>
          {user && (
            <Button variant="outline" onClick={async () => {
              const { error } = await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: job.id });
              toast[error ? "error" : "success"](error?.message || (lang === "ar" ? "تم الحفظ" : "Saved"));
            }}>{lang === "ar" ? "حفظ الوظيفة" : "Save job"}</Button>
          )}
          {job.apply_url && <Button asChild variant="outline"><a href={job.apply_url} target="_blank" rel="noreferrer">{lang === "ar" ? "تقديم خارجي" : "Apply externally"}</a></Button>}
          {user && <CommunitySafetyMenu entityType="job" entityId={job.id} />}
        </div>
      </article>
    </div>
  );
}
