import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Transactional + broadcast email via Resend.
 * Secrets: RESEND_API_KEY, EMAIL_FROM, SUPABASE_SERVICE_ROLE_KEY
 * Optional: ADMIN_NOTIFY_EMAIL, INTERNAL_EMAIL_SECRET, SITE_URL
 */

const ALLOWED_ORIGINS = new Set([
  "https://flavorexpertsnetwork.com",
  "https://www.flavorexpertsnetwork.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:3001",
  "http://localhost:3001",
]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://flavorexpertsnetwork.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-internal-email-secret",
    Vary: "Origin",
  };
}

type BroadcastRecipients = "all" | "professional" | "enterprise" | "newsletter";

type EmailPayload = {
  type:
    | "contact_ack"
    | "admin_alert"
    | "custom"
    | "welcome"
    | "reply"
    | "broadcast"
    | "enterprise_ack"
    | "newsletter_welcome"
    | "security_alert";
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  meta?: Record<string, string>;
  // reply
  message_id?: string;
  reply_body?: string;
  // broadcast
  recipients?: BroadcastRecipients;
  body?: string;
  email_type?: "newsletter" | "announcement" | "news";
};

function json(body: Record<string, unknown>, status = 200, req?: Request) {
  const cors = req ? corsHeadersFor(req) : {
    "Access-Control-Allow-Origin": "https://flavorexpertsnetwork.com",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-internal-email-secret",
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function siteUrl() {
  return (Deno.env.get("SITE_URL") || "https://flavorexpertsnetwork.com").replace(/\/$/, "");
}

function fromAddress() {
  return Deno.env.get("EMAIL_FROM") || "Flavor Experts Network <noreply@nexusflavor.com>";
}

function brandShell(title: string, innerHtml: string, preheader = "", lang: "ar" | "en" = "en") {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const brand = lang === "ar" ? "شبكة خبراء النكهات" : "Flavor Experts Network";
  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#002D54">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">
<tr><td style="background:#002D54;padding:28px 24px;color:#E1DDCF">
<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.85;margin-bottom:8px">${brand}</div>
<h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700">${title}</h1>
</td></tr>
<tr><td style="padding:28px 24px;font-size:15px;line-height:1.7;color:#1f2937">${innerHtml}</td></tr>
<tr><td style="padding:18px 24px 26px;border-top:1px solid #EEF2F7;font-size:12px;color:#6b7280;line-height:1.55">
© ${new Date().getFullYear()} Flavor Experts Network · <a href="${siteUrl()}" style="color:#002D54;text-decoration:none">${siteUrl().replace("https://", "")}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function isInternalRequest(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  const internalSecret = Deno.env.get("INTERNAL_EMAIL_SECRET");
  const headerSecret = req.headers.get("x-internal-email-secret");
  return Boolean(internalSecret && headerSecret && internalSecret === headerSecret);
}

async function sendResend(opts: {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  idempotencyKey?: string;
}) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey.slice(0, 256);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Resend error");
  return data as { id: string };
}

async function sendResendBatch(
  emails: Array<{ from: string; to: string[]; subject: string; html?: string; text?: string }>,
) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  // Resend batch max 100
  const chunks: typeof emails[] = [];
  for (let i = 0; i < emails.length; i += 100) chunks.push(emails.slice(i, i + 100));
  const ids: string[] = [];
  for (const chunk of chunks) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `batch-broadcast/${crypto.randomUUID()}`.slice(0, 256),
      },
      body: JSON.stringify(chunk),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Resend batch error");
    if (Array.isArray(data?.data)) {
      for (const item of data.data) if (item?.id) ids.push(item.id);
    }
  }
  return ids;
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function isPlatformAdmin(authHeader: string): Promise<{ ok: boolean; userId?: string }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return { ok: profile?.is_admin === true, userId: user.id };
}

