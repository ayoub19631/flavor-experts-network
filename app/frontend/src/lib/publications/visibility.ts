import type {
  AccessContext,
  FileAccessContext,
  Publication,
  PublicationFile,
  PublicationStatus,
  PublicationVisibility,
} from "./types";

const PUBLIC_STATUSES: PublicationStatus[] = ["published", "corrected", "retracted"];
const AUTHOR_EDITABLE: PublicationStatus[] = ["draft", "submitted", "revision_required", "revised"];

export function isPubliclyListedStatus(status: PublicationStatus): boolean {
  return PUBLIC_STATUSES.includes(status);
}

export function canReadPublication(
  publication: Pick<Publication, "status" | "visibility" | "created_by">,
  ctx: AccessContext = {},
): boolean {
  if (ctx.isAdmin || ctx.isEditor) return true;
  if (ctx.userId && publication.created_by === ctx.userId) return true;
  if (ctx.isAssignedReviewer) return true;
  if (!isPubliclyListedStatus(publication.status)) return false;
  if (publication.visibility === "public") return true;
  if (publication.visibility === "members") return Boolean(ctx.userId);
  return false;
}

export function canAuthorEditPublication(
  publication: Pick<Publication, "status" | "created_by">,
  ctx: AccessContext = {},
): boolean {
  if (ctx.isAdmin || ctx.isEditor) return true;
  return Boolean(ctx.userId && publication.created_by === ctx.userId && AUTHOR_EDITABLE.includes(publication.status));
}

export function canPublishPublication(ctx: AccessContext = {}): boolean {
  return ctx.isAdmin === true;
}

export function canChangeEditorialStatus(ctx: AccessContext = {}): boolean {
  return Boolean(ctx.isAdmin || ctx.isEditor);
}

export function canAccessPublicationFile(
  publication: Pick<Publication, "status" | "visibility" | "created_by">,
  file: Pick<PublicationFile, "visibility" | "uploaded_by">,
  ctx: FileAccessContext = {},
): boolean {
  if (!canReadPublication(publication, ctx)) return false;
  if (ctx.isAdmin || publication.created_by === ctx.userId || ctx.isUploader) return true;
  if (file.visibility === "public") return true;
  if (file.visibility === "members") return Boolean(ctx.userId);
  return false;
}

export function visitorSeesDraft(
  publication: Pick<Publication, "status" | "visibility" | "created_by">,
  ctx: AccessContext = {},
): boolean {
  return publication.status === "draft" && canReadPublication(publication, ctx);
}

export function isMembersOnlyLabel(visibility: PublicationVisibility): boolean {
  return visibility === "members" || visibility === "private";
}
