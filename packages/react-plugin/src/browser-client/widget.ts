/**
 * Widget module for the Pi Design Mode browser client.
 *
 * Manages widget state (connection, processing, errors).
 * The DOM creation stays in the orchestrator (browser-client.ts) —
 * this module tracks the state that the DOM renders.
 */

export function createWidgetState() {
  let connected = false;
  let processing = false;
  let lastError: string | null = null;
  let lastErrorPersistent = false;

  function isConnected() { return connected; }
  function isProcessing() { return processing; }
  function getLastError() { return lastError; }
  function isLastErrorPersistent() { return lastErrorPersistent; }

  function updateConnection(v: boolean) { connected = v; }
  function setProcessing(v: boolean) { processing = v; }
  function showError(msg: string, persistent = false) {
    lastError = msg;
    lastErrorPersistent = persistent;
  }

  return { isConnected, isProcessing, getLastError, isLastErrorPersistent, updateConnection, setProcessing, showError };
}
