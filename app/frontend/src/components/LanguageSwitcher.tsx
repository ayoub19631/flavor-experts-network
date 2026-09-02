import { useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, PUBLIC_LANGUAGES, type Language } from "@/lib/languages";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((item) => item.code === lang) || LANGUAGES[0];

  const persistLang = (code: Language) => {
    setOpen(false);
    setLang(code);
    if (user) {
      void supabase.from("user_profiles").update({ preferred_language: code }).eq("id", user.id);
    }
  };

  return (
    <DropdownMenu key={lang} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={compact ? "h-9 w-9" : "h-9 gap-1.5 px-2"}
          title={t("lang.label")}
          aria-label={t("lang.label")}
        >
          <Globe className="w-4 h-4" />
          {!compact && <span className="hidden sm:inline text-xs font-medium">{current.native}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {PUBLIC_LANGUAGES.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onSelect={() => persistLang(item.code)}
            className={item.code === lang ? "bg-primary/10 font-semibold" : ""}
          >
            <span className="flex-1">{item.native}</span>
            <span className="text-[10px] uppercase text-muted-foreground">{item.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
