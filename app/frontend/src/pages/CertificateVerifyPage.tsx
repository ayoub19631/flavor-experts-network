import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { verifyCertificate } from "@/lib/academy";

export default function CertificateVerifyPage() {
  const { code = "" } = useParams();
  const { t } = useI18n();
  const [value, setValue] = useState(code);
  const [result, setResult] = useState<{ valid?: boolean; recipient_name?: string; course_title?: string; issued_at?: string; verification_code?: string } | null>(null);
  const [checked, setChecked] = useState(false);

  usePageMeta({ title: t("academy.verify"), description: t("academy.desc"), path: `/certificates/${code || ""}` });

  const run = async (next = value) => {
    const { result: found } = await verifyCertificate(next);
    setResult(found);
    setChecked(true);
  };

  useEffect(() => {
    if (code) run(code);
  }, [code]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-lg mx-auto px-4 space-y-4">
        <h1 className="text-2xl font-bold">{t("academy.verify")}</h1>
        <div className="flex gap-2">
          <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={t("academy.verify.ph")} aria-label={t("academy.verify.ph")} />
          <Button onClick={() => run()}>{t("academy.verify")}</Button>
        </div>
        {checked && result?.valid && (
          <div className="rounded-xl border p-6 space-y-1">
            <p className="font-semibold">{t("academy.verify.valid")}</p>
            <p>{result.course_title}</p>
            <p>{result.recipient_name}</p>
            <p className="text-sm text-muted-foreground">{result.verification_code}</p>
            {result.issued_at && <p className="text-xs text-muted-foreground">{new Date(result.issued_at).toLocaleDateString()}</p>}
          </div>
        )}
        {checked && !result?.valid && <p className="text-sm text-muted-foreground">{t("academy.verify.invalid")}</p>}
      </div>
    </div>
  );
}
