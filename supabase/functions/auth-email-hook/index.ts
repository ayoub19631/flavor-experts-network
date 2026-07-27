import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Auth Send Email Hook → Resend.
 * Configure in Dashboard → Authentication → Hooks → Send Email
 * Secrets: RESEND_API_KEY, EMAIL_FROM, SITE_URL
 * Optional: SEND_EMAIL_HOOK_SECRET (standard webhooks verify — set if using signed hooks)
 *
 * verify_jwt = false (Auth hooks use webhook secret / service path)
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
    user_metadata?: { full_name?: string };
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

function siteUrl() {
  return (Deno.env.get("SITE_URL") || "https://flavorexpertsnetwork.com").replace(/\/$/, "");
}

function fromAddress() {
  return Deno.env.get("EMAIL_FROM") || "Flavor Experts Network <noreply@nexusflavor.com>";
}

function brandShell(title: string, inner: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif;color:#0f2744">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
<tr><td style="background:linear-gradient(135deg,#0a3d6b,#0f2744);padding:28px 24px;color:#f5f0e6">
<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.8">Flavor Experts Network</div>
<h1 style="margin:8px 0 0;font-size:22px">${title}</h1>
</td></tr>
<tr><td style="padding:28px 24px;font-size:15px;line-height:1.65">${inner}</td></tr>
<tr><td style="padding:16px 24px 28px;border-top:1px solid #eef2f7;font-size:12px;color:#6b7280">
If you did not request this, you can ignore this email.<br/>© ${new Date().getFullYear()} Flavor Experts Network
</td></tr></table></td></tr></table></body></html>`;
}

function copyFor(action: EmailActionType, token: string, confirmUrl: string, name: string) {
  switch (action) {
    case "signup":
      return {
        subject: "Verify your email — Flavor Experts Network",
        title: "Confirm your email",
        html: `<p>Hi ${name},</p>
          <p>Enter this verification code in the app, or use the button below:</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;margin:24px 0;color:#0a3d6b">${token}</p>
          <p style="text-align:center"><a href="${confirmUrl}" style="display:inline-block;background:#0a3d6b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Verify email</a></p>`,
        text: `Your verification code is ${token}\nOr open: ${confirmUrl}`,
      };
    case "recovery":
      return {
        subject: "Reset your password — Flavor Experts Network",
        title: "Password reset",
        html: `<p>Hi ${name},</p>
          <p>Use this code to reset your password, or open the secure link:</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;margin:24px 0;color:#0a3d6b">${token}</p>
          <p style="text-align:center"><a href="${confirmUrl}" style="display:inline-block;background:#0a3d6b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>`,
        text: `Password reset code: ${token}\nOr open: ${confirmUrl}`,
      };
    case "magiclink":
      return {
        subject: "Your sign-in link — Flavor Experts Network",
        title: "Sign in",
        html: `<p>Hi ${name},</p>
          <p>Use this one-time code or magic link to sign in:</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;margin:24px 0;color:#0a3d6b">${token}</p>
          <p style="text-align:center"><a href="${confirmUrl}" style="display:inline-block;background:#0a3d6b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>`,
        text: `Sign-in code: ${token}\nOr open: ${confirmUrl}`,
      };
    case "email_change":
      return {
        subject: "Confirm your new email — Flavor Experts Network",
        title: "Confirm email change",
        html: `<p>Hi ${name},</p>
          <p>Confirm your new email with this code:</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;margin:24px 0;color:#0a3d6b">${token}</p>
          <p style="text-align:center"><a href="${confirmUrl}" style="display:inline-block;background:#0a3d6b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Confirm email</a></p>`,
        text: `Email change code: ${token}\nOr open: ${confirmUrl}`,
      };
    case "invite":
      return {
        subject: "You're invited — Flavor Experts Network",
        title: "You're invited",
        html: `<p>Hi ${name},</p>
          <p>You have been invited to Flavor Experts Network. Use this code or link to accept:</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;margin:24px 0;color:#0a3d6b">${token}</p>
          <p style="text-align:center"><a href="${confirmUrl}" style="display:inline-block;background:#0a3d6b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Accept invite</a></p>`,
        text: `Invite code: ${token}\nOr open: ${confirmUrl}`,
      };
    case "reauthentication":
      return {
        subject: "Confirm it's you — Flavor Experts Network",
        title: "Confirm it's you",
        html: `<p>Hi ${name},</p>
          <p>Enter this security code to continue:</p>
          <p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;margin:24px 0;color:#0a3d6b">${token}</p>`,
        text: `Security code: ${token}`,
      };
    default:
      return {
        subject: "Flavor Experts Network",
        title: "Action required",
        html: `<p>Your code: <strong>${token}</strong></p><p><a href="${confirmUrl}">Continue</a></p>`,
        text: `Code: ${token}\n${confirmUrl}`,
      };
  }
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
    const payload = (await req.json()) as HookPayload;
    const email = payload.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { token, token_hash, redirect_to, email_action_type } = payload.email_data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const confirmUrl =
      `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(token_hash)}` +
      `&type=${encodeURIComponent(email_action_type)}` +
      `&redirect_to=${encodeURIComponent(redirect_to || siteUrl() + "/auth/callback")}`;

    const name =
      payload.user.user_metadata?.full_name ||
      email.split("@")[0] ||
      "there";

    const copy = copyFor(email_action_type, token, confirmUrl, name);
    await sendResend({
      to: email,
      subject: copy.subject,
      html: brandShell(copy.title, copy.html),
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
