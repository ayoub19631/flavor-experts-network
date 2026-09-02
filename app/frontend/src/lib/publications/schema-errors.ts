/** Tables or RPCs that are not on this environment yet should look empty, not broken. */
export function isMissingSchemaError(message?: string | null): boolean {
  if (!message) return false;
  const text = message.toLowerCase();
  return (
    text.includes("does not exist") ||
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    text.includes("pgrst205") ||
    text.includes("pgrst202")
  );
}
