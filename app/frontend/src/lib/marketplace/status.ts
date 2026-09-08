import type { QuoteStatus, RfqStatus } from "./types";

const TERMINAL_RFQ: RfqStatus[] = ["closed", "cancelled", "expired", "accepted"];
const OPEN_QUOTE_RFQ: RfqStatus[] = ["published", "invited", "receiving_quotes", "under_review", "shortlisted"];

export function rfqIsTerminal(status: string): boolean {
  return TERMINAL_RFQ.includes(status as RfqStatus);
}

export function rfqAcceptsQuotes(status: string): boolean {
  return OPEN_QUOTE_RFQ.includes(status as RfqStatus);
}

export function quoteCanWithdraw(status: string, rfqStatus: string): boolean {
  return status !== "accepted" && !rfqIsTerminal(rfqStatus);
}

export function quoteIsVisibleToBuyer(status: string): boolean {
  return status !== "draft";
}

export function compareDisclaimer(): string {
  return "Prices stay in the original currency. The lowest price is not automatically the best offer.";
}
