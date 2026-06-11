Status: ready-for-agent

## Parent

PRD: `.scratch/pi-design-mode/prd-browser-client-consolidation.md`

## What to build

Replace the Next.js client injection path. Currently `next.tsx` wraps a dynamic import of `client.ts` in a `PiDesignClient` React component. The new path: `next.tsx` does a bare `import "@pi-design/react-plugin/browser-client"` — the built IIFE runs as a side-effect, no React component needed.

Users change their layout from:
```tsx
import { PiDesignClient } from "@pi-design/react-plugin/next";
// ...
<PiDesignClient />
```
to:
```tsx
import "@pi-design/react-plugin/browser-client";
```

Wait — this import is in a Server Component (layout.tsx). The `"use client"` directive was on next.tsx to ensure browser-side execution. A bare import in a Server Component won't ship to the client.

So `next.tsx` stays as a `"use client"` component, but simplified to just trigger the import — no `PiDesignClient` wrapper, no `useEffect`, no conditional. The component renders null. The import is the side-effect.

Update `package.json` exports to add `./browser-client` path. Update `next.tsx` to import `browser-client` instead of `client`.

Delete `client.ts` — it is replaced entirely by `browser-client.ts`.

Verify end-to-end: run the Next.js test app (`test-app-nextjs/`), confirm widget appears, Alt+Click selects elements, `data-source` attributes in DOM, submit works.

## Acceptance criteria

- [ ] `client.ts` deleted from `packages/react-plugin/src/`
- [ ] `next.tsx` imports `@pi-design/react-plugin/browser-client` (not `client`)
- [ ] `next.tsx` no longer exports `PiDesignClient` — just a component that triggers the import
- [ ] `package.json` has `./browser-client` export
- [ ] Next.js test app: widget appears, Alt+Click works, submit sends to Pi
- [ ] Layout import updated in test app

## Blocked by

- #24 Browser client module (needs `dist/browser-client.js` to exist)
