Status: deferred
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

SWC/Rust adapter for Next.js native support — currently blocked on Rust/WASM toolchain (C1 from original review).

### Why deferred

The current Babel-based transform works for Vite. Next.js uses SWC by default and compiles away from Babel. Building a native SWC transform requires:
- Rust toolchain for the transform plugin
- WASM compilation target for browser/Node compatibility
- Next.js plugin packaging format

This is a significant effort that doesn't unblock any current users (Vite users are unblocked). Revisit when:
- Next.js user demand exists
- Rust/WASM build pipeline is set up in the monorepo
- SWC plugin API stabilizes (currently still evolving)

### Key files (when implemented)

- `packages/react-plugin/src/transform-swc/` — Rust source for SWC transform
- `packages/react-plugin/src/next-plugin.ts` — Next.js plugin wrapper

## Acceptance criteria

- [ ] SWC transform produces same data-oid output as Babel transform
- [ ] Next.js plugin auto-configures on install
- [ ] Works with Next.js App Router + Pages Router
- [ ] Transform spec shared between Babel and SWC implementations
