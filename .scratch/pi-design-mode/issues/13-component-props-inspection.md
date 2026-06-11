Status: ready-for-agent
Category: enhancement

## Parent

PRD: `.scratch/pi-design-mode/PRD.md`

## What to build

Add runtime component props inspection to `design_inspect`, so Pi can understand component state and data flow, not just JSX structure.

### Changes

1. **Props data attribute**: At transform time, inject a `data-oid-props` attribute (or similar) that serializes the component's props as JSON. Only in dev mode.

2. **Fallback if serialization fails**: If props contain functions, circular refs, or non-serializable values, store `{__unserializable: true, keys: [...]}` — just the prop names.

3. **`design_inspect` reads props**: When inspecting an element, return both the JSX source (existing) and the runtime props. Pi can see: "This Card has `title="Hello"` and `isActive={true}`".

### Interface

**data-oid format extension:**
```
data-oid="c:H:r:file:line:column"
data-oid-props='{"title":"Hello","isActive":true}'
```

**`design_inspect` response addition:**
```typescript
{ props: Record<string, unknown> | { __unserializable: true; keys: string[] } }
```

### Behaviours to test

1. Transform injects `data-oid-props` with serialized props
2. Non-serializable props fall back to key names
3. `design_inspect` returns props alongside JSX source
4. Works with React 18+ components

### Key files

- `packages/react-plugin/src/transform.ts` — inject data-oid-props
- `packages/react-plugin/src/vite-plugin.ts` — client reads data-oid-props
- `packages/extension/src/inspect.ts` — inspect includes props
- `packages/react-plugin/tests/transform.spec.ts` — transform tests

## Acceptance criteria

- [ ] Transform injects `data-oid-props` attribute with serialized component props
- [ ] Non-serializable props fall back to key list
- [ ] `design_inspect` returns runtime props
- [ ] Transform tests for props injection
