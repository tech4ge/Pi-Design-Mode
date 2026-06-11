# Target React 18+, not Next.js exclusively

The `data-oid` injection is a build-time AST transform — the concept applies to any bundler. We ship a shared AST core with SWC (Next.js) and Vite adapters rather than locking to SWC-only. The cost is near-zero (the adapters are ~20 lines each); the gain is that we're a "React design mode" tool, not a "Next.js design mode" tool. Minimum React version is 18.

**Considered options:** Next.js/SWC-only (faster to ship, but locks out Vite+React, Remix, Astro).
