# Phase 3B — deferred publications work

- Import the final *Flavor Creation Fundamentals – Volume 1* manuscript, cover, PDF, and verified author metadata.
- Appoint an editorial board before using the phrase “scientific journal”.
- Reviewer assignment UI (the assignment table already exists).
- Dynamic request-time sitemap of every public book/chapter/research slug.
- True HTTP 404 for unknown slugs (the Vite/Vercel SPA rewrite currently returns 200 + in-app 404).
- Store academy lab/capstone submission paths instead of short-lived signed URLs.
- Split `academy-i18n` out of the public bundle.
- In-book full-text search across unloaded chapters via a dedicated RPC.
- Cover image variants / CDN transforms.
