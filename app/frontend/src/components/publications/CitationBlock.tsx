import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { citationBundle, type CitationInput } from "@/lib/publications/citations";
import { recordPublicationEvent } from "@/lib/publications/api";
import { downloadText } from "@/lib/academy";
import { useI18n } from "@/lib/i18n";

export default function CitationBlock({
  publicationId,
  input,
}: {
  publicationId: string;
  input: CitationInput;
}) {
  const { t } = useI18n();
  const [style, setStyle] = useState<"apa" | "harvard" | "vancouver" | "bibtex" | "ris">("apa");
  const bundle = useMemo(() => citationBundle(input), [input]);

  const copy = async () => {
    await navigator.clipboard.writeText(bundle[style]);
    await recordPublicationEvent(publicationId, "citation_export");
  };

  return (
    <section className="rounded-xl border border-border p-4 space-y-3">
      <h2 className="font-semibold">{t("research.citation")}</h2>
      <div className="flex flex-wrap gap-2">
        {(["apa", "harvard", "vancouver", "bibtex", "ris"] as const).map((item) => (
          <Button key={item} type="button" size="sm" variant={style === item ? "default" : "outline"} onClick={() => setStyle(item)}>
            {item.toUpperCase()}
          </Button>
        ))}
      </div>
      <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{bundle[style]}</pre>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={copy}>Copy</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => downloadText(`citation.${style === "ris" ? "ris" : "txt"}`, bundle[style])}>
          Download
        </Button>
      </div>
    </section>
  );
}
