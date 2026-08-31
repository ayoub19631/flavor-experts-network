import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function TeachingDisclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ${
        compact ? "p-3" : "p-4"
      }`}
      role="note"
    >
      <p className="flex items-start gap-2 text-sm font-semibold">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        {t("academy.disclaimer")}
      </p>
      {!compact && <p className="mt-2 text-xs leading-relaxed opacity-90">{t("academy.regulatory")}</p>}
    </div>
  );
}
