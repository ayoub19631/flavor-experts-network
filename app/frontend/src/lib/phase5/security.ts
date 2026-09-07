const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APP_PATH = /^\/[A-Za-z0-9][A-Za-z0-9/_?#=&%.,-]*$/;

export function isValidProfileId(value?: string | null) {
  return !!value && PROFILE_ID.test(value);
}

export function clampPageSize(value: number, fallback = 20, max = 50) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

export function safeAppPath(link?: string | null) {
  if (!link) return "/";
  const trimmed = link.trim();
  if (trimmed.startsWith("//") || trimmed.includes("\\") || /\s/.test(trimmed)) return "/";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return "/";
  if (!APP_PATH.test(trimmed) || trimmed.length > 240) return "/";
  return trimmed;
}

export function shouldSkipSelfNotify(actorId?: string | null, recipientId?: string | null) {
  return !!actorId && !!recipientId && actorId === recipientId;
}

export function mentionDeliveryAllowed(input: {
  actorId: string;
  mentionedId: string;
  blocked: boolean;
  muted: boolean;
}) {
  if (!isValidProfileId(input.mentionedId)) return false;
  if (shouldSkipSelfNotify(input.actorId, input.mentionedId)) return false;
  if (input.blocked || input.muted) return false;
  return true;
}

export function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(isValidProfileId))];
}
