/**
 * Reconnection policy for the browser client WebSocket.
 *
 * Pure function — no side effects, no DOM, no Node imports.
 * Browser-safe.
 */

const MAX_ATTEMPTS = 10;
const MAX_DELAY_MS = 30000;
const INITIAL_DELAY_MS = 2000;

export function reconnectPolicy(attempt: number): { delay: number } | { giveUp: true } {
  if (attempt >= MAX_ATTEMPTS) {
    return { giveUp: true };
  }

  const rawDelay = INITIAL_DELAY_MS * Math.pow(2, attempt);
  const delay = Math.min(rawDelay, MAX_DELAY_MS);

  return { delay };
}
