import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import AdminRoute from "@/components/AdminRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Queue = {
  suppliers?: Array<{ id: string; trade_name: string; status: string }>;
  materials?: Array<{ id: string; trade_name: string; status: string }>;
  documents?: Array<{ id: string; doc_type: string; review_status: string }>;
  reports?: Array<{ id: string; entity_type: string; reason: string }>;
};

function Inner() {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Queue>({});
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  usePageMeta({ title: t("admin.mp"), path: "/admin/marketplace", noIndex: true });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_marketplace_review_queue");
    if (error) toast.error(error.message);
    setQueue((data as Queue) || {});
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(type: string, id: string, action: string) {
    const { error } = await supabase.rpc("review_marketplace_item", {
      p_entity_type: type,
      p_entity_id: id,
      p_action: action,
      p_reason: reason,
    });
    toast[error ? "error" : "success"](error?.message || action);
    if (!error) await load();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4 space-y-6">
        <h1 className="text-3xl font-bold">{t("admin.mp")}</h1>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rfq.reason")} />
        {loading && <p className="text-muted-foreground" role="status">{t("dash.loading")}</p>}
        {(["suppliers", "materials", "documents"] as const).map((key) => (
          <section key={key} className="space-y-2">
            <h2 className="font-semibold">{t(`admin.mp.${key}`)}</h2>
            {!loading && (queue[key] || []).length === 0 && <p className="text-sm text-muted-foreground">{t("admin.mp.empty")}</p>}
            {(queue[key] || []).map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                <span className="min-w-0 flex-1">{"trade_name" in row ? row.trade_name : "doc_type" in row ? row.doc_type : row.id}</span>
                <Button size="sm" variant="outline" onClick={() => void review(key === "suppliers" ? "supplier" : key === "materials" ? "supplier_material" : "marketplace_document", row.id, "approve")}>{t("admin.mp.approve")}</Button>
                <Button size="sm" variant="outline" onClick={() => void review(key === "suppliers" ? "supplier" : key === "materials" ? "supplier_material" : "marketplace_document", row.id, "reject")}>{t("admin.mp.reject")}</Button>
                {key !== "documents" && (
                  <Button size="sm" variant="outline" onClick={() => void review(key === "suppliers" ? "supplier" : "supplier_material", row.id, "hide")}>{t("admin.mp.hide")}</Button>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

export default function AdminMarketplacePage() {
  return <AdminRoute capability="review_marketplace"><Inner /></AdminRoute>;
}
