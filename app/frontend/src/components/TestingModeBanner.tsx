import { FlaskConical } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Persistent top ribbon while the public site is in beta / payments off. */
export default function TestingModeBanner() {
  const { lang } = useI18n();
  const isAR = lang === "ar";

  return (
    <div
      role="status"
      className="w-full border-b border-amber-500/30 bg-amber-50 text-amber-950 dark:bg-amber-950/90 dark:text-amber-50"
    >
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-medium">
        <FlaskConical className="w-3.5 h-3.5 shrink-0 opacity-80" />
        <span>
          {isAR
            ? "المنصة في وضع الاختبار — خدمات البيع والاشتراكات المدفوعة غير مفعّلة حالياً."
            : "Platform is in testing mode — paid sales and subscriptions are not active yet."}
        </span>
      </div>
    </div>
  );
}
