import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Daily industry wire — curates flavor & raw-materials news from trade RSS feeds.
 * Auth: service_role Bearer OR x-cron-secret == CRON_SECRET OR platform admin JWT
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type RssCandidate = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
  sourcePublisher: string;
};

type CuratedItem = {
  title: string;
  summary: string;
  summary_ar: string;
  category: string;
  source_url: string;
  author: string;
  published_at: string;
  external_id: string;
  relevance: number;
};

const FEEDS: { url: string; publisher: string; label: string }[] = [
  {
    label: "industry-wire-en-1",
    publisher: "Industry Wire",
    url:
      "https://news.google.com/rss/search?q=flavor+industry+ingredients+raw+materials+when:3d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "industry-wire-en-2",
    publisher: "Industry Wire",
    url:
      "https://news.google.com/rss/search?q=vanilla+citrus+oil+menthol+aroma+chemicals+when:3d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "industry-wire-en-3",
    publisher: "Industry Wire",
    url:
      "https://news.google.com/rss/search?q=food+ingredients+flavour+fragrance+market+when:3d&hl=en-US&gl=US&ceid=US:en",
  },
  {
    label: "industry-wire-ar",
    publisher: "Industry Wire",
    url:
      "https://news.google.com/rss/search?q=%D9%86%D9%83%D9%87%D8%A7%D8%AA+%D9%85%D9%88%D8%A7%D8%AF+%D8%A3%D9%88%D9%84%D9%8A%D8%A9+%D8%B9%D8%B7%D8%B1+%D8%B9%D9%84%D9%89&hl=ar&gl=SA&ceid=SA:ar",
  },
];

const RELEVANCE_KEYWORDS =
  /flavou?r|aroma|fragrance|vanilla|vanillin|menthol|mint\s+oil|citrus|orange\s+oil|lemon\s+oil|essential\s+oil|oleoresin|botanical\s+extract|flavor\s+ingredient|aroma\s+chemical|raw\s+material|sensory\s+science|FEMA\s*GRAS|clean\s+label\s+flavor|flavour\s+house|food\s+flavour|beverage\s+flavor|confectionery\s+flavor|dairy\s+flavor|spice\s+oleoresin|halal\s+flavor|flavor\s+regulat|ingredient\s+supply|crop\s+(vanilla|citrus|mint)|formulat(ion|e).*flavor/i;

const MAX_STORE = 40;
const MAX_AGE_DAYS = 21;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(block: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(cdata) || block.match(plain);
  return m ? decodeEntities(m[1]) : "";
}

function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return `nw_${Math.abs(h).toString(36)}`;
}

function parseRss(xml: string, feed: (typeof FEEDS)[0]): RssCandidate[] {
  const items: RssCandidate[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = pickTag(block, "title");
    const link = pickTag(block, "link") || pickTag(block, "guid");
    const description = pickTag(block, "description") || pickTag(block, "content:encoded");
    const pubDate = pickTag(block, "pubDate") || pickTag(block, "dc:date");
    if (!title || !link) continue;
    items.push({
      title,
      link: link.split("&")[0] === link ? link : link,
      description,
      pubDate,
      sourceName: feed.label,
      sourcePublisher: feed.publisher,
    });
  }
  return items;
}

function isRelevant(item: RssCandidate): boolean {
  const blob = `${item.title} ${item.description}`;
  return RELEVANCE_KEYWORDS.test(blob);
}

function dedupeCandidates(list: RssCandidate[]): RssCandidate[] {
  const seen = new Set<string>();
  const out: RssCandidate[] = [];
  for (const item of list) {
    const key = item.title.toLowerCase().replace(/\W+/g, "").slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchFeed(feed: (typeof FEEDS)[0]): Promise<RssCandidate[]> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "FlavorExpertsNetwork/1.0 (industry news desk)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, feed);
  } catch {
    return [];
  }
}

function isAuthorized(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const auth = req.headers.get("Authorization") || "";
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  if (cronSecret && headerSecret && cronSecret === headerSecret) return true;
  return false;
}

async function isAdminJwt(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return data?.is_admin === true;
}

