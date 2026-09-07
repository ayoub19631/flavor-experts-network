import { supabase } from "@/lib/supabase";
import { buildPublicationStoragePath, extensionFromName } from "./slug";
import type { PublicationFile, PublicationFileKind, PublicationVisibility } from "./types";

export const PUBLICATION_BUCKET = "publications";
export const DEFAULT_COVER_MAX_BYTES = 5 * 1024 * 1024;
export const DEFAULT_PDF_MAX_BYTES = 50 * 1024 * 1024;
export const DEFAULT_SIGNED_TTL = 900;

const COVER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const COVER_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

export type ResolvedFileUrl = {
  url: string | null;
  error: string | null;
  expired?: boolean;
  missing?: boolean;
  legacy?: boolean;
};

function bytesStartWith(buffer: ArrayBuffer, signature: number[]): boolean {
  const view = new Uint8Array(buffer);
  return signature.every((value, index) => view[index] === value);
}

export async function sniffPublicationMime(file: File): Promise<string | null> {
  const header = await file.slice(0, 16).arrayBuffer();
  const view = new Uint8Array(header);
  if (bytesStartWith(header, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (bytesStartWith(header, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytesStartWith(header, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (
    view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46
    && view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function fetchPublicationUploadLimits() {
  const { data } = await supabase
    .from("publication_settings")
    .select("key, value_int")
    .in("key", ["cover_max_bytes", "pdf_max_bytes", "signed_url_ttl_seconds"]);
  const map = new Map((data || []).map((row) => [row.key as string, Number(row.value_int) || 0]));
  return {
    coverMax: map.get("cover_max_bytes") || DEFAULT_COVER_MAX_BYTES,
    pdfMax: map.get("pdf_max_bytes") || DEFAULT_PDF_MAX_BYTES,
    signedTtl: map.get("signed_url_ttl_seconds") || DEFAULT_SIGNED_TTL,
  };
}

export async function validatePublicationFile(file: File, kind: PublicationFileKind): Promise<string | null> {
  const ext = extensionFromName(file.name);
  const sniffed = await sniffPublicationMime(file);
  const limits = await fetchPublicationUploadLimits();
  if (file.name.includes("..") || /[\\/]/.test(file.name)) return "Unsafe file name.";
  if (kind === "cover") {
    if (file.size <= 0 || file.size > limits.coverMax) return `Cover must be ${Math.round(limits.coverMax / 1024 / 1024)}MB or smaller.`;
    if (!COVER_EXT.has(ext) || !sniffed || !COVER_MIME.has(sniffed)) return "Cover must be JPEG, PNG, or WebP.";
    return null;
  }
  if (file.size <= 0 || file.size > limits.pdfMax) return `Document must be ${Math.round(limits.pdfMax / 1024 / 1024)}MB or smaller.`;
  if (ext !== "pdf" || sniffed !== "application/pdf") return "Documents must be PDF in this release.";
  return null;
}

export async function createFreshSignedUrl(
  bucket: string,
  path: string,
  expiresIn?: number,
): Promise<ResolvedFileUrl> {
  const ttl = expiresIn || (await fetchPublicationUploadLimits()).signedTtl;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) {
    const message = error?.message || "Could not create a download link.";
    const expired = /not found|expired|does not exist|object not found/i.test(message);
    return { url: null, error: message, expired, missing: expired };
  }
  return { url: data.signedUrl, error: null };
}

export async function resolveStoredFileUrl(input: {
  storage_path?: string | null;
  bucket_name?: string | null;
  file_url?: string | null;
}): Promise<ResolvedFileUrl> {
  if (input.storage_path && input.bucket_name) {
    return createFreshSignedUrl(input.bucket_name, input.storage_path);
  }
  if (input.file_url) {
    return { url: input.file_url, error: null, legacy: true };
  }
  return { url: null, error: "This file is missing or has not been uploaded yet.", missing: true };
}

export async function uploadPublicationFile(input: {
  publicationId: string;
  ownerId: string;
  file: File;
  kind: PublicationFileKind;
  visibility: PublicationVisibility;
  language?: "en" | "ar" | null;
  isDownloadable?: boolean;
}): Promise<{ file: PublicationFile | null; error: string | null }> {
  const validation = await validatePublicationFile(input.file, input.kind);
  if (validation) return { file: null, error: validation };

  const sniffed = await sniffPublicationMime(input.file);
  const ext = extensionFromName(input.file.name);
  const { error: assertError } = await supabase.rpc("assert_publication_upload", {
    p_kind: input.kind === "cover" ? "cover" : "document",
    p_mime: sniffed,
    p_ext: ext,
    p_size: input.file.size,
  });
  if (assertError) return { file: null, error: assertError.message };

  let path: string;
  try {
    path = buildPublicationStoragePath(input.ownerId, input.publicationId, `upload.${ext}`);
  } catch (error) {
    return { file: null, error: error instanceof Error ? error.message : "Unsafe storage path." };
  }

  const { error: uploadError } = await supabase.storage.from(PUBLICATION_BUCKET).upload(path, input.file, {
    contentType: sniffed || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) return { file: null, error: uploadError.message };

  const { data, error } = await supabase
    .from("publication_files")
    .insert({
      publication_id: input.publicationId,
      storage_path: path,
      bucket_name: PUBLICATION_BUCKET,
      kind: input.kind,
      mime_type: sniffed,
      file_size: input.file.size,
      language: input.language || null,
      is_downloadable: Boolean(input.isDownloadable),
      visibility: input.visibility,
      uploaded_by: input.ownerId,
    })
    .select("*")
    .single();

  if (error || !data) {
    await supabase.storage.from(PUBLICATION_BUCKET).remove([path]);
    return { file: null, error: error?.message || "File metadata could not be saved." };
  }

  if (input.kind === "cover") {
    await supabase.from("publications").update({ cover_image_path: path }).eq("id", input.publicationId);
  }

  return { file: data as PublicationFile, error: null };
}

export async function openPublicationDownload(file: PublicationFile): Promise<ResolvedFileUrl> {
  if (!file.is_downloadable && file.kind !== "cover") {
    return { url: null, error: "This file is not available for download." };
  }
  const resolved = await resolveStoredFileUrl(file);
  if (resolved.url) {
    await supabase.rpc("record_publication_event", {
      p_publication_id: file.publication_id,
      p_event_type: "download",
      p_file_id: file.id,
    });
  }
  return resolved;
}

export function storedDoiHref(doi?: string | null, doiUrl?: string | null): string | null {
  if (doiUrl && /^https:\/\/(dx\.)?doi\.org\/10\./i.test(doiUrl)) return doiUrl;
  if (doi && /^10\.\d{4,}\/\S+$/i.test(doi)) return `https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`;
  return null;
}
