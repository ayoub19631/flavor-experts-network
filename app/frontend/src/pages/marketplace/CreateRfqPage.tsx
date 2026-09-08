import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { createRfq, publishRfq } from "@/lib/marketplace/api";
import { toast } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";

function Inner() {
  const { t, lang } = useI18n();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [incoterm, setIncoterm] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [sample, setSample] = useState(false);
  const [material, setMaterial] = useState(params.get("material") || "");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [invite, setInvite] = useState(params.get("supplier") || "");
  usePageMeta({ title: t("rfq.title"), path: "/marketplace/rfq", noIndex: true });

  async function save(publish: boolean) {
    try {
      const id = await createRfq({
        title,
        notes,
        delivery_country: country,
        delivery_city: city,
        currency,
        incoterm,
        needed_by: neededBy || undefined,
        wants_sample: sample,
        company_id: profile?.account_type === "company" ? user?.id : null,
        lines: [{ material_name: material || title, quantity: qty, unit }],
      });
      if (publish) {
        await publishRfq(id, invite ? [invite] : undefined);
      }
      toast.success(publish ? t("rfq.publish") : t("rfq.save"));
      navigate(`/dashboard/rfqs/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "RFQ failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4 space-y-4">
        <h1 className="text-3xl font-bold">{t("rfq.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("mp.disclaimer")}</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={lang === "ar" ? "عنوان الطلب" : "RFQ title"} />
        <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder={t("mp.materials")} />
        <div className="grid grid-cols-2 gap-2">
          <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder={lang === "ar" ? "الكمية" : "Quantity"} />
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={lang === "ar" ? "الوحدة" : "Unit"} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={lang === "ar" ? "بلد التسليم" : "Delivery country"} />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={lang === "ar" ? "المدينة" : "City"} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
          <Input value={incoterm} onChange={(e) => setIncoterm(e.target.value)} placeholder="FOB / CIF / DAP" />
        </div>
        <Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} />
          {t("mp.sample")}
        </label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={lang === "ar" ? "المواصفات" : "Specifications"} />
        <Input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder={lang === "ar" ? "معرّف مورد مدعو (اختياري)" : "Invite supplier id (optional)"} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void save(false)}>{t("rfq.save")}</Button>
          <Button onClick={() => void save(true)}>{t("rfq.publish")}</Button>
        </div>
      </div>
    </div>
  );
}

export default function CreateRfqPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}
