export function slugifyPublication(input: string): string {
  const value = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return value || "publication";
}

export function isSafeStorageSegment(value: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(value) && !value.includes("..");
}

export function buildPublicationStoragePath(publicationId: string, fileId: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${publicationId}/${fileId}/${random}.${ext}`;
}

export function extensionFromName(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}
