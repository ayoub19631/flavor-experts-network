-- Phase 5H — verification bucket limits only.
-- Corrective. Do not edit 4A–5G. No DROP. No user data changes.

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']
WHERE id = 'verifications' OR name = 'verifications';