async function logEmail(
  email_type: string,
  recipient: string,
  subject: string,
  resend_id: string | null,
  status: string,
  meta: Record<string, unknown> = {},
) {
  try {
    await adminClient().from("email_logs").insert({
      email_type,
      recipient,
      subject,
      resend_id,
      status,
      meta,
    });
  } catch {
    /* non-fatal */
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(body: string) {
  return escapeHtml(body).replace(/\n/g, "<br/>");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req) });
  }

  try {
    const from = fromAddress();
    const body = (await req.json()) as EmailPayload;
    const authHeader = req.headers.get("Authorization") || "";
    const respond = (payload: Record<string, unknown>, status = 200) =>
      json(payload, status, req);

    // ── Custom (admin) ──────────────────────────────────────────────────────
    if (body.type === "custom") {
      const admin = await isPlatformAdmin(authHeader);
      if (!admin.ok) return respond({ error: "Admin access required" }, 403);
      if (!body.to || !body.subject || (!body.html && !body.text)) {
        return respond({ error: "to, subject, and html/text required" }, 400);
      }
      const result = await sendResend({
        from,
        to: [body.to],
        subject: body.subject,
        html: body.html || brandShell(body.subject, `<p>${textToHtml(body.text || "")}</p>`),
        text: body.text,
        idempotencyKey: `custom/${body.to}/${Date.now()}`,
      });
      await logEmail("custom", body.to, body.subject, result.id, "sent");
      return respond({ ok: true, id: result.id });
    }

    // ── Admin reply to contact message ──────────────────────────────────────
    if (body.type === "reply") {
      const admin = await isPlatformAdmin(authHeader);
      if (!admin.ok) return respond({ error: "Admin access required" }, 403);
      if (!body.message_id || !body.reply_body?.trim()) {
        return respond({ error: "message_id and reply_body required" }, 400);
      }
      const sb = adminClient();
      const { data: msg, error } = await sb
        .from("contact_messages")
        .select("*")
        .eq("id", body.message_id)
        .maybeSingle();
      if (error || !msg) return respond({ error: "Message not found" }, 404);

      const subject = body.subject || `Re: ${msg.subject || "Your message to Flavor Experts"}`;
      const html = brandShell(
        subject,
        `<p>Dear ${escapeHtml(msg.name)},</p>
         <p>${textToHtml(body.reply_body.trim())}</p>
         <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
         <p style="font-size:13px;color:#6b7280"><strong>Your original message:</strong></p>
         <blockquote style="margin:0;padding:12px 16px;background:#f8fafc;border-left:3px solid #0a3d6b;color:#374151">${textToHtml(msg.message)}</blockquote>`,
        "Reply from Flavor Experts Network",
      );
      const result = await sendResend({
        from,
        to: [msg.email],
        subject,
        html,
        text: `${body.reply_body.trim()}\n\n---\nYour original message:\n${msg.message}`,
        idempotencyKey: `reply/${body.message_id}/${Date.now()}`,
      });

      await sb.from("contact_messages").update({
        status: "replied",
        admin_reply: body.reply_body.trim(),
        replied_at: new Date().toISOString(),
      }).eq("id", body.message_id);

      await logEmail("reply", msg.email, subject, result.id, "sent", { message_id: body.message_id });
      return respond({ ok: true, id: result.id });
    }

    // ── Broadcast (admin → Resend batch) ────────────────────────────────────
    if (body.type === "broadcast") {
      const admin = await isPlatformAdmin(authHeader);
      if (!admin.ok) return respond({ error: "Admin access required" }, 403);
      if (!body.subject?.trim() || !body.body?.trim()) {
        return respond({ error: "subject and body required" }, 400);
      }

      const recipients = body.recipients || "all";
      const sb = adminClient();
      let emails: string[] = [];

      if (recipients === "newsletter") {
        const { data } = await sb
          .from("newsletter_subscribers")
          .select("email")
          .eq("status", "active");
        emails = (data || []).map((r) => r.email).filter(Boolean);
      } else {
        let q = sb.from("user_profiles").select("email, subscription_tier, email_opt_in, marketing_opt_in");
        if (recipients === "professional") q = q.eq("subscription_tier", "professional");
        if (recipients === "enterprise") q = q.eq("subscription_tier", "enterprise");
        const { data } = await q;
        emails = (data || [])
          .filter((u) => u.email && u.email_opt_in !== false && u.marketing_opt_in !== false)
          .map((u) => u.email as string);
      }

      emails = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))];
      if (emails.length === 0) return respond({ error: "No recipients found" }, 400);

      const typeLabel = body.email_type || "announcement";
      const htmlInner = `<p>${textToHtml(body.body.trim())}</p>
        <p style="margin-top:28px;font-size:13px;color:#6b7280">You received this ${typeLabel} because you are a member of Flavor Experts Network.
        <a href="${siteUrl()}/privacy" style="color:#0a3d6b">Privacy & preferences</a></p>`;
      const html = brandShell(body.subject.trim(), htmlInner, body.subject.trim());
      const text = `${body.body.trim()}\n\n— Flavor Experts Network\n${siteUrl()}`;

      const batch = emails.map((to) => ({
        from,
        to: [to],
        subject: body.subject!.trim(),
        html,
        text,
      }));

      const ids = await sendResendBatch(batch);
      await logEmail(
        "broadcast",
        `${emails.length} recipients`,
        body.subject.trim(),
        ids[0] || null,
        "sent",
        { count: emails.length, recipients, email_type: typeLabel },
      );
      return respond({ ok: true, sent: emails.length, ids });
    }

    // ── Welcome (internal or admin) — includes platform policy copy ─────────
    if (body.type === "welcome") {
      if (!isInternalRequest(req) && !(await isPlatformAdmin(authHeader)).ok) {
        return respond({ error: "Unauthorized" }, 403);
      }
      if (!body.to) return respond({ error: "to required" }, 400);
      const name = escapeHtml(body.meta?.name || "Member");
      const site = siteUrl();
      const subject =
        body.subject ||
        "مرحباً بك في شبكة خبراء النكهات | Welcome to Flavor Experts Network";
      const inner = `
        <div dir="rtl" style="text-align:right;margin-bottom:28px">
          <p style="margin:0 0 12px;font-size:16px">أهلاً بك <strong>${name}</strong>،</p>
          <p style="margin:0 0 12px">يسعدنا انضمامك إلى <strong>شبكة خبراء النكهات</strong> — المجتمع المهني لمتخصصي صناعة النكهات وتكنولوجيا الأغذية.</p>
          <p style="margin:0 0 16px">كجزء من تفعيل حسابك الجديد، نرسل لك نسخة موجزة من <strong>سياسة المنصة</strong> مع شرح واضح لكيفية عمل العضوية، السلوك المهني، وحماية بياناتك.</p>
          <div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px;margin:0 0 16px">
            <p style="margin:0 0 10px;font-weight:700;color:#002D54">ملخص سياسة المنصة</p>
            <ul style="margin:0;padding-right:18px;color:#374151;line-height:1.75">
              <li>باستخدامك للمنصة فإنك توافق على الشروط والأحكام وسياسة الخصوصية.</li>
              <li>المنصة تعليمية ومهنية فقط لعلوم النكهات وتكنولوجيا الأغذية.</li>
              <li>يُمنع منعاً باتاً الأخبار السياسية وأي نقاش سياسي.</li>
              <li>يُمنع منعاً باتاً أي محتوى يخص الأطفال.</li>
              <li>يُمنع منعاً باتاً المواد الإباحية أو الجنسية.</li>
              <li>المنصة مجانية بالكامل للأفراد والشركات — بدون اشتراكات مدفوعة.</li>
              <li>المخالفة الجسيمة قد توقف الحساب فوراً.</li>
              <li>نجمع البيانات اللازمة لتقديم الخدمة وتحسينها، ولا نبيع بياناتك لأطراف ثالثة.</li>
              <li>لا نفرض رسوم عضوية حالياً للوصول إلى ميزات المنصة.</li>
            </ul>
          </div>
          <p style="margin:0 0 16px;font-size:14px">النسخة الكاملة:
            <a href="${site}/terms" style="color:#002D54;font-weight:600">الشروط والأحكام</a>
            ·
            <a href="${site}/privacy" style="color:#002D54;font-weight:600">سياسة الخصوصية</a>
          </p>
        </div>
        <hr style="border:none;border-top:1px solid #EEF2F7;margin:8px 0 24px"/>
        <div dir="ltr" style="text-align:left">
          <p style="margin:0 0 12px;font-size:16px">Welcome, <strong>${name}</strong>,</p>
          <p style="margin:0 0 12px">We’re glad you’ve joined <strong>Flavor Experts Network</strong> — the professional community for flavor scientists and food technologists.</p>
          <p style="margin:0 0 16px">As part of activating your new account, we’re sharing a concise copy of our <strong>platform policy</strong>, with a clear explanation of membership, professional conduct, and how we handle your data.</p>
          <div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px;margin:0 0 16px">
            <p style="margin:0 0 10px;font-weight:700;color:#002D54">Platform policy summary</p>
            <ul style="margin:0;padding-left:18px;color:#374151;line-height:1.75">
              <li>By using the platform you agree to our Terms of Service and Privacy Policy.</li>
              <li>This is an educational professional network for flavor science and food technology only.</li>
              <li>Political news or political debate is strictly forbidden.</li>
              <li>Any content involving children is strictly forbidden.</li>
              <li>Pornography or adult sexual content is strictly forbidden.</li>
              <li>The platform is fully free for individuals and companies — no paid subscriptions.</li>
              <li>Serious violations can suspend the account immediately.</li>
              <li>We collect only the data needed to deliver and improve the service, and we do not sell your data.</li>
              <li>We do not currently charge membership fees for platform features.</li>
            </ul>
          </div>
          <p style="margin:0 0 20px;font-size:14px">Full documents:
            <a href="${site}/terms" style="color:#002D54;font-weight:600">Terms of Service</a>
            ·
            <a href="${site}/privacy" style="color:#002D54;font-weight:600">Privacy Policy</a>
          </p>
          <p style="margin:0 0 8px">
            <a href="${site}/dashboard" style="display:inline-block;background:#002D54;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open your dashboard</a>
          </p>
          <p style="margin:20px 0 0;font-size:12px;color:#6b7280">If you did not create this account, you can safely ignore this email.</p>
        </div>`;
      const html = brandShell(
        `مرحباً بك، ${name}`,
        inner,
        "Welcome to Flavor Experts Network — your account is ready, plus our platform policy.",
        "ar",
      );
      const text = [
        `أهلاً بك ${body.meta?.name || "Member"} في شبكة خبراء النكهات.`,
        "كجزء من تفعيل حسابك، إليك ملخص سياسة المنصة: الالتزام بالشروط، السلوك المهني، حماية البيانات، وخطط العضوية.",
        `الشروط: ${site}/terms`,
        `الخصوصية: ${site}/privacy`,
        "",
        `Welcome to Flavor Experts Network. Platform policy summary and full documents:`,
        `${site}/terms`,
        `${site}/privacy`,
        `${site}/dashboard`,
      ].join("\n");
      const result = await sendResend({
        from,
        to: [body.to],
        subject,
        html,
        text,
        idempotencyKey: `welcome-email/${body.to}`,
      });
      await logEmail("welcome", body.to, subject, result.id, "sent");
      return respond({ ok: true, id: result.id });
    }

    // Internal-only types
    if (["admin_alert", "contact_ack", "enterprise_ack", "newsletter_welcome", "security_alert"].includes(body.type)) {
      if (!isInternalRequest(req)) return respond({ error: "Internal access only" }, 403);
    }

    if (body.type === "admin_alert") {
      const adminTo = Deno.env.get("ADMIN_NOTIFY_EMAIL");
      if (!adminTo) return respond({ ok: false, skipped: "ADMIN_NOTIFY_EMAIL unset" });
      const subject = body.subject || "Flavor Experts — new notification";
      const text = body.text || JSON.stringify(body.meta ?? {}, null, 2);
      const result = await sendResend({
        from,
        to: [adminTo],
        subject,
        text,
        html: body.html || brandShell(subject, `<pre style="white-space:pre-wrap">${escapeHtml(text)}</pre>`),
      });
      await logEmail("admin_alert", adminTo, subject, result.id, "sent");
      return respond({ ok: true, id: result.id });
    }

    if (body.type === "contact_ack" && body.to) {
      const subject = body.subject || "We received your message — Flavor Experts Network";
      const html = body.html || brandShell(
        "Message received",
        `<p>Thank you for contacting Flavor Experts Network. Our team will get back to you shortly.</p>`,
      );
      const result = await sendResend({
        from,
        to: [body.to],
        subject,
        html,
        text: body.text || "Thank you for contacting Flavor Experts Network.",
        idempotencyKey: `contact-ack/${body.to}/${body.meta?.message_id || Date.now()}`,
      });
      await logEmail("contact_ack", body.to, subject, result.id, "sent");
      return respond({ ok: true, id: result.id });
    }

    if (body.type === "enterprise_ack" && body.to) {
      const subject = body.subject || "Enterprise request received — Flavor Experts Network";
      const html = body.html || brandShell(
        "Enterprise request received",
        `<p>We received your enterprise inquiry. A specialist will contact you soon.</p>`,
      );
      const result = await sendResend({
        from,
        to: [body.to],
        subject,
        html,
        text: body.text || "We received your enterprise request.",
      });
      await logEmail("enterprise_ack", body.to, subject, result.id, "sent");
      return respond({ ok: true, id: result.id });
    }

    if (body.type === "newsletter_welcome" && body.to) {
      const subject = body.subject || "Subscribed — Flavor Experts Network Newsletter";
      const html = brandShell(
        "You're subscribed",
        `<p>Thanks for joining our newsletter. You will receive industry news, resources, and community updates.</p>`,
      );
      const result = await sendResend({
        from,
        to: [body.to],
        subject,
        html,
        text: "Thanks for subscribing to the Flavor Experts Network newsletter.",
        idempotencyKey: `newsletter-welcome/${body.to}`,
      });
      await logEmail("newsletter_welcome", body.to, subject, result.id, "sent");
      return respond({ ok: true, id: result.id });
    }

    if (body.type === "security_alert" && body.to) {
      const subject = body.subject || "Security alert — Flavor Experts Network";
      const html = brandShell(
        "Security alert",
        `<p>${textToHtml(body.text || body.meta?.detail || "A security-related change occurred on your account.")}</p>
         <p>If this was not you, reset your password immediately and contact support.</p>`,
      );
      const result = await sendResend({
        from,
        to: [body.to],
        subject,
        html,
        text: body.text || "Security alert on your Flavor Experts account.",
      });
      await logEmail("security_alert", body.to, subject, result.id, "sent");
      return respond({ ok: true, id: result.id });
    }

    return respond({ error: "Unsupported email type" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500, req);
  }
});
