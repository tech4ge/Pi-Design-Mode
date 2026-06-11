import { describe, it, expect, afterEach } from "vitest";
import { DesignModeServer, type ClientMessage } from "../src/server.js";
import WebSocket from "ws";

describe("DesignModeServer", () => {
  let server: DesignModeServer | undefined;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = undefined;
    }
  });

  it("starts a WS server and accepts connections", async () => {
    server = new DesignModeServer({ port: 9481 });
    const port = await server.start();

    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve, rejects) => {
      ws.on("open", () => resolve());
      ws.on("error", (err) => rejects(err));
    });

    expect(server.connectedClients()).toBe(1);
    ws.close();
  });

  it("picks next available port when default is taken", async () => {
    const server1 = new DesignModeServer({ port: 9481 });
    const port1 = await server1.start();

    server = new DesignModeServer({ port: 9481 });
    const port2 = await server.start();

    expect(port2).not.toBe(port1);
    expect(port2).toBeGreaterThan(9481);

    await server1.stop();
  });

  it("stops cleanly", async () => {
    server = new DesignModeServer({ port: 9481 });
    await server.start();
    await server.stop();
    server = undefined;

    // Connecting after stop should fail
    await expect(
      new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${port}`);
        ws.on("open", () => { ws.close(); resolve(); });
        ws.on("error", () => reject(new Error("Connection failed")));
      }),
    ).rejects.toThrow();
  });

  it("receives design:connect messages from clients", async () => {
    server = new DesignModeServer({ port: 9481 });
    const port = await server.start();

    const received: ClientMessage[] = [];
    server.onMessage((_ws, msg) => received.push(msg));

    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({ type: "design:connect", url: "http://localhost:3000", title: "My App" }));
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("design:connect");
    if (received[0].type === "design:connect") {
      expect(received[0].url).toBe("http://localhost:3000");
    }
    ws.close();
  });

  it("broadcasts messages to all connected clients", async () => {
    server = new DesignModeServer({ port: 9481 });
    const port = await server.start();

    const ws1 = new WebSocket(`ws://localhost:${port}`);
    const ws2 = new WebSocket(`ws://localhost:${port}`);
    await Promise.all([
      new Promise<void>((resolve) => ws1.on("open", resolve)),
      new Promise<void>((resolve) => ws2.on("open", resolve)),
    ]);

    const received: string[] = [];
    ws1.on("message", (raw) => received.push(raw.toString()));
    ws2.on("message", (raw) => received.push(raw.toString()));

    server!.broadcast({ type: "design:mode:on", wsPort: port });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(2);
    expect(received.every((r) => r.includes("design:mode:on"))).toBe(true);
    ws1.close();
    ws2.close();
  });
});
