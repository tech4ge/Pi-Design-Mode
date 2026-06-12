import { describe, it, expect } from "vitest";
import { reconnectPolicy } from "../src/reconnect-policy.js";

describe("reconnectPolicy", () => {
  it("starts with 2s delay", () => {
    expect(reconnectPolicy(0)).toEqual({ delay: 2000 });
  });

  it("doubles to 4s on second attempt", () => {
    expect(reconnectPolicy(1)).toEqual({ delay: 4000 });
  });

  it("doubles to 8s on third attempt", () => {
    expect(reconnectPolicy(2)).toEqual({ delay: 8000 });
  });

  it("doubles to 16s on fourth attempt", () => {
    expect(reconnectPolicy(3)).toEqual({ delay: 16000 });
  });

  it("caps at 30s for attempt 4 and beyond", () => {
    expect(reconnectPolicy(4)).toEqual({ delay: 30000 });
    expect(reconnectPolicy(5)).toEqual({ delay: 30000 });
    expect(reconnectPolicy(6)).toEqual({ delay: 30000 });
  });

  it("gives up after 10 attempts", () => {
    expect(reconnectPolicy(10)).toEqual({ giveUp: true });
    expect(reconnectPolicy(11)).toEqual({ giveUp: true });
    expect(reconnectPolicy(99)).toEqual({ giveUp: true });
  });

  it("does not give up on attempt 9", () => {
    expect(reconnectPolicy(9)).toEqual({ delay: 30000 });
  });
});
