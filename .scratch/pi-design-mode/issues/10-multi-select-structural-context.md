Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Multi-select structural context — when submitting multiple selected elements, include structural relationships (sibling, parent, same-component) in the `design:submit` payload so the LLM can reason about groups rather than treating each element independently.

### Interface

**New `structuralContext` field on `design:submit` payload:**

```ts
interface StructuralContext {
  siblings: string[][];      // groups of data-oids that share the same parent element
  sameComponent: string[][]; // groups of data-oids from the same component (same file)
}
```

Example payload:
```json
{
  "type": "design:submit",
  "selections": ["c:abc:r:src/List.tsx:12:5", "c:abc:r:src/List.tsx:16:5", "c:abc:r:src/Header.tsx:8:3"],
  "structuralContext": {
    "siblings": [["c:abc:r:src/List.tsx:12:5", "c:abc:r:src/List.tsx:16:5"]],
    "sameComponent": [["c:abc:r:src/List.tsx:12:5", "c:abc:r:src/List.tsx:16:5"], ["c:abc:r:src/Header.tsx:8:3"]]
  },
  "instruction": "make these the same width"
}
```

### How to compute

**Browser-side (client script):**

- `siblings`: for each selected element, walk to `parentElement`, then find other selected elements that share that parent
- `sameComponent`: parse `data-oid` → extract `filePath` → group by file

This is all doable in the browser with DOM traversal + `parseDataOid`.

**Server-side (extension):**

- Include `structuralContext` in the message forwarded to Pi's `triggerTurn`

### Behaviours to test

**Browser-side (manual):**

1. Select 3 sibling elements → structuralContext.siblings contains all 3
2. Select 2 elements from different parents → siblings is empty
3. Select 2 elements from same file → sameComponent groups them
4. Select 1 element → both arrays are empty

**Server-side (testable in server.spec.ts):**

5. `design:submit` with `structuralContext` → forwarded to Pi with context preserved

### Key files

- `packages/react-plugin/src/vite-plugin.ts` — compute `structuralContext` in `submitBtn` click handler
- `packages/extension/src/index.ts` — include `structuralContext` in `triggerTurn` prompt
- `packages/extension/tests/server.spec.ts` — test structural context pass-through

## Acceptance criteria

- [ ] Browser computes sibling groups from shared parentElement
- [ ] Browser computes sameComponent groups from data-oid filePath
- [ ] structuralContext included in design:submit WS message
- [ ] Extension includes structural context in LLM prompt
- [ ] Server test: structural context forwarded in submit message
- [ ] Single-element submit → empty structural context
