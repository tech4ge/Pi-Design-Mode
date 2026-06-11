# Element-to-source mapping via data-oid, not React DevTools

React DevTools protocol provides element→source mapping with zero setup, but the protocol is undocumented and subject to breaking changes between React versions. We use build-time `data-oid` attribute injection instead — deterministic, stable, and under our control. The user adds one line to their bundler config. React DevTools remains a possible fallback for non-plugin projects.

**Considered options:** React DevTools protocol (runtime, zero-config but unstable), `__source` props (React 19 only, fragile), source maps in `.next/` (Next.js-specific, imprecise).
