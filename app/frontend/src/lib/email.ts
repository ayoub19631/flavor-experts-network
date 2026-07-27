/**
 * Client helpers for email-related UI.
 * Most transactional emails are sent by DB triggers / Edge Functions (Resend).
 */

import { supabase } from "./supabase";

/** Contact/enterprise notifications are sent by Postgres triggers after insert. */
export async function notifyContactSubmission(_args: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) {
  // Handled server-side after insert into contact_messages.
}

export async function notifyEnterpriseSubmission(_args: {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  services_interested?: string;
  message: string;
}) {
  // Handled server-side after insert into enterprise_requests.
}

export async function subscribeNewsletter(email: string, name?: string) {
  const { data, error } = await supabase.functions.invoke("submit-public-form", {
    body: { form: "newsletter", email, name: name || undefined, website_url: "" },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: String(data.error) };
  return { error: null };
}

export async function adminSendBroadcast(opts: {
  subject: string;
  body: string;
  recipients: "all" | "professional" | "enterprise" | "newsletter";
  email_type?: "newsletter" | "announcement" | "news";
}) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { type: "broadcast", ...opts },
  });
  if (error) return { error: error.message, sent: 0 };
  if (data?.error) return { error: String(data.error), sent: 0 };
  return { error: null, sent: Number(data?.sent || 0) };
}

export async function adminReplyToContact(messageId: string, replyBody: string) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { type: "reply", message_id: messageId, reply_body: replyBody },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: String(data.error) };
  return { error: null, id: data?.id as string | undefined };
}