async function curateWithOpenAI(candidates: RssCandidate[]): Promise<CuratedItem[]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key || candidates.length === 0) {
    return candidates.slice(0, 8).map((c) => ({
      title: c.title,
      summary: c.description.slice(0, 280) || c.title,
      summary_ar: c.description.slice(0, 280) || c.title,
      category: "Market Trends",
      source_url: c.link,
      author: c.sourcePublisher,
      published_at: c.pubDate ? new Date(c.pubDate).toISOString() : new Date().toISOString(),
      external_id: hashId(c.link),
      relevance: 0.75,
    }));
  }

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const payload = candidates.slice(0, 20).map((c, i) => ({
    id: i + 1,
    title: c.title,
    snippet: c.description.slice(0, 400),
    url: c.link,
    published: c.pubDate,
    publisher: c.sourcePublisher,
  }));

  const prompt = `You are the senior editorial desk at Flavor Experts Network — a professional trade publication for flavor scientists, food technologists, and raw-materials buyers.

Review these recent industry headlines/snippets and select up to 8 items most relevant to:
- flavor & fragrance industry
- food ingredients & raw materials (vanilla, citrus oils, menthol, aroma chemicals, extracts, oleoresins)
- formulation, sensory, regulatory, supply chain, and market moves affecting formulators

Return ONLY valid JSON:
{
  "items": [
    {
      "id": number (from input id),
      "title": string (keep original headline; minor clarity edits only),
      "summary": string (1-2 professional sentences, editorial tone, max 260 chars),
      "summary_ar": string (Modern Standard Arabic equivalent),
      "category": one of ["Market Trends","Innovation","Regulatory","Sustainability","Research","Events"],
      "author": string (publisher/source name, e.g. "Food Ingredients First" or "Industry Wire"),
      "relevance": number 0-1
    }
  ]
}

Rules:
- Write like a human industry editor — never mention AI, bots, automation, or "generated".
- Do NOT invent facts, prices, or quotes not implied by the snippet.
- Skip irrelevant consumer lifestyle or restaurant review stories.
- Only include items with relevance >= 0.72.
- Prefer the freshest and most actionable stories for B2B professionals.

Input stories:
${JSON.stringify(payload)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 2400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only JSON. Editorial desk tone." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    return candidates.slice(0, 6).map((c) => ({
      title: c.title,
      summary: c.description.slice(0, 260) || c.title,
      summary_ar: c.description.slice(0, 260) || c.title,
      category: "Market Trends",
      source_url: c.link,
      author: c.sourcePublisher,
      published_at: c.pubDate ? new Date(c.pubDate).toISOString() : new Date().toISOString(),
      external_id: hashId(c.link),
      relevance: 0.75,
    }));
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw) as { items?: Array<{
      id: number;
      title: string;
      summary: string;
      summary_ar: string;
      category: string;
      author: string;
      relevance: number;
    }> };
    const byId = new Map(candidates.map((c, i) => [i + 1, c]));
    return (parsed.items || [])
      .filter((x) => x.relevance >= 0.72)
      .map((x) => {
        const src = byId.get(x.id);
        if (!src) return null;
        const pub = src.pubDate ? new Date(src.pubDate) : new Date();
        return {
          title: x.title || src.title,
          summary: x.summary,
          summary_ar: x.summary_ar || x.summary,
          category: x.category || "Market Trends",
          source_url: src.link,
          author: x.author || src.sourcePublisher,
          published_at: Number.isNaN(pub.getTime()) ? new Date().toISOString() : pub.toISOString(),
          external_id: hashId(src.link),
          relevance: x.relevance,
        } satisfies CuratedItem;
      })
      .filter(Boolean) as CuratedItem[];
  } catch {
    return [];
  }
}

async function pruneOldNews(sb: ReturnType<typeof createClient>) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS);
  await sb
    .from("industry_news")
    .delete()
    .eq("ingestion_source", "industry-wire")
    .lt("published_at", cutoff.toISOString());

  const { data: rows } = await sb
    .from("industry_news")
    .select("id")
    .eq("ingestion_source", "industry-wire")
    .order("published_at", { ascending: false });

  if (rows && rows.length > MAX_STORE) {
    const drop = rows.slice(MAX_STORE).map((r) => r.id);
    await sb.from("industry_news").delete().in("id", drop);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const allowed = isAuthorized(req) || (await isAdminJwt(req));
    if (!allowed) return json({ error: "Unauthorized" }, 401);

    const fetched = await Promise.all(FEEDS.map(fetchFeed));
    const candidates = dedupeCandidates(
      fetched.flat().filter(isRelevant),
    ).slice(0, 24);

    if (candidates.length === 0) {
      return json({ ok: true, inserted: 0, message: "No relevant RSS items found" });
    }

    const curated = await curateWithOpenAI(candidates);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let inserted = 0;
    let updated = 0;

    for (const item of curated) {
      const row = {
        title: item.title,
        summary: item.summary,
        content: item.summary,
        category: item.category,
        author: item.author,
        source_url: item.source_url,
        image_url: null as string | null,
        is_published: true,
        published_at: item.published_at,
        updated_at: new Date().toISOString(),
        external_id: item.external_id,
        ingestion_source: "industry-wire",
      };

      const { data: existing } = await sb
        .from("industry_news")
        .select("id")
        .eq("ingestion_source", "industry-wire")
        .eq("external_id", item.external_id)
        .maybeSingle();

      if (existing?.id) {
        await sb.from("industry_news").update(row).eq("id", existing.id);
        updated++;
      } else {
        const { error } = await sb.from("industry_news").insert(row);
        if (!error) inserted++;
      }
    }

    await pruneOldNews(sb);

    return json({
      ok: true,
      scanned: candidates.length,
      curated: curated.length,
      inserted,
      updated,
      mode: Deno.env.get("OPENAI_API_KEY") ? "editorial" : "rss-fallback",
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
