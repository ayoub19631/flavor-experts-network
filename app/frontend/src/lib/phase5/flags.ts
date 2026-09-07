export function isPhase5WorkflowsEnabled() {
  return import.meta.env.VITE_FEATURE_PHASE5_WORKFLOWS !== "false";
}

export function isMissingRelation(error?: string | null) {
  if (!error) return false;
  return /could not find the (function|table|relation)|schema cache|does not exist/i.test(error);
}
