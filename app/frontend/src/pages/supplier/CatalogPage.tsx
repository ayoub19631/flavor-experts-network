import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { upsertSupplierMaterial, upsertSupplierProfile } from "@/lib/marketplace/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function Inner() {
  const { profile } = useAuth();
  const { t, lang } = useI18n();
  const [trade, setTrade] = useState(profile?.company || profile?.full_name || "");
  const [legal, setLegal] = useState("");
  const [type, setType] = useState("manufacturer");
  const [country, setCountry] = useState(profile?.country || "");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState(profile?.bio || "");
  const [markets, setMarkets] = useState("EU, Middle East");
  const [material, setMaterial] = useState("");
  const [generic, setGeneric] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; trade_name: string; status: string }>>([]);
  usePageMeta({ title: t("mp.catalog"), path: "/supplier/catalog", noIndex: true });

  useEffect(() => {
    supabase.rpc("list_my_materials").then(({ data }) => setRows((data as typeof rows) || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4 space-y-6">
        <h1 className="text-3xl font-bold">{t("mp.catalog")}</h1>
        <Input value={legal} onChange={(e) => setLegal(e.target.value)} placeholder={t("mp.legal")} />
        <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder={t("mp.trade")} />
        <select className="h-10 w-full rounded-md border bg-background px-3" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="manufacturer">{t("mp.type.manufacturer")}</option>
          <option value="distributor">{t("mp.type.distributor")}</option>
          <option value="agent">{t("mp.type.agent")}</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={lang === "ar" ? "الدولة" : "Country"} />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={lang === "ar" ? "المدينة" : "City"} />
        </div>
        <Input value={markets} onChange={(e) => setMarkets(e.target.value)} placeholder={t("mp.markets")} />
        <Textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder={t("mp.about")} />
        <Button onClick={() => upsertSupplierProfile({
          legal_name: legal, trade_name: trade, supplier_type: type, country, city, about,
          markets: markets.split(",").map((s) => s.trim()).filter(Boolean),
          website: profile?.website_url, linkedin_url: profile?.linkedin_url,
          logo_url: profile?.avatar_url, cover_url: profile?.cover_url,
        }, true).then(() => toast.success(t("rfq.save"))).catch((e) => toast.error(e.message))}>
          {t("rfq.save")}
        </Button>
        <h2 className="font-semibold">{t("mp.materials")}</h2>
        <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder={t("mp.trade")} />
        <Input value={generic} onChange={(e) => setGeneric(e.target.value)} placeholder={lang === "ar" ? "الاسم العام" : "Generic / chemical name"} />
        <Button variant="outline" onClick={() => upsertSupplierMaterial({ trade_name: material, generic_name: generic }, true)
          .then(() => toast.success(t("rfq.save")))
          .catch((e) => toast.error(e.message))}>{t("mp.materials")}</Button>
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border p-3 text-sm">{row.trade_name} · {row.status}</div>
        ))}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
