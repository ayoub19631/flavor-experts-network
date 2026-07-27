import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Daily flavor raw-materials market briefing.
 * Auth: Authorization Bearer service_role OR header x-cron-secret == CRON_SECRET
 * Secrets: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, optional CRON_SECRET / OPENAI_MODEL
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type Commodity = {
  name: string;
  name_ar?: string;
  trend: "up" | "down" | "stable";
  note: string;
  note_ar?: string;
};

type BriefingPayload = {
  title: string;
  title_ar: string;
  summary: string;
  summary_ar: string;
  body_en: string;
  body_ar: string;
  highlights: string[];
  commodities: Commodity[];
  sources: string[];
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAuthorized(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const auth = req.headers.get("Authorization") || "";
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;

  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  if (cronSecret && headerSecret && cronSecret === headerSecret) return true;

  // Allow admin JWT
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

function fallbackBriefing(dateLabel: string): BriefingPayload {
  return {
    title: `Flavor Raw Materials Market Briefing — ${dateLabel}`,
    title_ar: `موجز سوق مواد النكهات الأولية — ${dateLabel}`,
    summary:
      "Daily orientation brief for flavor professionals covering citrus oils, vanilla, menthol, and key aroma chemicals. Markets remain sensitive to weather, freight, and currency moves.",
    summary_ar:
      "موجز يومي للمتخصصين في النكهات يغطي زيوت الحمضيات والفانيليا والمنثول والمواد العطرية الرئيسية. الأسواق حساسة للطقس والشحن والعملات.",
    body_en:
      `Market briefing for ${dateLabel}.\n\n` +
      "1) Citrus oils: Watch Florida/Brazil orange oil availability and peel oil yields.\n" +
      "2) Vanilla: Madagascar supply narratives and quality grades continue to drive quotes.\n" +
      "3) Menthol & mint oils: Monitor India crop updates and synthetic menthol parity.\n" +
      "4) Aroma chemicals: Solvent and petrochemical feedstock costs remain a key input.\n" +
      "5) Logistics: Ocean freight and FX (USD) still influence landed cost for importers.\n\n" +
      "This briefing is an industry orientation summary for professionals — not financial advice.",
    body_ar:
      `موجز السوق لتاريخ ${dateLabel}.\n\n` +
      "1) زيوت الحمضيات: راقب توافر زيت البرتقال وجودة القشور.\n" +
      "2) الفانيليا: عرض مدغشقر وجودة الدرجات تؤثر على الأسعار.\n" +
      "3) المنثول وزيوت النعناع: تابع محاصيل الهند ومقارنة المنثول الصناعي.\n" +
      "4) المواد العطرية: تكاليف المذيبات واللقيم البتروكيماوي مؤثرة.\n" +
      "5) اللوجستيات: الشحن البحري وسعر الدولار يؤثران على التكلفة النهائية.\n\n" +
      "هذا موجز توجيهي مهني وليس نصيحة مالية.",
    highlights: [
      "Citrus oil supply & peel yields",
      "Vanilla grade/quality premiums",
      "Menthol crop vs synthetic parity",
      "Freight + USD impact on landed cost",
    ],
    commodities: [
      { name: "Orange Oil", name_ar: "زيت البرتقال", trend: "stable", note: "Watch crop and peel oil yields", note_ar: "راقب المحصول وعوائد زيت القشر" },
      { name: "Vanilla", name_ar: "فانيليا", trend: "up", note: "Quality grades remain tight in narratives", note_ar: "درجات الجودة ما زالت ضاغطة في السوق" },
      { name: "Menthol", name_ar: "منثول", trend: "stable", note: "Balance natural mint vs synthetic", note_ar: "توازن بين النعناع الطبيعي والصناعي" },
    ],
    sources: ["Industry orientation synthesis — Flavor Experts Network"],
  };
}

async function generateWithOpenAI(dateLabel: string): Promise<BriefingPayload> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return fallbackBriefing(dateLabel);

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const prompt = `You are a senior flavor industry market analyst for Flavor Experts Network.
Create today's professional daily briefing on FLAVOR RAW MATERIALS / aroma ingredients markets for ${dateLabel}.

Focus on: citrus oils, vanilla, menthol/mint, cocoa/coffee aromatics if relevant, aroma chemicals, solvents/feedstocks, freight, FX, and regulatory notes that affect formulators.

Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "title_ar": string,
  "summary": string (max 280 chars),
  "summary_ar": string,
  "body_en": string (400-900 words, clear sections),
  "body_ar": string (Arabic equivalent),
  "highlights": string[] (4-6 bullets in English),
  "commodities": [{"name": string, "name_ar": string, "trend": "up"|"down"|"stable", "note": string, "note_ar": string}],
  "sources": string[] (label as orientation sources, do NOT invent URLs)
}

Rules:
- Professional tone for flavor scientists and purchasing managers.
- Do NOT invent precise live prices or fake news headlines.
- Speak in trends, watch-items, and risk factors when live numbers are unknown.
- No financial advice disclaimer needed inside JSON; keep content factual.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only JSON. No markdown." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) return fallbackBriefing(dateLabel);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(raw) as BriefingPayload;
    if (!parsed.title || !parsed.body_en || !parsed.summary) {
      return fallbackBriefing(dateLabel);
    }
    return {
      ...fallbackBriefing(dateLabel),
      ...parsed,
      commodities: Array.isArray(parsed.commodities) ? parsed.commodities : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };
  } catch {
    return fallbackBriefing(dateLabel);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const allowed = isAuthorized(req) || (await isAdminJwt(req));
    if (!allowed) return json({ error: "Unauthorized" }, 401);

    const today = new Date();
    const dateIso = today.toISOString().slice(0, 10);
    const dateLabel = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const briefing = await generateWithOpenAI(dateLabel);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const row = {
      briefing_date: dateIso,
      title: briefing.title,
      title_ar: briefing.title_ar,
      summary: briefing.summary,
      summary_ar: briefing.summary_ar,
      body_en: briefing.body_en,
      body_ar: briefing.body_ar,
      highlights: briefing.highlights,
      commodities: briefing.commodities,
      sources: briefing.sources,
      is_published: true,
      generated_by: "refresh-market-briefing",
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await sb
      .from("market_briefings")
      .upsert(row, { onConflict: "briefing_date" })
      .select("id, briefing_date, title")
      .single();

    if (error) return json({ error: error.message }, 500);

    // Mirror into industry_news for homepage News section
    const newsPayload = {
      title: briefing.title,
      summary: briefing.summary,
      content: briefing.body_en,
      category: "Market Briefing",
      author: "FlavorBot Market Desk",
      is_published: true,
      published_at: new Date().toISOString(),
      source_url: "/market",
      image_url: null as string | null,
    };

    const { data: existingNews } = await sb
      .from("industry_news")
      .select("id")
      .eq("category", "Market Briefing")
      .gte("published_at", `${dateIso}T00:00:00Z`)
      .limit(1);

    if (existingNews && existingNews.length > 0) {
      await sb.from("industry_news").update(newsPayload).eq("id", existingNews[0].id);
    } else {
      await sb.from("industry_news").insert(newsPayload);
    }

    return json({
      ok: true,
      briefing: saved,
      mode: Deno.env.get("OPENAI_API_KEY") ? "openai" : "fallback",
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
