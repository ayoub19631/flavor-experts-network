-- Local/staging RLS assertions for the publications library.
-- Do not run against production. Apply 20260902120000_publications_library.sql first.

-- Expected outcomes:
-- 1. anon can SELECT only published+public rows
-- 2. authenticated members can SELECT published+members rows
-- 3. authors can UPDATE their own draft only
-- 4. authors cannot call publish_publication
-- 5. assigned reviewers can SELECT under_review rows assigned to them
-- 6. private files are not readable by other members
-- 7. published content updates without publications.allow_published_edit fail

SELECT 'See docs/PUBLICATIONS.md for the role-by-role matrix and how to execute these checks with supabase test db.' AS note;
