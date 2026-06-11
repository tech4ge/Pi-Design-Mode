Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Auto-detect whether the project uses Next.js or Vite and configure the right plugin automatically, reducing setup friction.

### Changes

1. **Extension reads project config**: On `/design`, check for `next.config.*` (Next.js) or `vite.config.*` (Vite) in the project root.

2. **Auto-insert plugin**: If Vite detected, check if `@pi-design/react-plugin` is already in the Vite config. If not, provide a one-time message: "Add `piDesignVitePlugin()` to your `vite.config.ts` plugins array". Don't auto-edit configs — just guide.

3. **Next.js detection + warning**: If Next.js detected without SWC adapter, show: "Next.js detected. For native support, the SWC adapter is needed (coming soon). You can use `@pi-design/react-plugin` with `next-transpile-modules` as a workaround."

4. **No config found**: If neither detected, show: "No Vite or Next.js config found. Add `piDesignVitePlugin()` to your bundler config."

### Interface

**Extension output only** — no new WS messages. The `/design` command output changes from generic to context-aware.

### Behaviours to test

1. Vite project → message about vite plugin
2. Next.js project → warning about SWC adapter
3. No known config → generic setup message
4. Plugin already configured → no redundant message

### Key files

- `packages/extension/src/index.ts` — `/design` command logic

## Acceptance criteria

- [ ] `/design` checks for vite.config.* and next.config.*
- [ ] Vite detected → guidance to add `piDesignVitePlugin()`
- [ ] Next.js detected → warning about SWC adapter availability
- [ ] No config → generic setup instructions
