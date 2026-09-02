import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function Inner() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [rows, setRows] = useState<Array<{ id: string; status: string; job_id: string }>>([]);
  usePageMeta({ title: "My applications", path: "/dashboard/applications", noIndex: true });
  useEffect(() => {
    if (!user) return;
    supabase.from("job_applications").select("id, status, job_id").eq("applicant_id", user.id)
      .then(({ data }) => setRows((data as typeof rows) || []));
  }, [user]);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4">
        <h1 className="text-2xl font-bold">{lang === "ar" ? "طلباتي" : "My applications"}</h1>
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border p-3 flex justify-between">
              <span>{row.status}</span>
              {row.status === "submitted" && (
                <Button size="sm" variant="outline" onClick={async () => {
                  const { error } = await supabase.from("job_applications").update({ status: "withdrawn" }).eq("id", row.id);
                  toast[error ? "error" : "success"](error?.message || "Withdrawn");
                  setRows((list) => list.map((item) => item.id === row.id ? { ...item, status: "withdrawn" } : item));
                }}>{lang === "ar" ? "سحب" : "Withdraw"}</Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
