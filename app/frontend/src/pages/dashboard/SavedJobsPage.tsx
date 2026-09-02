import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";

function Inner() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; slug?: string | null }>>([]);
  usePageMeta({ title: "Saved jobs", path: "/dashboard/saved-jobs", noIndex: true });
  useEffect(() => {
    if (!user) return;
    supabase.from("saved_jobs").select("job_id, job_listings(id, title, slug)").eq("user_id", user.id)
      .then(({ data }) => setJobs((data || []).map((row: { job_listings?: { id: string; title: string; slug?: string | null } | { id: string; title: string; slug?: string | null }[] }) => {
        const job = Array.isArray(row.job_listings) ? row.job_listings[0] : row.job_listings;
        return job || { id: "", title: "" };
      }).filter((job) => job.id)));
  }, [user]);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4">
        <h1 className="text-2xl font-bold">{lang === "ar" ? "الوظائف المحفوظة" : "Saved jobs"}</h1>
        <ul className="mt-4 space-y-2">
          {jobs.map((job) => <li key={job.id}><Link to={`/jobs/${job.slug || job.id}`}>{job.title}</Link></li>)}
        </ul>
      </div>
    </div>
  );
}

export default function SavedJobsPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
