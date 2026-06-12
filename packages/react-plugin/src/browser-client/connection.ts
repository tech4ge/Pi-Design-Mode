/**
 * Connection module for the Pi Design Mode browser client.
 *
 * Pure message routing for server messages.
 * The WS lifecycle (connect, reconnect) stays in the orchestrator.
 */

import type { ServerMessage } from "../protocol.js";

export interface MessageHandlers {
  onDisconnect?: () => void;
  onHighlight?: (dataOid: string) => void;
  onProcessing?: (value: boolean) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

export function routeServerMessage(message: ServerMessage, handlers: MessageHandlers) {
  switch (message.type) {
    case "design:mode:off":
      handlers.onDisconnect?.();
      break;
    case "design:highlight":
      handlers.onHighlight?.(message.dataOid);
      break;
    case "design:processing":
      handlers.onProcessing?.(true);
      break;
    case "design:done":
      handlers.onDone?.();
      break;
    case "design:error":
      handlers.onError?.(message.message || "Unknown error");
      break;
  }
}
