# Review: feature/10-structural-context

**Date:** 2026-06-11
**Issue:** #10 — Multi-select structural context

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Browser computes sibling groups from shared parentElement | ❌ BLOCKER | Bug in `parentKey` logic — see below |
| 2 | Browser computes sameComponent groups from data-oid filePath | ✅ | `vite-plugin.ts` lines ~268–278: groups by `parsed.filePath`, only includes groups with >1 element |
| 3 | structuralContext included in design:submit WS message | ✅ | `vite-plugin.ts` line ~296: `computeStructuralContext()` result sent in submit payload |
| 4 | Extension includes structural context in LLM prompt | ✅ | `index.ts` lines ~204–222: structural context rendered human-readable in `content` string and included in `details` |
| 5 | Server test: structural context forwarded | ✅ | `server.spec.ts` test "processes design:submit with structural context" verifies siblings and sameComponent pass-through |
| 6 | Single-element submit → empty structural context | ✅ | `vite-plugin.ts` line ~262: early return `if (selections.length <= 1) return { siblings: [], sameComponent: [] };` |

---

## Correct

- **sameComponent grouping logic** is correct (`vite-plugin.ts` ~lines 268–278). Parses `data-oid` → extracts `filePath` → groups by file → only includes groups with length > 1.
- **Single-element early return** (`vite-plugin.ts` line ~262). Returns empty arrays immediately, avoiding unnecessary computation.
- **Server-side `ClientMessage` type updated** (`server.ts` line ~12). `structuralContext` is optional on `design:submit` variant with correct shape `{ siblings: string[][]; sameComponent: string[][] }`.
- **Extension prompt content** (`index.ts` lines ~204–222). Structural context rendered clearly with human-readable labels ("Sibling groups (elements sharing the same parent)", "Same component groups (elements from the same file)"), using `parseDataOid` to resolve OIDs to file:line format.
- **Extension details passthrough** (`index.ts` line ~233). `structuralContext` included in `triggerTurn` `details` object.
- **Guard on optional field** (`index.ts` line ~204). `if (message.structuralContext)` prevents crashes when field is absent.
- **Server test coverage** (`server.spec.ts`). New test verifies structural context survives the server round-trip with correct shape and values.
- **Backward compatibility**. Existing "processes design:submit messages" test sends submit without `structuralContext` and still passes.

---

## Blocker

### Sibling grouping never works — `parentKey` uniquely identifies each child, not the parent

**File:** `packages/react-plugin/src/vite-plugin.ts`  
**Location:** `computeStructuralContext()` function, the `parentKey` computation line (~line 266)

**The bug:**
```js
var parentKey = el && el.parentElement
  ? el.parentElement.tagName + ":" + Array.prototype.indexOf.call(el.parentElement.children, el)
  : "none:" + i;
```

The key combines `parentElement.tagName` with the **child's own index** within `parentElement.children`. Two sibling elements (children of the same parent) will always get different keys because they occupy different indices.

**Example:** Two `<li>` elements inside `<ul>`:
- Element A at `children[0]` → key = `"UL:0"`
- Element B at `children[1]` → key = `"UL:1"`

These are separate keys in `parentMap`, so each group has size 1, and neither is included in `siblings` (which requires `length > 1`). The sibling grouping will **always be empty** regardless of input.

**Fix:** Use the parent element's identity as the key, not the (parent, child) pair. Since a plain JS object can't use DOM references as keys (they stringify), use a `Map`:

```js
var parentMap = new Map();
for (var i = 0; i < oids.length; i++) {
  var el = document.querySelector('[data-oid="' + CSS.escape(oids[i]) + '"]');
  if (el && el.parentElement) {
    if (!parentMap.has(el.parentElement)) parentMap.set(el.parentElement, []);
    parentMap.get(el.parentElement).push(oids[i]);
  }
}
var siblings = [];
parentMap.forEach(function(group) {
  if (group.length > 1) siblings.push(group);
});
```

**Impact:** Acceptance criterion #1 fails. Without this fix, the LLM never receives sibling information, defeating the core purpose of the feature.

---

## Notes

1. **No automated tests for browser-side `computeStructuralContext()`**. The function lives in the generated client script string (`generateClientScript`), so it's not unit-testable with vitest. The server spec only validates pass-through. Consider extracting the logic into a testable module that's inlined at build time, or adding integration tests with a browser environment (e.g., Playwright).

2. **Test data inconsistency in `server.spec.ts`**. The structural context test sends `sameComponent: [["c:abc:r:src/List.tsx:12:5", "c:abc:r:src/List.tsx:16:5"], ["c:abc:r:src/Header.tsx:8:3"]]` — the second group has only 1 element, which the browser would never produce (it filters `length > 1`). Not a bug (the test is about pass-through, not computation correctness), but could be misleading as documentation.

3. **Minor cosmetic: empty line in prompt for single-element submit**. When a single-element submit sends `structuralContext: { siblings: [], sameComponent: [] }`, `index.ts` enters the `if (message.structuralContext)` block (truthy object), finds both arrays empty, and adds only `"\n"` to the content. Could add a guard like `if (message.structuralContext.siblings.length > 0 || message.structuralContext.sameComponent.length > 0)` to skip the block entirely.

4. **No server test for backward compatibility assertion**. The existing "processes design:submit messages" test sends a submit without `structuralContext` but doesn't explicitly assert `expect(received[0].structuralContext).toBeUndefined()`. Adding this assertion would tighten backward-compatibility coverage.
