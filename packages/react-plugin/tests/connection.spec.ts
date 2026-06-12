import { describe, it, expect } from "vitest";
import { routeServerMessage } from "../src/browser-client/connection.js";

describe("routeServerMessage", () => {
  it("routes design:highlight to onHighlight", () => {
    let highlighted: string | null = null;
    routeServerMessage(
      { type: "design:highlight", dataOid: "c:abc:r:src/Foo.tsx:10:5" },
      { onHighlight: (oid) => { highlighted = oid; } },
    );
    expect(highlighted).toBe("c:abc:r:src/Foo.tsx:10:5");
  });

  it("routes design:mode:off to onDisconnect", () => {
    let disconnected = false;
    routeServerMessage(
      { type: "design:mode:off" },
      { onDisconnect: () => { disconnected = true; } },
    );
    expect(disconnected).toBe(true);
  });

  it("routes design:processing to onProcessing", () => {
    let processing: boolean | null = null;
    routeServerMessage(
      { type: "design:processing" },
      { onProcessing: (v) => { processing = v; } },
    );
    expect(processing).toBe(true);
  });

  it("routes design:done to onDone", () => {
    let done = false;
    routeServerMessage(
      { type: "design:done" },
      { onDone: () => { done = true; } },
    );
    expect(done).toBe(true);
  });

  it("routes design:error to onError", () => {
    let error: string | null = null;
    routeServerMessage(
      { type: "design:error", message: "bad stuff" },
      { onError: (msg) => { error = msg; } },
    );
    expect(error).toBe("bad stuff");
  });

  it("routes design:error with default message", () => {
    let error: string | null = null;
    routeServerMessage(
      { type: "design:error" } as any,
      { onError: (msg) => { error = msg; } },
    );
    expect(error).toBe("Unknown error");
  });

  it("ignores unknown message types", () => {
    expect(() => routeServerMessage({ type: "unknown" } as any, {})).not.toThrow();
  });
});
