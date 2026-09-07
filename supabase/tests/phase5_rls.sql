-- Phase 5 RLS / RPC contracts.
-- Run only against a documented Staging database. Do not run on production.
-- These assertions expect Phase 5 migrations to be applied.

-- 1. User cannot read another user's notifications
-- 2. User cannot create a forged notification for someone else
-- 3. emit_event_notification skips actor = recipient
-- 4. Blocked pairs do not emit notifications
-- 5. Verification uploads must live under auth.uid()
-- 6. User cannot read another user's verification documents
-- 7. Unauthorized staff cannot review verification
-- 8. Approval grants verified_professional or verified_company
-- 9. User cannot grant themselves a role
-- 10. audit_logs cannot be updated or deleted from the client
-- 11. A company cannot read another company's applications
-- 12. Reporter sees only their own reports unless they can moderate
-- 13. Ordinary members cannot call list_moderation_queue
-- 14. Soft-deleted posts are hidden from public reads
-- 15. Restore is capability-gated
-- 16. Applicants can withdraw their own job applications
-- 17. member_mutes do not grant extra capabilities
-- 18. can_access_verification_object is owner or reviewer only
-- 19. review_verification_request writes audit_logs
-- 20. Duplicate idempotency keys do not create a second notification

SELECT 'Prepare with two members, one moderator, one admin on Staging, then execute the cases above via supabase test db or authenticated RPC calls.' AS note;

SELECT public.phase5_workflows_ready() AS phase5_ready;
