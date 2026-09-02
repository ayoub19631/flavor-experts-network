import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { restoreEntity, softDeleteEntity } from "@/lib/phase4/moderation";
import { toast } from "sonner";

type Report = {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  status: string;
  details?: string | null;
};

export default function AdminOpsPage() {
  const [tab, setTab] = useState<"reports" | "audit" | "trash">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [audit, setAudit] = useState<Array<{ id: string; action: string; entity_type: string; reason?: string | null; created_at: string }>>([]);
  const [reason, setReason] = useState("Moderation action");

  usePageMeta({ title: "Admin operations", path: "/admin/ops", noIndex: true });

  useEffect(() => {
    supabase.from("content_reports").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setReports((data as Report[]) || []));
    supabase.from("audit_logs").select("id, action, entity_type, reason, created_at").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setAudit((data as typeof audit) || []));
  }, []);

  const resolve = async (id: string, status: string) => {
    const { error } = await supabase.from("content_reports").update({ status, resolution: reason, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      await supabase.rpc("write_audit_log", {
        p_action: "resolve_report",
        p_entity_type: "content_report",
        p_entity_id: id,
        p_old: null,
        p_new: { status },
        p_reason: reason,
      });
      setReports((rows) => rows.map((row) => (row.id === id ? { ...row, status } : row)));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-5xl px-4 space-y-6">
        <h1 className="text-3xl font-bold">Moderation & integrity</h1>
        <div className="flex gap-2">
          {(["reports", "audit", "trash"] as const).map((item) => (
            <Button key={item} type="button" variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)}>{item}</Button>
          ))}
        </div>
        <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason required for sensitive actions" />
        {tab === "reports" && (
          <ul className="space-y-3">
            {reports.map((report) => (
              <li key={report.id} className="rounded-xl border p-4">
                <p className="font-medium">{report.entity_type} · {report.entity_id}</p>
                <p className="text-sm text-muted-foreground">{report.reason} · {report.status}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => resolve(report.id, "action_taken")}>Action taken</Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(report.id, "dismissed")}>Dismiss</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {tab === "audit" && (
          <ul className="space-y-2 text-sm">
            {audit.map((row) => (
              <li key={row.id} className="rounded-lg border p-3">{row.created_at} · {row.action} · {row.entity_type} · {row.reason}</li>
            ))}
          </ul>
        )}
        {tab === "trash" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Soft-deleted rows stay in the original tables. Restore requires a reason. Permanent delete is reserved for a super admin SQL review.</p>
            <Textarea placeholder="Entity id" id="trash-id" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={async () => {
                const id = (document.getElementById("trash-id") as HTMLTextAreaElement)?.value.trim();
                if (!id) return;
                const result = await restoreEntity("social_posts", id, reason);
                toast[result.error ? "error" : "success"](result.error || "Restored post if permitted");
              }}>Restore post</Button>
              <Button type="button" variant="outline" onClick={async () => {
                const id = (document.getElementById("trash-id") as HTMLTextAreaElement)?.value.trim();
                if (!id) return;
                const result = await softDeleteEntity("social_posts", id, reason);
                toast[result.error ? "error" : "success"](result.error || "Moved to trash if permitted");
              }}>Soft delete post</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
