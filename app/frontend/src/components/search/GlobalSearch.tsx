import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { searchAdapter, type SearchHit } from "@/lib/search";
import { isUsableSearchQuery } from "@/lib/search/normalize";

type Props = {
  compact?: boolean;
  autoFocus?: boolean;
};

export default function GlobalSearch({ compact = false, autoFocus = false }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchHit[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void searchAdapter.recents().then(setRecents);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(async () => {
      if (!isUsableSearchQuery(q)) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const hits = await searchAdapter.suggest(q, 8);
      setItems(hits);
      setActive(0);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [q, open]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goSearch = async (value = q) => {
    const next = value.trim();
    if (!isUsableSearchQuery(next)) return;
    await searchAdapter.remember(next);
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(next)}`);
  };

  const options = items.length ? items : recents.map((query) => ({
    entity_type: "recent",
    entity_id: query,
    title: query,
    href: `/search?q=${encodeURIComponent(query)}`,
    rank: 0,
  }));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const current = options[active];
      if (current && items.length) {
        void searchAdapter.recordEvent(q, { clicked: true, entityType: current.entity_type });
        navigate(current.href);
        setOpen(false);
      } else if (current) {
        void goSearch(current.title);
      } else {
        void goSearch();
      }
    }
  };

  return (
    <div ref={boxRef} className={`relative ${compact ? "w-full max-w-[16rem]" : "w-full"}`}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t("search.ph")}
        className="h-9 ps-9 pe-9"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
      />
      {q && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute end-1 top-1/2 h-7 w-7 -translate-y-1/2"
          onClick={() => setQ("")}
          aria-label={t("search.clear")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={items.length ? t("search.suggestions") : t("search.recent")}
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-background p-1 shadow-md"
        >
          {loading && <li className="px-3 py-2 text-xs text-muted-foreground">{t("search.loading")}</li>}
          {!loading && options.length === 0 && q.trim().length >= 2 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">{t("search.empty")}</li>
          )}
          {options.map((item, index) => (
            <li
              key={`${item.entity_type}-${item.entity_id}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={`cursor-pointer rounded-sm px-3 py-2 text-sm ${index === active ? "bg-primary/10 text-foreground" : "text-foreground"}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                if (item.entity_type === "recent") void goSearch(item.title);
                else {
                  void searchAdapter.recordEvent(q, { clicked: true, entityType: item.entity_type });
                  navigate(item.href);
                  setOpen(false);
                }
              }}
            >
              <p className="font-medium">{item.title}</p>
              {item.entity_type !== "recent" && (
                <p className="text-[11px] uppercase text-muted-foreground">{t(`search.type.${item.entity_type}`) || item.entity_type}</p>
              )}
            </li>
          ))}
          {recents.length > 0 && !items.length && (
            <li className="border-t border-border px-2 py-1">
              <button
                type="button"
                className="w-full rounded-sm px-2 py-1 text-start text-xs text-muted-foreground hover:text-foreground"
                onMouseDown={(event) => {
                  event.preventDefault();
                  void searchAdapter.clearHistory().then(() => setRecents([]));
                }}
              >
                {t("search.clear_history")}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
