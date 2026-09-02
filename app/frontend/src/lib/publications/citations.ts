export type CitationInput = {
  title: string;
  authors: Array<{ full_name: string }>;
  publishedAt?: string | null;
  publisher?: string;
  doi?: string | null;
  isbn?: string | null;
  url?: string;
  type?: string;
};

function yearOf(value?: string | null): string {
  if (!value) return "n.d.";
  const year = new Date(value).getUTCFullYear();
  return Number.isFinite(year) ? String(year) : "n.d.";
}

function authorList(authors: Array<{ full_name: string }>, style: "apa" | "harvard" | "vancouver"): string {
  const names = authors.map((author) => author.full_name.trim()).filter(Boolean);
  if (names.length === 0) return "Anonymous";
  if (style === "vancouver") return names.join(", ");
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

export function formatApa(input: CitationInput): string {
  const year = yearOf(input.publishedAt);
  const authors = authorList(input.authors, "apa");
  const doi = input.doi ? ` https://doi.org/${input.doi.replace(/^https?:\/\/doi.org\//, "")}` : "";
  return `${authors} (${year}). ${input.title}. ${input.publisher || "Flavor Experts Network"}.${doi}`.trim();
}

export function formatHarvard(input: CitationInput): string {
  const year = yearOf(input.publishedAt);
  const authors = authorList(input.authors, "harvard");
  const doi = input.doi ? ` Available at: https://doi.org/${input.doi.replace(/^https?:\/\/doi.org\//, "")}` : input.url ? ` Available at: ${input.url}` : "";
  return `${authors} (${year}) '${input.title}', ${input.publisher || "Flavor Experts Network"}.${doi}`.trim();
}

export function formatVancouver(input: CitationInput): string {
  const year = yearOf(input.publishedAt);
  const authors = authorList(input.authors, "vancouver");
  const doi = input.doi ? ` doi:${input.doi}` : "";
  return `${authors}. ${input.title}. ${input.publisher || "Flavor Experts Network"}; ${year}.${doi}`.trim();
}

export function formatBibtex(input: CitationInput): string {
  const year = yearOf(input.publishedAt);
  const key = `${(input.authors[0]?.full_name || "anon").split(/\s+/).pop() || "anon"}${year}`.replace(/[^A-Za-z0-9]/g, "");
  const authorField = input.authors.map((author) => author.full_name).join(" and ") || "Anonymous";
  const type = input.type === "book" ? "book" : "article";
  const extra = [
    input.doi ? `  doi = {${input.doi}}` : null,
    input.isbn ? `  isbn = {${input.isbn}}` : null,
    input.url ? `  url = {${input.url}}` : null,
  ].filter(Boolean);
  return `@${type}{${key},
  title = {${input.title}},
  author = {${authorField}},
  year = {${year}},
  publisher = {${input.publisher || "Flavor Experts Network"}},
${extra.join(",\n")}
}`;
}

export function formatRis(input: CitationInput): string {
  const year = yearOf(input.publishedAt);
  const type = input.type === "book" ? "BOOK" : "JOUR";
  const authors = input.authors.map((author) => `AU  - ${author.full_name}`).join("\n");
  return [
    `TY  - ${type}`,
    `TI  - ${input.title}`,
    authors || "AU  - Anonymous",
    `PY  - ${year}`,
    `PB  - ${input.publisher || "Flavor Experts Network"}`,
    input.doi ? `DO  - ${input.doi}` : null,
    input.isbn ? `SN  - ${input.isbn}` : null,
    input.url ? `UR  - ${input.url}` : null,
    "ER  - ",
  ].filter(Boolean).join("\n");
}

export function citationBundle(input: CitationInput) {
  return {
    apa: formatApa(input),
    harvard: formatHarvard(input),
    vancouver: formatVancouver(input),
    bibtex: formatBibtex(input),
    ris: formatRis(input),
  };
}
