import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Rate-limited public form submissions:
 * contact | enterprise | newsletter | consultation
 * verify_jwt = false
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ContactBody = {
  form: "contact";
  name: string;
  email: string;
  subject: string;
  message: string;
  website_url?: string;
};

type EnterpriseBody = {
  form: "enterprise";
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  services_interested?: string;
  message: string;
  website_url?: string;
};

type NewsletterBody = {
  form: "newsletter";
  email: string;
  name?: string;
  website_url?: string;
};

type ConsultationBody = {
  form: "consultation";
  name: string;
  email: string;
  topic: string;
  preferred_date?: string;
  message: string;
  website_url?: string;
};

type Body = ContactBody | EnterpriseBody | NewsletterBody | ConsultationBody;

const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientKey(req: Request, email: string): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${fwd}:${email.toLowerCase()}`;
}

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as Body;

    if (body.website_url?.trim()) {
      return json({ ok: true });
    }

    if (!body.form || !body.email || !isEmail(body.email)) {
      return json({ error: "Invalid submission" }, 400);
    }

    const key = clientKey(req, body.email);
    if (!rateLimit(key)) {
      return json({ error: "Too many requests. Please try again later." }, 429);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Durable per-email daily cap — survives isolate restarts (in-memory limit is best-effort only).
    if (body.form === "contact" || body.form === "enterprise") {
      const table = body.form === "contact" ? "contact_messages" : "enterprise_requests";
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countErr } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("email", body.email.trim().toLowerCase())
        .gte("created_at", since);
      if (!countErr && (count ?? 0) >= 3) {
        return json({ error: "Daily submission limit reached. Please try again tomorrow." }, 429);
      }
    }

    if (body.form === "contact") {
      const name = (body.name || "").trim();
      const subject = (body.subject || "").trim();
      const message = (body.message || "").trim();
      if (!name || !subject || !message || name.length > 200 || subject.length > 300 || message.length > 5000) {
        return json({ error: "Invalid fields" }, 400);
      }

      const { error } = await supabase.from("contact_messages").insert({
        name,
        email: body.email.trim().toLowerCase(),
        subject,
        message,
        status: "new",
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.form === "enterprise") {
      const company_name = (body.company_name || "").trim();
      const contact_name = (body.contact_name || "").trim();
      const message = (body.message || "").trim();
      if (!company_name || !contact_name || !message || company_name.length > 200 || message.length > 5000) {
        return json({ error: "Invalid fields" }, 400);
      }

      const { error } = await supabase.from("enterprise_requests").insert({
        company_name,
        contact_name,
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        services_interested: body.services_interested?.trim() || null,
        message,
        status: "new",
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.form === "newsletter") {
      const email = body.email.trim().toLowerCase();
      const name = body.name?.trim() || null;
      const { error } = await supabase.from("newsletter_subscribers").upsert(
        {
          email,
          name,
          status: "active",
          source: "footer",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.form === "consultation") {
      const name = (body.name || "").trim();
      const topic = (body.topic || "").trim();
      const message = (body.message || "").trim();
      if (!name || !topic || !message || name.length > 200 || topic.length > 300 || message.length > 5000) {
        return json({ error: "Invalid fields" }, 400);
      }

      const { error } = await supabase.from("consultation_requests").insert({
        name,
        email: body.email.trim().toLowerCase(),
        topic,
        preferred_date: body.preferred_date?.trim() || null,
        message,
        status: "new",
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown form type" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
