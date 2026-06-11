# Review: feature/20-error-states

**Date:** 2026-06-11  
**Issue:** #20 — Error states in widget (banners, timeout, disconnect feedback, Pi error forwarding)

---

## Acceptance Criteria Evaluation

### AC1: Connection disconnect shows error banner + red dot — ❌ NOT MET

**Location:** `packages/react-plugin/src/vite-plugin.ts`, lines 480–485

```js
ws.onclose = function() {
    isConnected = false;
    if (window.__piDesignWidget) window.__piDesignWidget.showError("Connection lost — will retry");
    destroyWidget();
    setTimeout(connect, 2000);
};
```

**Problem:** `showError()` is called, then `destroyWidget()` **immediately** removes the entire widget from the DOM. The error banner is visible for effectively 0 frames. The red dot and disconnect tooltip are also never seen — the widget is gone.

Between disconnect and reconnect (~2s), the user sees **no widget at all** — no dot, no banner. When the new widget is created on reconnect, it already has `isConnected = true`, so it shows a **green dot** immediately.

The dot tooltip ("Disconnected — changes won't be sent") is unreachable because `render()` runs inside the widget, and the widget is destroyed before the user can interact with it.

**Fix needed:** Either:
1. Don't destroy the widget on disconnect — keep it visible with red dot + error banner, and only re-create on reconnect; or
2. Create a lightweight disconnected-state widget (red dot + banner only, no selection UI) that persists until reconnect.

### AC2: Reconnect clears error banner + green dot — ⚠️ PARTIAL

The error banner is never visible to begin with (see AC1), so "clearing on reconnect" is moot. The green dot does appear after reconnect, but only because a brand-new widget is created with `isConnected = true`. There is no explicit "clear error" logic on reconnect — it's a side effect of destroy+recreate.

### AC3: Processing >60s shows timeout warning with cancel — ✅ PASS

**Location:** `packages/react-plugin/src/vite-plugin.ts`, `setProcessing` method (lines ~425–438)

```js
processingTimer = setTimeout(function() {
    if (isProcessing) cancelBtn.style.display = "inline";
}, 60000);
```

- Timer correctly fires after 60s and shows the cancel button.
- Cancel correctly sends `design:deselect` with `__all__`, clears processing state, and hides the cancel button.
- Timer is cleared on both `setProcessing(false)` and cancel click.

Minor note: The issue spec says "Still processing... Click to cancel" but the HTML shows "⏳ Processing..." with a separate Cancel button. The cancel button text is just "Cancel", not "Click to cancel". This is acceptable UX but differs from spec.

### AC4: Pi errors forwarded as design:error to browser — ✅ PASS

**Extension side** (`packages/extension/src/index.ts`, lines 253–265):
```ts
pi.on("agent_end", (event) => {
    if (server && designTurnInFlight) {
        const msgs = event.messages || [];
        const hasError = msgs.some((m: any) => m.role === "toolResult" && m.isError);
        if (hasError) {
            server.broadcast({ type: "design:error", message: "Pi encountered an error while processing your design changes" });
        } else {
            server.broadcast({ type: "design:done" });
        }
        designTurnInFlight = false;
    }
});
```

**Server side** (`packages/extension/src/server.ts`, line 21):
```ts
| { type: "design:error"; message: string };
```

**Client side** (`packages/react-plugin/src/vite-plugin.ts`, lines 503–506):
```js
case "design:error":
    if (window.__piDesignWidget) window.__piDesignWidget.setProcessing(false);
    if (window.__piDesignWidget) window.__piDesignWidget.showError(message.message || "Unknown error");
    break;
```

- `design:error` message type correctly added to `ServerMessage` union.
- `agent_end` correctly checks for `toolResult` with `isError: true`.
- Client correctly clears processing state AND shows error banner.
- Test coverage exists (`server.spec.ts` — "broadcasts design:error messages").

**Note:** Error detection is limited to `toolResult` with `isError: true`. Errors that appear as text in assistant messages (e.g., "I was unable to...") won't be caught. This is acceptable for v1 since tool errors are the structured error path in Pi's agent system.

### AC5: Error banners auto-dismiss after 10s — ⚠️ PARTIAL

**Location:** `packages/react-plugin/src/vite-plugin.ts`, `showError` function (lines 297–304):

```js
function showError(message) {
    if (!errorBanner || !errorMsg) return;
    errorMsg.textContent = message;
    errorBanner.style.display = "flex";
    if (errorBannerTimer) clearTimeout(errorBannerTimer);
    errorBannerTimer = setTimeout(function() {
        errorBanner.style.display = "none";
    }, 10000);
}
```

The 10s auto-dismiss timer is correctly implemented. Click-to-dismiss also works (lines 386–389).

**Problem:** `destroyWidget()` (line 456) does NOT clear `errorBannerTimer` or `processingTimer`. When the widget is destroyed (e.g., on disconnect), the old timer reference still holds a closure over the now-detached DOM element. The timer fires harmlessly (mutating a detached element), but it's an unclean teardown — a timer leak.

---

## Code Quality Observations

### Correct ✓
- `design:error` message type properly typed in `ServerMessage` union (`server.ts:21`).
- `server.spec.ts` has a dedicated test for `design:error` broadcast (port 9482 to avoid conflicts).
- `handleServerMessage` correctly handles `design:error` — clears processing first, then shows error.
- Cancel button properly sends `design:deselect __all__` and resets all processing state.
- `showError` clears previous timer before setting a new one (prevents stacking).

### Note (non-blocking)

1. **Timer cleanup in `destroyWidget`** — `errorBannerTimer` and `processingTimer` should be cleared in `destroyWidget()` to prevent timer leaks. Currently only the DOM element is removed.

2. **Error detection granularity** — `agent_end` handler only detects `toolResult` with `isError: true`. A more robust approach could also check for assistant text patterns indicating failure, or listen for `toolError` events if Pi exposes them. Low priority for v1.

3. **Error message specificity** — The error message from the extension is generic: "Pi encountered an error while processing your design changes". The agent may have multiple tool calls with some succeeding and some failing. Consider including more detail (e.g., which tool failed, the error text from the tool result). Low priority for v1.

4. **Reconnect UX gap** — The 2-second gap between disconnect (widget destroyed) and reconnect (new widget) means the user sees the widget flash/disappear. A smoother UX would keep the widget visible but in a "disconnected" state with a red dot and error banner. This is the core of the AC1 failure.

5. **No test for disconnect → error banner** — The server-side tests cover `design:error` broadcasting, but there are no client-side tests for the error banner behavior. Since the client is an injected string (not a React component), unit testing is harder, but the disconnect→banner flow is critical and currently broken.

---

## Summary

| Criterion | Status | Notes |
|---|---|---|
| AC1: Disconnect shows banner + red dot | ❌ FAIL | Widget destroyed immediately, banner never visible |
| AC2: Reconnect clears banner + green dot | ⚠️ PARTIAL | Works by accident (destroy+recreate), no explicit clear |
| AC3: Processing >60s timeout + cancel | ✅ PASS | Timer and cancel work correctly |
| AC4: Pi errors → design:error | ✅ PASS | Error detection + broadcast + display all working |
| AC5: Error banners auto-dismiss after 10s | ⚠️ PARTIAL | Logic correct, but timer leak on destroy |

**Verdict: BLOCKER** — AC1 is a fundamental failure. The disconnect error state is the primary use case for this issue, and the banner + red dot are never visible to the user. The reconnect flow must be refactored to keep the widget alive (in a "disconnected" state) rather than destroying it on `ws.onclose`.
