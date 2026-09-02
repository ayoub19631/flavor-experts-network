const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "b", "i", "u", "s",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "a", "span", "div", "hr", "table", "thead", "tbody", "tr", "th", "td",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
};

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(value: string): string | null {
  const trimmed = value.trim();
  if (/^(https?:|mailto:|#|\/)/i.test(trimmed) && !/^(javascript|data|vbscript):/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function sanitizePublicationHtml(input: string | null | undefined): string {
  if (!input) return "";
  const template = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  return template.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawTag: string, rawAttrs: string) => {
    const closing = match.startsWith("</");
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return `</${tag}>`;
    if (tag === "br" || tag === "hr") return `<${tag} />`;
    const allowed = ALLOWED_ATTRS[tag];
    if (!allowed) return `<${tag}>`;
    const attrs: string[] = [];
    const attrRe = /([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let found: RegExpExecArray | null;
    while ((found = attrRe.exec(rawAttrs))) {
      const name = found[1].toLowerCase();
      if (!allowed.has(name)) continue;
      const value = found[3] ?? found[4] ?? found[5] ?? "";
      if (name === "href") {
        const href = safeHref(value);
        if (!href) continue;
        attrs.push(`href="${escapeText(href)}"`);
        attrs.push('rel="noopener noreferrer"');
        continue;
      }
      if (name === "target") {
        attrs.push('target="_blank"');
        continue;
      }
      attrs.push(`${name}="${escapeText(value)}"`);
    }
    return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
  });
}

export function markdownToSafeHtml(markdown: string | null | undefined): string {
  if (!markdown) return "";
  const escaped = escapeText(markdown);
  const withBlocks = escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((https?:\/\/[^)]+|\/[^)]+|#([^)]+))\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");
  return sanitizePublicationHtml(`<p>${withBlocks}</p>`);
}
