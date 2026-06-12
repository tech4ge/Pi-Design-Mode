Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/prd-distribution-readiness.md`

## What to build

Write a README.md at the repo root that covers installation and usage for both Vite+React and Next.js projects.

End-to-end behaviour: a new Pi user reads the README, follows the Quick Start for their framework, and has design mode working. They understand what it does, how to configure it, and what shortcuts are available.

### Structure

1. **What it does** — one paragraph. Click elements in browser, describe changes, LLM edits source code.
2. **Quick Start: Vite+React** — install plugin, add to vite.config.ts, run `/design`
3. **Quick Start: Next.js** — install plugin + SWC plugin, add to next.config.ts, add `PiDesignClient` to layout.tsx, run `/design`
4. **How it works** — brief architecture: data-oid transform → WS server → browser widget → Pi command → design_inspect tool
5. **Configuration** — `window.__PI_DESIGN_PORT`, `PiDesignViteOptions.projectRoot`
6. **Commands & Shortcuts** — `/design`, Alt+Click, Alt+Hover, Esc, Alt+R, ✕ button
7. **Development** — how to build, test, and install locally

## Acceptance criteria

- [ ] README.md exists at repo root
- [ ] Vite+React quick start is accurate and complete (install, config, run)
- [ ] Next.js quick start is accurate and complete (install, SWC config, layout import, run)
- [ ] All keyboard shortcuts documented
- [ ] Architecture section covers data-oid, WS, widget, Pi integration
- [ ] Development section covers build + install steps

## Blocked by

- #28 — extension build path must be documented accurately (dist/index.js vs src/index.ts)
