import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { toast } from "sonner";

export default function ConsultationExpertPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { lang } = useI18n();
  const [headline, setHeadline] = useState("");
  const [starts, setStarts] = useState("");
  usePageMeta({ title: headline || (lang === "ar" ? "خبير" : "Expert"), path: `/consultations/experts/${id || ""}` });
  useEffect(() => {
    if (!id) return;
    supabase.from("consultation_experts").select("headline").eq("user_id", id).eq("is_published", true).maybeSingle()
      .then(({ data }) => setHeadline((data?.headline as string) || ""));
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-lg px-4 space-y-4">
        <Link to="/consultations/experts" className="text-sm text-muted-foreground hover:text-primary">{lang === "ar" ? "كل الخبراء" : "All experts"}</Link>
        <h1 className="text-2xl font-bold">{headline || (lang === "ar" ? "خبير" : "Expert")}</h1>
        <label className="text-sm block">
          {lang === "ar" ? "وقت البداية (يُحفظ بالتوقيت العالمي)" : "Start time (stored in UTC)"}
          <Input type="datetime-local" value={starts} onChange={(event) => setStarts(event.target.value)} />
        </label>
        <Button disabled={!user || !starts} onClick={async () => {
          if (!user || !id || !starts) return;
          const start = new Date(starts);
          const end = new Date(start.getTime() + 45 * 60000);
          const { error } = await supabase.from("consultation_bookings").insert({
            expert_id: id,
            requester_id: user.id,
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            status: "requested",
          });
          toast[error ? "error" : "success"](error?.message || (lang === "ar" ? "تم إرسال الطلب" : "Request sent"));
        }}>{lang === "ar" ? "طلب حجز" : "Request booking"}</Button>
      </div>
    </div>
  );
}
