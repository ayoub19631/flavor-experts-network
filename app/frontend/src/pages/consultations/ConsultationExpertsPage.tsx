import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";

type Expert = { user_id: string; headline?: string | null; topics?: string[] | null; duration_minutes: number };

export default function ConsultationExpertsPage() {
  const { lang } = useI18n();
  const [experts, setExperts] = useState<Expert[]>([]);
  usePageMeta({ title: lang === "ar" ? "خبراء الاستشارة" : "Consultation experts", path: "/consultations/experts" });
  useEffect(() => {
    supabase.from("consultation_experts").select("user_id, headline, topics, duration_minutes").eq("is_published", true)
      .then(({ data }) => setExperts((data as Expert[]) || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-4xl px-4">
        <h1 className="text-3xl font-bold">{lang === "ar" ? "خبراء الاستشارة" : "Consultation experts"}</h1>
        <p className="mt-2 text-muted-foreground">{lang === "ar" ? "حجز منظم بدون دفع داخل المنصة في هذه المرحلة." : "Structured booking. No in-platform payment in this phase."}</p>
        <div className="mt-6 grid gap-4">
          {experts.length === 0 && <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا يوجد خبراء منشورون بعد." : "No published experts yet."}</p>}
          {experts.map((expert) => (
            <Link key={expert.user_id} to={`/consultations/experts/${expert.user_id}`} className="rounded-xl border p-4 block">
              <p className="font-semibold">{expert.headline || (lang === "ar" ? "خبير نكهات" : "Flavor professional")}</p>
              <p className="text-sm text-muted-foreground">{(expert.topics || []).join(", ")} · {expert.duration_minutes} min</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
