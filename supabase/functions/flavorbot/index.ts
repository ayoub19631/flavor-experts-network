import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are FlavorBot, the professional assistant for Flavor Experts Network (شبكة خبراء النكهات).
You help flavor scientists, food technologists, purchasing managers, and industry professionals.
Be concise, accurate, and professional. If unsure, say so.

Core topics: flavor chemistry, sensory science, food regs (GCC/EU/US high-level), careers, platform features, and daily raw-materials market orientation.

When market briefing context is provided below, use it for questions about citrus oils, vanilla, menthol, aroma chemicals, freight, or ingredient pricing trends. Clearly state it is an orientation brief, not live exchange prices or financial advice.
Do not invent citations, proprietary formulas, or precise spot prices.`;

function languageInstruction(lang: unknown): string {
  if (lang === "ar") {
    return "CRITICAL LANGUAGE RULE: The site UI language is Arabic. Reply entirely in clear Modern Standard Arabic unless the user explicitly writes in English.";
  }
  if (lang === "en") {
    return "CRITICAL LANGUAGE RULE: The site UI language is English. Reply entirely in clear English unless the user explicitly writes in Arabic.";
  }
  return "CRITICAL LANGUAGE RULE: Reply in the same language as the user's most recent message (Arabic or English).";
}

async function loadMarketContext(authHeader: string, lang: string | null): Promise<string> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data, error } = await supabase.rpc("get_latest_market_briefing");
    if (error || !data) return "";
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return "";

    const useAr = lang === "ar";
    const title = useAr ? (row.title_ar || row.title) : row.title;
    const summary = useAr ? (row.summary_ar || row.summary) : row.summary;
    const body = useAr ? (row.body_ar || row.body_en) : row.body_en;
    const commodities = Array.isArray(row.commodities)
      ? row.commodities
          .slice(0, 8)
          .map((c: { name?: string; name_ar?: string; trend?: string; note?: string; note_ar?: string }) => {
            const n = useAr ? (c.name_ar || c.name) : c.name;
            const note = useAr ? (c.note_ar || c.note) : c.note;
            return `- ${n} [${c.trend || "stable"}]: ${note || ""}`;
          })
          .join("\n")
      : "";

    return [
      "=== LATEST DAILY MARKET BRIEFING (raw materials / aroma ingredients) ===",
      `Date: ${row.briefing_date}`,
      `Title: ${title}`,
      `Summary: ${summary}`,
      commodities ? `Commodities:\n${commodities}` : "",
      `Body:\n${String(body || "").slice(0, 3500)}`,
      "=== END MARKET BRIEFING ===",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({
          content:
            "FlavorBot is not fully configured yet. An administrator needs to set OPENAI_API_KEY in Supabase Edge Function secrets.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const preferredLang = body?.language === "ar" || body?.language === "en" ? body.language : null;
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const messages = incoming
      .filter((m: { role?: string; content?: string }) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
      )
      .slice(-12)
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content.slice(0, 4000),
      }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const marketContext = await loadMarketContext(authHeader, preferredLang);
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n${languageInstruction(preferredLang)}\n\n${marketContext}`,
          },
          ...messages,
        ],
      }),
    });

    const payload = await openaiRes.json();
    if (!openaiRes.ok) {
      return new Response(
        JSON.stringify({
          error: payload?.error?.message || "OpenAI request failed",
          content: "",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const content = payload?.choices?.[0]?.message?.content?.trim() || "";
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), content: "" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
