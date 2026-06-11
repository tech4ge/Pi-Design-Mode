# Browser connection via WebSocket, not Chrome DevTools Protocol

CDP provides screenshots, DOM inspection, and click interception — but it requires Chrome launch flags, port management, and is fragile across browser versions. For MVP, the client script connects to the Pi extension via a WebSocket server. Element info (computed styles, bounding boxes) is extracted using standard browser APIs and sent over WS. CDP may be added in Phase 3 solely for screenshots, but is not a core dependency.

**Consequences:** No screenshots in MVP. The user opens their app in any browser — no Chrome flags or `--remote-debugging-port` needed.
