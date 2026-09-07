import { useEffect, useId, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { isMissingRelation, isPhase5WorkflowsEnabled } from "@/lib/phase5/flags";
import {
  insertMentionToken,
  mentionCaretQuery,
  type MentionCandidate,
} from "@/lib/phase5/mentions";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
};

export default function MentionField({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled,
  className,
  maxLength,
}: Props) {
  const { t } = useI18n();
  const listId = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MentionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open || !isPhase5WorkflowsEnabled()) return;
    const handle = window.setTimeout(async () => {
      if (!query.trim()) {
        setItems([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.rpc("search_member_mentions", {
        p_query: query.trim(),
        p_limit: 6,
      });
      setLoading(false);
      if (error) {
        if (!isMissingRelation(error.message)) setItems([]);
        return;
      }
      setItems((data as MentionCandidate[]) || []);
      setActive(0);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const applyMention = (mention: MentionCandidate) => {
    const caret = ref.current?.selectionStart ?? value.length;
    const next = insertMentionToken(value, caret, mention);
    onChange(maxLength ? next.text.slice(0, maxLength) : next.text);
    setOpen(false);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.caret, next.caret);
    });
  };

  return (
    <div className="relative">
      <Textarea
        id={id}
        ref={ref}
        rows={rows}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder || t("mention.placeholder")}
        className={className}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        onChange={(event) => {
          const next = event.target.value;
          onChange(maxLength ? next.slice(0, maxLength) : next);
          const found = mentionCaretQuery(next, event.target.selectionStart || next.length);
          setOpen(!!found);
          setQuery(found?.query || "");
        }}
        onKeyDown={(event) => {
          if (!open || items.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + items.length) % items.length);
          } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            applyMention(items[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("mention.label")}
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {loading && <li className="px-2 py-1.5 text-muted-foreground">{t("mention.searching")}</li>}
          {!loading && items.length === 0 && (
            <li className="px-2 py-1.5 text-muted-foreground">{t("mention.empty")}</li>
          )}
          {items.map((item, index) => (
            <li key={item.profile_id} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={`flex w-full flex-col rounded px-2 py-1.5 text-start ${index === active ? "bg-primary/10" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyMention(item);
                }}
              >
                <span className="font-medium">{item.full_name}</span>
                <span className="text-xs text-muted-foreground">{[item.title, item.company].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
