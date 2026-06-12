Status: wontfix
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Include the full ancestor chain of selected elements in the `design:submit` payload, so Pi understands layout context: "this button is inside a flex container inside a card inside a grid".

### Changes

1. **Ancestor chain capture**: On submit, walk up from each selected element to the body, recording each ancestor's `tagName`, `data-oid` (if present), computed `display`, `flex-direction`, `grid-template-columns`, and `position`.

2. **Include in submit payload**: Add `ancestorChain` array to `design:submit` message. Max depth 10 to avoid unbounded chains.

3. **Extension renders in LLM prompt**: Format ancestor chain readably: `div (flex row) > section (grid 3col) > Card > button`.

### Interface

**Submit payload addition:**
```typescript
ancestorChain: Array<{
  tagName: string;
  dataOid?: string;
  display: string;
  flexDirection?: string;
  gridTemplate?: string;
  position: string;
}>[]
```

### Behaviours to test

1. Ancestor chain captured for each selected element
2. Max depth 10 — truncates if deeper
3. Extension renders chain in LLM prompt
4. Single-element and multi-element submits both work

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — ancestor chain capture
- `packages/extension/src/index.ts` — prompt formatting
- `packages/extension/src/server.ts` — message type

## Acceptance criteria

- [ ] Browser captures ancestor chain up to depth 10
- [ ] Chain includes layout properties (display, flex-direction, grid, position)
- [ ] `design:submit` includes `ancestorChain`
- [ ] Extension renders ancestor chain in LLM prompt
