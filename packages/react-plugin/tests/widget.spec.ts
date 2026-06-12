import { describe, it, expect, beforeEach } from "vitest";
import { createWidgetState } from "../src/browser-client/widget.js";

describe("createWidgetState", () => {
  let ws: ReturnType<typeof createWidgetState>;

  beforeEach(() => {
    ws = createWidgetState();
  });

  it("starts not connected and not processing", () => {
    expect(ws.isConnected()).toBe(false);
    expect(ws.isProcessing()).toBe(false);
  });

  it("updateConnection sets connected state", () => {
    ws.updateConnection(true);
    expect(ws.isConnected()).toBe(true);
    ws.updateConnection(false);
    expect(ws.isConnected()).toBe(false);
  });

  it("setProcessing sets processing state", () => {
    ws.setProcessing(true);
    expect(ws.isProcessing()).toBe(true);
    ws.setProcessing(false);
    expect(ws.isProcessing()).toBe(false);
  });

  it("showError records last error", () => {
    ws.showError("test error");
    expect(ws.getLastError()).toBe("test error");
  });

  it("showError persistent flag", () => {
    ws.showError("persistent error", true);
    expect(ws.getLastError()).toBe("persistent error");
    expect(ws.isLastErrorPersistent()).toBe(true);
  });
});
