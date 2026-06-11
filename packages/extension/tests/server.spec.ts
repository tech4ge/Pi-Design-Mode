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

  it("processes design:select messages with element data", async () => {
    server = new DesignModeServer({ port: 9481 });
    const port = await server.start();

    const received: ClientMessage[] = [];
    server.onMessage((_ws, msg) => received.push(msg));

    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({
      type: "design:select",
      dataOid: "c:abc12345:r:src/components/Header.tsx:14:8",
      selector: "div.header-button",
      computedStyles: { "background-color": "rgb(59, 130, 246)", padding: "8px 16px" },
      boundingBox: { x: 120, y: 45, width: 88, height: 36 },
      tagName: "button",
      textContent: "Click me",
    }));
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("design:select");
    if (received[0].type === "design:select") {
      expect(received[0].dataOid).toBe("c:abc12345:r:src/components/Header.tsx:14:8");
      expect(received[0].tagName).toBe("button");
      expect(received[0].computedStyles["background-color"]).toBe("rgb(59, 130, 246)");
    }
    ws.close();
  });

  it("processes design:submit messages", async () => {
    server = new DesignModeServer({ port: 9481 });
    const port = await server.start();

    const received: ClientMessage[] = [];
    server.onMessage((_ws, msg) => received.push(msg));

    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({
      type: "design:submit",
      selections: ["c:abc12345:r:src/components/Header.tsx:14:8"],
      instruction: "make it blue",
    }));
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("design:submit");
    if (received[0].type === "design:submit") {
      expect(received[0].selections).toHaveLength(1);
      expect(received[0].instruction).toBe("make it blue");
    }
    ws.close();
  });

  it("tracks connected clients", async () => {
    server = new DesignModeServer({ port: 9481 });
    const port = await server.start();

    const ws1 = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws1.on("open", resolve));
    expect(server.connectedClients()).toBe(1);

    const ws2 = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => ws2.on("open", resolve));
    expect(server.connectedClients()).toBe(2);

    ws1.close();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(server.connectedClients()).toBe(1);

    ws2.close();
  });
});
