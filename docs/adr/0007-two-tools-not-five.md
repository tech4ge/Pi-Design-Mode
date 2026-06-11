# Two design tools, not five

Five thin tools (`design_inspect`, `design_select`, `design_screenshot`, `design_highlight`, `design_styles`) is a shallow-interface smell — each is a thin wrapper over the same data. We ship two tools: `design_inspect` (deep — returns component info, source location, styles, bounding box, parent tree) and `design_screenshot` (Phase 3 — image capture). Element selection flows via `pi.sendMessage()` as visible conversation messages, not as silent system prompt injection. The LLM can re-inspect or probe deeper using `design_inspect` as a tool call.
