import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { createDraftPublication } from "@/lib/publications/api";
import { PUBLICATION_TYPES } from "@/lib/publications/types";
import { toast } from "sonner";

function SubmitInner() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof PUBLICATION_TYPES)[number]>("original_research");
  const [saving, setSaving] = useState(false);
  usePageMeta({ title: t("submit.title"), description: t("submit.desc"), path: "/submit-publication", noIndex: true });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await createDraftPublication({ title, type });
    setSaving(false);
    if (result.error || !result.data) {
      toast.error(result.error || "Could not create draft");
      return;
    }
    toast.success(t("pub.draft_hidden"));
    navigate(`/my-library/${result.data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold">{t("submit.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("submit.desc")}</p>
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <Input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
            {PUBLICATION_TYPES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
          </select>
          <Button type="submit" disabled={saving || !title.trim()}>{t("submit.create")}</Button>
        </form>
      </div>
      <FooterSection />
    </div>
  );
}

export default function SubmitPublicationPage() {
  return (
    <ProtectedRoute>
      <SubmitInner />
    </ProtectedRoute>
  );
}
