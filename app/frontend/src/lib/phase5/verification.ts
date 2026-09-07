import { supabase } from "@/lib/supabase";
import { isAllowedVerificationFile, sanitizeUploadName } from "./mentions";

export type VerificationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_more_information"
  | "more_information_required"
  | "revoked";

export type VerificationRequest = {
  id: string;
  user_id: string;
  kind: "professional" | "company";
  status: VerificationStatus;
  notes?: string | null;
  decision_reason?: string | null;
  full_name?: string | null;
  organization_name?: string | null;
  country?: string | null;
  website?: string | null;
  attestation_accepted?: boolean;
  created_at: string;
  updated_at: string;
};

export type VerificationDocument = {
  id: string;
  request_id: string;
  storage_path: string;
  mime_type?: string | null;
  original_name?: string | null;
  file_size?: number | null;
};

export async function fetchMyVerification() {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .in("kind", ["professional", "company"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: (data as VerificationRequest | null) || null, error: error?.message || null };
}

export async function upsertVerificationDraft(values: {
  kind: "professional" | "company";
  full_name?: string;
  organization_name?: string;
  country?: string;
  website?: string;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc("upsert_verification_draft", {
    p_kind: values.kind,
    p_full_name: values.full_name || null,
    p_organization_name: values.organization_name || null,
    p_country: values.country || null,
    p_website: values.website || null,
    p_notes: values.notes || null,
  });
  return { id: (data as string) || null, error: error?.message || null };
}

export async function submitVerification(requestId: string, attestation: boolean) {
  const { error } = await supabase.rpc("submit_verification_request", {
    p_request_id: requestId,
    p_attestation: attestation,
  });
  return { error: error?.message || null };
}

export async function listVerificationDocuments(requestId: string) {
  const { data, error } = await supabase
    .from("verification_documents")
    .select("id, request_id, storage_path, mime_type, original_name, file_size")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  return { data: (data as VerificationDocument[]) || [], error: error?.message || null };
}

export async function uploadVerificationFile(
  userId: string,
  requestId: string,
  file: File,
  onProgress?: (value: number) => void,
) {
  const check = isAllowedVerificationFile(file);
  if (!check.ok) return { error: check.reason, path: null };
  const safe = sanitizeUploadName(file.name.replace(/\.[^.]+$/, ""));
  const path = `${userId}/${requestId}/${crypto.randomUUID()}-${safe}.${check.ext}`;
  onProgress?.(15);
  const { error: uploadError } = await supabase.storage.from("verifications").upload(path, file, {
    contentType: check.mime,
    upsert: false,
  });
  if (uploadError) return { error: uploadError.message, path: null };
  onProgress?.(80);
  const { error } = await supabase.from("verification_documents").insert({
    request_id: requestId,
    storage_path: path,
    bucket_name: "verifications",
    mime_type: check.mime,
    uploaded_by: userId,
    original_name: file.name,
    file_size: file.size,
  });
  onProgress?.(100);
  return { error: error?.message || null, path };
}

export async function signedVerificationUrl(path: string) {
  const { data: allowed, error: accessError } = await supabase.rpc("can_access_verification_object", {
    p_path: path,
  });
  if (accessError) return { url: null, error: accessError.message };
  if (!allowed) return { url: null, error: "Not allowed to open this document." };
  const { data, error } = await supabase.storage.from("verifications").createSignedUrl(path, 120);
  return { url: data?.signedUrl || null, error: error?.message || null };
}

export async function removeVerificationDocument(id: string, path: string) {
  await supabase.storage.from("verifications").remove([path]);
  const { error } = await supabase.from("verification_documents").delete().eq("id", id);
  return { error: error?.message || null };
}

export async function reviewVerification(id: string, decision: string, reason: string) {
  const { error } = await supabase.rpc("review_verification_request", {
    p_request_id: id,
    p_decision: decision,
    p_reason: reason,
  });
  return { error: error?.message || null };
}

export async function listVerificationQueue(filters: { status?: string; kind?: string }) {
  let query = supabase.from("verification_requests").select("*").order("updated_at", { ascending: false }).limit(40);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.kind) query = query.eq("kind", filters.kind);
  const { data, error } = await query;
  return { data: (data as VerificationRequest[]) || [], error: error?.message || null };
}
