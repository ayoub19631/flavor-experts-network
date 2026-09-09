import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type ApplicationRow = {
  id: string;
  status: string;
  job_id: string;
  job_listings?: { id: string; title: string; slug?: string | null } | { id: string; title: string; slug?: string | null }[] | null;
};

function Inner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  usePageMeta({ title: t("dash.applications"), path: "/dashboard/applications", noIndex: true });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const withJobs = await supabase
      .from("job_applications")
      .select("id, status, job_id, job_listings(id, title, slug)")
      .eq("applicant_id", user.id);
    if (withJobs.error) {
      const fallback = await supabase.from("job_applications").select("id, status, job_id").eq("applicant_id", user.id);
      if (fallback.error) {
        setError(t("dash.error.retry"));
        setLoading(false);
        return;
      }
      setRows((fallback.data as ApplicationRow[]) || []);
      setLoading(false);
      return;
    }
    setRows((withJobs.data as ApplicationRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const jobOf = (row: ApplicationRow) => (Array.isArray(row.job_listings) ? row.job_listings[0] : row.job_listings);
  const statusLabel = (status: string) => {
    const key = `dash.status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4">
        <h1 className="text-2xl font-bold">{t("dash.applications")}</h1>
        {loading && <p className="mt-4 text-muted-foreground" role="status">{t("dash.loading")}</p>}
        {error && (
          <div className="mt-4 space-y-2">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>{t("common.retry")}</Button>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("dash.empty.applications")}{" "}
            <Link to="/jobs" className="text-primary hover:underline">{t("dash.cta.jobs")}</Link>
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const job = jobOf(row);
            return (
              <li key={row.id} className="rounded-xl border p-3 flex flex-wrap justify-between gap-2">
                <div className="min-w-0">
                  {job ? (
                    <Link to={`/jobs/${job.slug || job.id}`} className="font-medium hover:text-primary">{job.title}</Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">{row.job_id}</span>
                  )}
                  <p className="text-sm text-muted-foreground">{statusLabel(row.status)}</p>
                </div>
                {row.status === "submitted" && (
                  <Button size="sm" variant="outline" disabled={busy === row.id} onClick={async () => {
                    setBusy(row.id);
                    const { error: updateError } = await supabase.from("job_applications").update({ status: "withdrawn" }).eq("id", row.id);
                    setBusy(null);
                    toast[updateError ? "error" : "success"](updateError?.message || t("dash.status.withdrawn"));
                    if (!updateError) setRows((list) => list.map((item) => item.id === row.id ? { ...item, status: "withdrawn" } : item));
                  }}>{t("dash.withdraw")}</Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
