export function isPlatformStoredAvatar(url?: string | null): boolean {
  if (!url) return false;
  return /\/storage\/v1\/object\/(public|sign)\//i.test(url) || /\/platform-uploads\//i.test(url);
}

export function shouldReplaceAvatar(current?: string | null, incoming?: string | null): boolean {
  if (!incoming?.trim()) return false;
  if (isPlatformStoredAvatar(current)) return false;
  return incoming.trim() !== (current || "").trim();
}

export function shouldReplaceFullName(current?: string | null, incoming?: string | null): boolean {
  const next = incoming?.trim() || "";
  if (!next) return false;
  const existing = current?.trim() || "";
  if (!existing) return true;
  return existing === next;
}
