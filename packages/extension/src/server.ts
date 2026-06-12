import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, ServerMessage } from "@pi-design/react-plugin/protocol";

export type { ClientMessage, ServerMessage };

interface ServerOptions {
  port: number;
  maxPortRetries?: number;
}

export class DesignModeServer {
  private options: Required<ServerOptions>;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private actualPort: number = 0;
  private messageHandler: ((ws: WebSocket, message: ClientMessage) => void) | null = null;
  private disconnectHandler: (() => void) | null = null;

  constructor(options: ServerOptions) {
    this.options = {
      maxPortRetries: 10,
      ...options,
    };
  }

  async start(): Promise<number> {
    for (let attempt = 0; attempt <= this.options.maxPortRetries; attempt++) {
      const port = this.options.port + attempt;
      try {
        this.wss = await this.listen(port);
        this.actualPort = port;
        this.setupServer();
        return port;
      } catch {
        continue;
      }
    }
    throw new Error(`No available port after ${this.options.maxPortRetries} retries`);
  }

  private listen(port: number): Promise<WebSocketServer> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ port });
      wss.on("listening", () => resolve(wss));
      wss.on("error", (err) => {
        wss.close();
        reject(err);
      });
    });
  }

  private setupServer(): void {
    if (!this.wss) return;

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);

      ws.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as ClientMessage;
          this.messageHandler?.(ws, message);
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        if (this.disconnectHandler) this.disconnectHandler();
      });
    });
  }

  async stop(): Promise<void> {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          this.wss = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getPort(): number {
    return this.actualPort;
  }

  connectedClients(): number {
    return this.clients.size;
  }

  onMessage(handler: (ws: WebSocket, message: ClientMessage) => void): void {
    this.messageHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandler = handler;
  }

  broadcast(message: ServerMessage): void {
    const raw = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }
}
