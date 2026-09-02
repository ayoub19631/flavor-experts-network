import { supabase } from "@/lib/supabase";
import { buildPublicationStoragePath, extensionFromName } from "./slug";
import type { PublicationFile, PublicationFileKind, PublicationVisibility } from "./types";

export const PUBLICATION_BUCKET = "publications";
export const MAX_PUBLICATION_FILE_BYTES = 50 * 1024 * 1024;

export const ALLOWED_PUBLICATION_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "txt", "csv", "xlsx", "docx"]);

export type ResolvedFileUrl = {
  url: string | null;
  error: string | null;
  expired?: boolean;
  missing?: boolean;
  legacy?: boolean;
};

export function validatePublicationFile(file: File): string | null {
  if (file.size > MAX_PUBLICATION_FILE_BYTES) return "File must be 50MB or smaller.";
  const ext = extensionFromName(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) return "File extension is not allowed.";
  if (file.type && !ALLOWED_PUBLICATION_MIME.has(file.type)) return "File type is not allowed.";
  return null;
}

export async function createFreshSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60 * 15,
): Promise<ResolvedFileUrl> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
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
    return {
      url: input.file_url,
      error: null,
      legacy: true,
    };
  }
  return { url: null, error: "This file is missing or has not been uploaded yet.", missing: true };
}

export async function uploadPublicationFile(input: {
  publicationId: string;
  file: File;
  kind: PublicationFileKind;
  visibility: PublicationVisibility;
  language?: "en" | "ar" | null;
  isDownloadable?: boolean;
}): Promise<{ file: PublicationFile | null; error: string | null }> {
  const validation = validatePublicationFile(input.file);
  if (validation) return { file: null, error: validation };

  const fileId = crypto.randomUUID();
  const path = buildPublicationStoragePath(input.publicationId, fileId, input.file.name);
  const { error: uploadError } = await supabase.storage.from(PUBLICATION_BUCKET).upload(path, input.file, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) return { file: null, error: uploadError.message };

  const { data, error } = await supabase
    .from("publication_files")
    .insert({
      id: fileId,
      publication_id: input.publicationId,
      storage_path: path,
      bucket_name: PUBLICATION_BUCKET,
      kind: input.kind,
      mime_type: input.file.type || null,
      file_size: input.file.size,
      language: input.language || null,
      is_downloadable: Boolean(input.isDownloadable),
      visibility: input.visibility,
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
