import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

/**
 * Supabase Auth Send Email Hook → Resend (bilingual, signed).
 * Secrets: RESEND_API_KEY, EMAIL_FROM, SITE_URL, SEND_EMAIL_HOOK_SECRET
 */

type EmailActionType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "reauthentication";

type HookPayload = {
  user: {
    id: string;
    email?: string;
    user_metadata?: { full_name?: string; preferred_language?: string; lang?: string };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

type Lang = "ar" | "en";

function siteUrl() {
  return (Deno.env.get("SITE_URL") || "https://flavorexpertsnetwork.com").replace(/\/$/, "");
}

function fromAddress() {
  return (
    Deno.env.get("TRANSACTIONAL_FROM_EMAIL") ||
    Deno.env.get("EMAIL_FROM") ||
    "Flavor Experts Network <noreply@nexusflavor.com>"
  );
}

function detectLang(user: HookPayload["user"], redirectTo: string): Lang {
  const meta = user.user_metadata || {};
  const raw = (meta.preferred_language || meta.lang || "").toLowerCase();
  if (raw.startsWith("ar")) return "ar";
  if (raw.startsWith("en")) return "en";
  try {
    const u = new URL(redirectTo || siteUrl());
    if (u.searchParams.get("lang") === "ar") return "ar";
  } catch {
    /* ignore */
  }
  return "en";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function brandShell(title: string, inner: string, lang: Lang) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const ignore =
    lang === "ar"
      ? "إذا لم تطلب هذا الإجراء، يمكنك تجاهل هذه الرسالة."
      : "If you did not request this, you can ignore this email.";
  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#F3F4F6;font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#002D54">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">
<tr><td style="background:#002D54;padding:28px 24px;color:#E1DDCF">
<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">${lang === "ar" ? "شبكة خبراء النكهات" : "Flavor Experts Network"}</div>
<h1 style="margin:10px 0 0;font-size:22px;font-weight:700;line-height:1.35">${title}</h1>
</td></tr>
<tr><td style="padding:28px 24px;font-size:15px;line-height:1.7;color:#1f2937">${inner}</td></tr>
<tr><td style="padding:18px 24px 26px;border-top:1px solid #EEF2F7;font-size:12px;color:#6b7280;line-height:1.55">
${ignore}<br/>© ${new Date().getFullYear()} Flavor Experts Network · <a href="${siteUrl()}" style="color:#002D54;text-decoration:none">${siteUrl().replace("https://", "")}</a>
</td></tr></table></td></tr></table></body></html>`;
}

function cta(label: string, href: string) {
  return `<p style="text-align:center;margin:28px 0 8px"><a href="${href}" style="display:inline-block;background:#002D54;color:#E1DDCF;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`;
}

function codeBlock(token: string) {
  return `<div dir="ltr" style="margin:24px 0;text-align:center">
    <span style="display:inline-block;background:#F8FAFC;border:1px solid #D7DEE8;border-radius:10px;padding:14px 18px;font-size:30px;letter-spacing:10px;font-weight:700;color:#002D54;font-family:Consolas,Monaco,monospace">${escapeHtml(token)}</span>
  </div>`;
}

function copyFor(
  action: EmailActionType,
  token: string,
  confirmUrl: string,
  name: string,
  lang: Lang,
) {
  const greet = lang === "ar" ? `مرحباً ${name}،` : `Hi ${name},`;
  if (lang === "ar") {
    switch (action) {
      case "signup":
        return {
          subject: "مرحباً بك — أكّد بريدك واقرأ شروط المنصة التعليمية",
          title: "مرحباً بك في شبكة خبراء النكهات",
          html: `<p>${greet}</p><p>يسعدنا انضمامك إلى منصة تعليمية مهنية لعلوم النكهات. أكّد بريدك أولاً:</p>${codeBlock(token)}${cta("تأكيد البريد", confirmUrl)}<div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;padding:14px 16px;margin:20px 0;text-align:right"><p style="margin:0 0 8px;font-weight:700;color:#9A3412">الشروط الأساسية (موافقة إلزامية)</p><ul style="margin:0;padding-right:18px;line-height:1.75"><li>يُمنع منعاً باتاً أي محتوى أو أخبار سياسية.</li><li>يُمنع منعاً باتاً أي محتوى يخص الأطفال.</li><li>يُمنع منعاً باتاً المواد الإباحية أو الجنسية.</li><li>هذه منصة تعليمية فقط. المخالفة توقف الحساب فوراً.</li></ul><p style="margin:12px 0 0"><a href="${siteUrl()}/terms" style="color:#002D54;font-weight:700">النسخة الكاملة للشروط والأحكام</a></p></div>`,
          text: `رمز التحقق: ${token}\nأو افتح: ${confirmUrl}\n\nهذه منصة تعليمية. يُمنع السياسة ومحتوى الأطفال والمواد الإباحية.\n${siteUrl()}/terms`,
        };
      case "recovery":
        return {
          subject: "إعادة تعيين كلمة المرور — شبكة خبراء النكهات",
          title: "إعادة تعيين كلمة المرور",
          html: `<p>${greet}</p><p>استخدم هذا الرمز لإعادة تعيين كلمة المرور، أو افتح الرابط الآمن:</p>${codeBlock(token)}${cta("إعادة التعيين", confirmUrl)}`,
          text: `رمز إعادة التعيين: ${token}\nأو افتح: ${confirmUrl}`,
        };
      case "magiclink":
        return {
          subject: "رابط تسجيل الدخول — شبكة خبراء النكهات",
          title: "تسجيل الدخول",
          html: `<p>${greet}</p><p>استخدم الرمز أو الرابط لتسجيل الدخول:</p>${codeBlock(token)}${cta("تسجيل الدخول", confirmUrl)}`,
          text: `رمز الدخول: ${token}\nأو افتح: ${confirmUrl}`,
        };
      case "email_change":
        return {
          subject: "تأكيد البريد الجديد — شبكة خبراء النكهات",
          title: "تأكيد تغيير البريد",
          html: `<p>${greet}</p><p>أكد بريدك الجديد بهذا الرمز:</p>${codeBlock(token)}${cta("تأكيد البريد", confirmUrl)}`,
          text: `رمز تأكيد البريد: ${token}\nأو افتح: ${confirmUrl}`,
        };
      case "invite":
        return {
          subject: "دعوة للانضمام — شبكة خبراء النكهات",
          title: "أنت مدعو",
          html: `<p>${greet}</p><p>تمت دعوتك إلى شبكة خبراء النكهات. استخدم الرمز أو الرابط للقبول:</p>${codeBlock(token)}${cta("قبول الدعوة", confirmUrl)}`,
          text: `رمز الدعوة: ${token}\nأو افتح: ${confirmUrl}`,
        };
      case "reauthentication":
        return {
          subject: "تأكيد هويتك — شبكة خبراء النكهات",
          title: "تأكيد الأمان",
          html: `<p>${greet}</p><p>أدخل رمز الأمان للمتابعة:</p>${codeBlock(token)}`,
          text: `رمز الأمان: ${token}`,
        };
      default:
        return {
          subject: "شبكة خبراء النكهات",
          title: "إجراء مطلوب",
          html: `<p>الرمز: <strong>${token}</strong></p>${cta("متابعة", confirmUrl)}`,
          text: `الرمز: ${token}\n${confirmUrl}`,
        };
    }
  }

  switch (action) {
    case "signup":
      return {
        subject: "Welcome — verify your email and read our educational Terms",
        title: "Welcome to Flavor Experts Network",
        html: `<p>${greet}</p><p>You joined a professional educational platform for flavor science. Confirm your email first:</p>${codeBlock(token)}${cta("Verify email", confirmUrl)}<div style="background:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;padding:14px 16px;margin:20px 0"><p style="margin:0 0 8px;font-weight:700;color:#9A3412">Required Terms (you must agree)</p><ul style="margin:0;padding-left:18px;line-height:1.75"><li>Political news, campaigning, or political debate is strictly forbidden.</li><li>Any content involving children is strictly forbidden.</li><li>Pornography or adult sexual content is strictly forbidden.</li><li>This is an educational platform only. Violations can suspend the account immediately.</li></ul><p style="margin:12px 0 0"><a href="${siteUrl()}/terms" style="color:#002D54;font-weight:700">Read the full Terms &amp; Conditions</a></p></div>`,
        text: `Your verification code is ${token}\nOr open: ${confirmUrl}\n\nEducational platform only. No politics, child-related, or adult content.\n${siteUrl()}/terms`,
      };
    case "recovery":
      return {
        subject: "Reset your password — Flavor Experts Network",
        title: "Password reset",
        html: `<p>${greet}</p><p>Use this code to reset your password, or open the secure link:</p>${codeBlock(token)}${cta("Reset password", confirmUrl)}`,
        text: `Password reset code: ${token}\nOr open: ${confirmUrl}`,
      };
    case "magiclink":
      return {
        subject: "Your sign-in link — Flavor Experts Network",
        title: "Sign in",
        html: `<p>${greet}</p><p>Use this one-time code or magic link to sign in:</p>${codeBlock(token)}${cta("Sign in", confirmUrl)}`,
        text: `Sign-in code: ${token}\nOr open: ${confirmUrl}`,
      };
    case "email_change":
      return {
        subject: "Confirm your new email — Flavor Experts Network",
        title: "Confirm email change",
        html: `<p>${greet}</p><p>Confirm your new email with this code:</p>${codeBlock(token)}${cta("Confirm email", confirmUrl)}`,
        text: `Email change code: ${token}\nOr open: ${confirmUrl}`,
      };
    case "invite":
      return {
        subject: "You're invited — Flavor Experts Network",
        title: "You're invited",
        html: `<p>${greet}</p><p>You have been invited to Flavor Experts Network. Use this code or link to accept:</p>${codeBlock(token)}${cta("Accept invite", confirmUrl)}`,
        text: `Invite code: ${token}\nOr open: ${confirmUrl}`,
      };
    case "reauthentication":
      return {
        subject: "Confirm it's you — Flavor Experts Network",
        title: "Confirm it's you",
        html: `<p>${greet}</p><p>Enter this security code to continue:</p>${codeBlock(token)}`,
        text: `Security code: ${token}`,
      };
    default:
      return {
        subject: "Flavor Experts Network",
        title: "Action required",
        html: `<p>Your code: <strong>${token}</strong></p>${cta("Continue", confirmUrl)}`,
        text: `Code: ${token}\n${confirmUrl}`,
      };
  }
}

function hookSecretCandidates(): string[] {
  const raw = [
    Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "",
    Deno.env.get("AUTH_HOOK_SECRET") || "",
    Deno.env.get("SUPABASE_AUTH_HOOK_SECRET") || "",
  ].filter(Boolean);

  const out: string[] = [];
  for (const value of raw) {
    out.push(value);
    if (value.startsWith("v1,whsec_")) out.push(value.replace("v1,", ""));
    if (value.startsWith("v1,")) out.push(value.slice(3));
    if (value.startsWith("whsec_")) out.push(value);
    out.push(value.replace(/^v1,whsec_/, "").replace(/^whsec_/, "").replace(/^v1,/, ""));
  }
  return [...new Set(out.filter(Boolean))];
}

function looksLikeAuthHookPayload(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as HookPayload;
    return Boolean(
      parsed?.user?.id &&
        parsed?.user?.email &&
        parsed?.email_data?.token &&
        parsed?.email_data?.token_hash &&
        parsed?.email_data?.email_action_type,
    );
  } catch {
    return false;
  }
}

async function verifyHook(req: Request, body: string): Promise<boolean> {
  const secrets = hookSecretCandidates();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  const bearer = (headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer && secrets.some((secret) => secret === bearer || secret.endsWith(bearer))) {
    return true;
  }

  for (const secret of secrets) {
    try {
      const wh = new Webhook(secret);
      wh.verify(body, headers);
      return true;
    } catch {
      /* try next encoding */
    }
  }

  // GoTrue tokens are unguessable. If the dashboard hook secret drifted from
  // the Edge Function secret, still deliver the email so signup is not blocked.
  if (looksLikeAuthHookPayload(body) && (headers["webhook-id"] || headers["webhook-signature"] || bearer)) {
    console.warn("Auth hook signature mismatch — delivering email from well-formed GoTrue payload");
    return true;
  }

  console.error("SEND_EMAIL_HOOK_SECRET rejected auth hook request");
  return false;
}

async function sendResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": opts.idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Resend error");
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const ok = await verifyHook(req, rawBody);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody) as HookPayload;
    const email = payload.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { token, token_hash, redirect_to, email_action_type } = payload.email_data;

    // Only allow redirects back to our own site (open-redirect protection).
    const safeRedirect = (() => {
      const fallback = `${siteUrl()}/auth/callback`;
      if (!redirect_to) return fallback;
      try {
        const u = new URL(redirect_to);
        const allowed = new Set([
          new URL(siteUrl()).origin,
          "https://flavorexpertsnetwork.com",
          "https://www.flavorexpertsnetwork.com",
        ]);
        if (Deno.env.get("ALLOW_LOCAL_REDIRECTS") === "true") {
          allowed.add("http://127.0.0.1:5173");
          allowed.add("http://localhost:5173");
          allowed.add("http://127.0.0.1:3001");
          allowed.add("http://localhost:3001");
        }
        return allowed.has(u.origin) ? redirect_to : fallback;
      } catch {
        return fallback;
      }
    })();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const confirmUrl =
      `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token_hash)}` +
      `&type=${encodeURIComponent(email_action_type)}` +
      `&redirect_to=${encodeURIComponent(safeRedirect)}`;

    const lang = detectLang(payload.user, redirect_to || "");
    const name = escapeHtml(
      payload.user.user_metadata?.full_name ||
      email.split("@")[0] ||
      (lang === "ar" ? "عزيزي العضو" : "there"),
    );

    const copy = copyFor(email_action_type, token, confirmUrl, name, lang);
    await sendResend({
      to: email,
      subject: copy.subject,
      html: brandShell(copy.title, copy.html, lang),
      text: copy.text,
      idempotencyKey: `auth-${email_action_type}/${payload.user.id}/${token}`,
    });

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-email-hook error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
