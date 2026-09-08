import { supabase } from "@/lib/supabase";
import type { PublicMaterial, PublicSupplier, RfqLineInput } from "./types";

export async function listPublicSuppliers(query = "", country?: string, type?: string) {
  const { data, error } = await supabase.rpc("list_public_suppliers", {
    p_query: query || null,
    p_country: country || null,
    p_type: type || null,
    p_market: null,
    p_limit: 36,
  });
  if (error) throw error;
  return (data as PublicSupplier[]) || [];
}

export async function listPublicMaterials(query = "", category?: string, supplierSlug?: string) {
  const { data, error } = await supabase.rpc("list_public_materials", {
    p_query: query || null,
    p_category: category || null,
    p_country: null,
    p_supplier_slug: supplierSlug || null,
    p_limit: 36,
  });
  if (error) throw error;
  return (data as PublicMaterial[]) || [];
}

export async function getPublicSupplier(slug: string) {
  const { data, error } = await supabase.rpc("get_public_supplier", { p_slug: slug });
  if (error) throw error;
  return (data as PublicSupplier | null) || null;
}

export async function getPublicMaterial(slug: string) {
  const { data, error } = await supabase.rpc("get_public_material", { p_slug: slug });
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

export async function upsertSupplierProfile(payload: Record<string, unknown>, submitReview = false) {
  const { data, error } = await supabase.rpc("upsert_supplier_profile", {
    p_legal_name: payload.legal_name ?? null,
    p_trade_name: payload.trade_name,
    p_supplier_type: payload.supplier_type,
    p_country: payload.country ?? null,
    p_city: payload.city ?? null,
    p_about: payload.about ?? null,
    p_website: payload.website ?? null,
    p_linkedin_url: payload.linkedin_url ?? null,
    p_public_email: payload.public_email ?? null,
    p_public_phone: payload.public_phone ?? null,
    p_markets: payload.markets ?? [],
    p_logo_url: payload.logo_url ?? null,
    p_cover_url: payload.cover_url ?? null,
    p_submit_review: submitReview,
  });
  if (error) throw error;
  return data;
}

export async function upsertSupplierMaterial(payload: Record<string, unknown>, submitReview = false) {
  const { data, error } = await supabase.rpc("upsert_supplier_material", {
    p_id: payload.id ?? null,
    p_trade_name: payload.trade_name,
    p_generic_name: payload.generic_name ?? null,
    p_category: payload.category ?? null,
    p_e_number: payload.e_number ?? null,
    p_fema: payload.fema ?? null,
    p_cas: payload.cas ?? null,
    p_food_grade: payload.food_grade ?? null,
    p_manufacturer: payload.manufacturer ?? null,
    p_country_of_origin: payload.country_of_origin ?? null,
    p_country_of_manufacture: payload.country_of_manufacture ?? null,
    p_physical_form: payload.physical_form ?? null,
    p_applications: payload.applications ?? [],
    p_solubility: payload.solubility ?? null,
    p_shelf_life: payload.shelf_life ?? null,
    p_packaging: payload.packaging ?? null,
    p_moq: payload.moq ?? null,
    p_moq_unit: payload.moq_unit ?? null,
    p_lead_time_days: payload.lead_time_days ?? null,
    p_sample_available: payload.sample_available ?? null,
    p_incoterms: payload.incoterms ?? [],
    p_regulatory_regions: payload.regulatory_regions ?? [],
    p_certifications: payload.certifications ?? [],
    p_submit_review: submitReview,
  });
  if (error) throw error;
  return data;
}

export async function createRfq(input: {
  title: string;
  notes?: string;
  delivery_country?: string;
  delivery_city?: string;
  currency?: string;
  incoterm?: string;
  needed_by?: string;
  wants_sample?: boolean;
  expires_at?: string;
  company_id?: string | null;
  lines: RfqLineInput[];
}) {
  const { data, error } = await supabase.rpc("create_rfq", {
    p_title: input.title,
    p_notes: input.notes ?? null,
    p_delivery_country: input.delivery_country ?? null,
    p_delivery_city: input.delivery_city ?? null,
    p_currency: input.currency ?? null,
    p_incoterm: input.incoterm ?? null,
    p_needed_by: input.needed_by || null,
    p_wants_sample: input.wants_sample ?? false,
    p_expires_at: input.expires_at || null,
    p_company_id: input.company_id ?? null,
    p_lines: input.lines,
  });
  if (error) throw error;
  return data as string;
}

export async function publishRfq(id: string, supplierIds?: string[]) {
  const { data, error } = await supabase.rpc("publish_rfq", {
    p_rfq_id: id,
    p_supplier_ids: supplierIds?.length ? supplierIds : null,
  });
  if (error) throw error;
  return data;
}

export async function getRfq(id: string) {
  const { data, error } = await supabase.rpc("get_rfq", { p_rfq_id: id });
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

export async function compareRfqQuotes(id: string) {
  const { data, error } = await supabase.rpc("compare_rfq_quotes", { p_rfq_id: id });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function submitQuote(payload: Record<string, unknown>) {
  const { data, error } = await supabase.rpc("submit_rfq_quote", {
    p_rfq_id: payload.rfq_id,
    p_price: payload.price,
    p_currency: payload.currency,
    p_price_unit: payload.price_unit ?? null,
    p_moq: payload.moq ?? null,
    p_packaging: payload.packaging ?? null,
    p_lead_time_days: payload.lead_time_days ?? null,
    p_incoterm: payload.incoterm ?? null,
    p_valid_until: payload.valid_until || null,
    p_sample_terms: payload.sample_terms ?? null,
    p_payment_terms: payload.payment_terms ?? null,
    p_notes: payload.notes ?? null,
  });
  if (error) throw error;
  return data;
}

export async function decideQuote(quoteId: string, action: string, reason: string) {
  const { error } = await supabase.rpc("decide_rfq_quote", {
    p_quote_id: quoteId,
    p_action: action,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function sendRfqMessage(rfqId: string, supplierId: string, body: string) {
  const { error } = await supabase.rpc("send_rfq_message", {
    p_rfq_id: rfqId,
    p_supplier_id: supplierId,
    p_body: body,
  });
  if (error) throw error;
}

export async function openMarketplaceFile(fileId: string) {
  const { data, error } = await supabase.rpc("marketplace_file_access", { p_file_id: fileId });
  if (error) throw error;
  const access = data as { bucket: string; path: string };
  const signed = await supabase.storage.from(access.bucket).createSignedUrl(access.path, 120);
  if (signed.error || !signed.data?.signedUrl) throw signed.error || new Error("Signed URL unavailable");
  return signed.data.signedUrl;
}
