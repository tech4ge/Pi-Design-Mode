import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DesignModeServer } from "./server.js";
import type { ClientMessage } from "./server.js";

export default function (pi: ExtensionAPI) {
  let server: DesignModeServer | undefined;

  const updateWidget = (ctx: any) => {
    if (!server) return;
    const clients = server.connectedClients();
    const port = server.getPort();
    const status = clients > 0 ? "connected" : "waiting...";
    ctx.ui.setWidget("design", [
      `🔴 Design Mode | WS: ${status} | Port: ${port}`,
      clients > 0 ? `Clients: ${clients}` : "Open your app with the plugin installed",
    ]);
  };

  pi.registerCommand("design", {
    description: "Toggle design mode — connect to browser for visual editing",
    handler: async (_args, ctx) => {
      if (server) {
        // Stop design mode
        server.broadcast({ type: "design:mode:off" });
        await server.stop();
        server = undefined;
        ctx.ui.setStatus("design", undefined);
        ctx.ui.setWidget("design", undefined);
        ctx.ui.notify("Design mode off", "info");
        return;
      }

      // Start design mode
      server = new DesignModeServer({ port: 9481 });

      try {
        const port = await server.start();
        ctx.ui.setStatus("design", "🔴 Design Mode");
        updateWidget(ctx);

        server.onMessage((_ws, message: ClientMessage) => {
          handleMessage(message, ctx);
        });

        ctx.ui.notify(`Design mode on — WS server on port ${port}`, "info");
      } catch (err) {
        ctx.ui.notify(`Failed to start design mode: ${err}`, "error");
        server = undefined;
      }
    },
  });

  function handleMessage(message: ClientMessage, ctx: any) {
    switch (message.type) {
      case "design:connect":
        updateWidget(ctx);
        break;
      case "design:select":
        // Will be wired to pi.sendMessage() in issue 04
        console.log("[design-mode] select:", message.dataOid);
        break;
      case "design:submit":
        // Will be wired to pi.sendMessage() + LLM in issue 05
        console.log("[design-mode] submit:", message.instruction);
        break;
    }
  }

  pi.on("session_shutdown", async () => {
    if (server) {
      server.broadcast({ type: "design:mode:off" });
      await server.stop();
      server = undefined;
    }
  });
}
