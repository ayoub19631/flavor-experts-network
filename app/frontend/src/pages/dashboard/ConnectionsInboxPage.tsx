import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Connection = { id: string; requester_id: string; addressee_id: string; status: string; message?: string | null };

function Inner() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [incoming, setIncoming] = useState<Connection[]>([]);
  const [sent, setSent] = useState<Connection[]>([]);
  usePageMeta({ title: "Connections", path: "/dashboard/connections", noIndex: true });

  const load = async () => {
    if (!user) return;
    const { data: inRows } = await supabase.from("member_connections").select("*").eq("addressee_id", user.id).eq("status", "pending");
    const { data: outRows } = await supabase.from("member_connections").select("*").eq("requester_id", user.id).eq("status", "pending");
    setIncoming((inRows as Connection[]) || []);
    setSent((outRows as Connection[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4 space-y-6">
        <h1 className="text-2xl font-bold">{lang === "ar" ? "الاتصالات" : "Connections"}</h1>
        <section>
          <h2 className="font-semibold">{lang === "ar" ? "واردة" : "Incoming"}</h2>
          {incoming.map((row) => (
            <div key={row.id} className="mt-2 flex gap-2 rounded-lg border p-3">
              <span className="text-sm flex-1">{row.message || row.requester_id}</span>
              <Button size="sm" onClick={async () => {
                const { error } = await supabase.from("member_connections").update({ status: "accepted" }).eq("id", row.id);
                toast[error ? "error" : "success"](error?.message || "Accepted");
                load();
              }}>{lang === "ar" ? "قبول" : "Accept"}</Button>
              <Button size="sm" variant="outline" onClick={async () => {
                const { error } = await supabase.from("member_connections").update({ status: "declined" }).eq("id", row.id);
                toast[error ? "error" : "success"](error?.message || "Declined");
                load();
              }}>{lang === "ar" ? "رفض" : "Decline"}</Button>
            </div>
          ))}
        </section>
        <section>
          <h2 className="font-semibold">{lang === "ar" ? "مرسلة" : "Sent"}</h2>
          {sent.map((row) => (
            <div key={row.id} className="mt-2 flex gap-2 rounded-lg border p-3">
              <span className="text-sm flex-1">{row.addressee_id}</span>
              <Button size="sm" variant="outline" onClick={async () => {
                const { error } = await supabase.from("member_connections").update({ status: "cancelled" }).eq("id", row.id);
                toast[error ? "error" : "success"](error?.message || "Cancelled");
                load();
              }}>{lang === "ar" ? "إلغاء" : "Withdraw"}</Button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default function ConnectionsInboxPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
