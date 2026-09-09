import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";

function Inner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; slug?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePageMeta({ title: t("dash.saved_jobs"), path: "/dashboard/saved-jobs", noIndex: true });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase.from("saved_jobs").select("job_id, job_listings(id, title, slug)").eq("user_id", user.id);
    if (queryError) {
      setError(t("dash.error.retry"));
      setLoading(false);
      return;
    }
    setJobs((data || []).map((row: { job_listings?: { id: string; title: string; slug?: string | null } | { id: string; title: string; slug?: string | null }[] }) => {
      const job = Array.isArray(row.job_listings) ? row.job_listings[0] : row.job_listings;
      return job || { id: "", title: "" };
    }).filter((job) => job.id));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4">
        <h1 className="text-2xl font-bold">{t("dash.saved_jobs")}</h1>
        {loading && <p className="mt-4 text-muted-foreground" role="status">{t("dash.loading")}</p>}
        {error && (
          <div className="mt-4 space-y-2">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>{t("common.retry")}</Button>
          </div>
        )}
        {!loading && !error && jobs.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("dash.empty.jobs")}{" "}
            <Link to="/jobs" className="text-primary hover:underline">{t("dash.cta.jobs")}</Link>
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link to={`/jobs/${job.slug || job.id}`} className="hover:text-primary">{job.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function SavedJobsPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
