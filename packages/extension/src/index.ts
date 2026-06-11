import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DesignModeServer } from "./server.js";
import type { ClientMessage } from "./server.js";
import { parseDataOid } from "@pi-design/react-plugin/data-oid";

export default function (pi: ExtensionAPI) {
  let server: DesignModeServer | undefined;
  let currentSelection: ClientMessage[] = [];

  const updateWidget = (ctx: any) => {
    if (!server) return;
    const clients = server.connectedClients();
    const port = server.getPort();
    const status = clients > 0 ? "connected" : "waiting...";
    const lines = [
      `🔴 Design Mode | WS: ${status} | Port: ${port}`,
    ];
    if (clients > 0) {
      lines.push(`Clients: ${clients}`);
    }
    if (currentSelection.length > 0) {
      for (const sel of currentSelection) {
        if (sel.type === "design:select") {
          const parsed = parseDataOid(sel.dataOid);
          const location = parsed ? `${parsed.filePath}:${parsed.line}` : sel.dataOid;
          lines.push(`  ↳ <${sel.tagName}> ${location}`);
        }
      }
    }
    ctx.ui.setWidget("design", lines);
  };

  pi.registerCommand("design", {
    description: "Toggle design mode — connect to browser for visual editing",
    handler: async (_args, ctx) => {
      if (server) {
        server.broadcast({ type: "design:mode:off" });
        await server.stop();
        server = undefined;
        currentSelection = [];
        ctx.ui.setStatus("design", undefined);
        ctx.ui.setWidget("design", undefined);
        ctx.ui.notify("Design mode off", "info");
        return;
      }

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

      case "design:select": {
        currentSelection = currentSelection.filter(
          (s) => s.type === "design:select" && s.dataOid !== message.dataOid,
        );
        currentSelection.push(message);
        updateWidget(ctx);

        const parsed = parseDataOid(message.dataOid);
        const location = parsed ? `${parsed.filePath}:${parsed.line}` : message.dataOid;
        pi.sendMessage({
          customType: "design-mode-select",
          content: `🔍 Selected: <${message.tagName}> at ${location}`,
          display: true,
          details: {
            dataOid: message.dataOid,
            selector: message.selector,
            computedStyles: message.computedStyles,
            boundingBox: message.boundingBox,
          },
        });
        break;
      }

      case "design:deselect": {
        currentSelection = currentSelection.filter(
          (s) => s.type === "design:select" && s.dataOid !== message.dataOid,
        );
        updateWidget(ctx);
        break;
      }

      case "design:submit": {
        const selections = currentSelection.filter((s) => s.type === "design:select");
        let content = `🎨 Design Mode\n\n`;
        for (const sel of selections) {
          const parsed = parseDataOid(sel.dataOid);
          const location = parsed ? `${parsed.filePath}:${parsed.line}` : sel.dataOid;
          content += `Selected: <${sel.tagName}> at ${location}\n`;
          content += `Styles: ${Object.entries(sel.computedStyles).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`;
          content += `Position: ${sel.boundingBox.x},${sel.boundingBox.y} (${sel.boundingBox.width}×${sel.boundingBox.height})\n\n`;
        }
        content += `Instruction: ${message.instruction}`;

        pi.sendMessage({
          customType: "design-mode-submit",
          content,
          display: true,
          details: {
            selections: selections.map((s) => ({
              dataOid: s.dataOid,
              tagName: s.tagName,
              computedStyles: s.computedStyles,
              boundingBox: s.boundingBox,
            })),
            instruction: message.instruction,
          },
        }, { triggerTurn: true });

        // Notify browser we're processing
        server?.broadcast({ type: "design:processing" });
        break;
      }
    }
  }

  // When the LLM finishes, notify the browser
  pi.on("turn_end", () => {
    if (server) {
      server.broadcast({ type: "design:done" });
    }
  });

  pi.on("session_shutdown", async () => {
    if (server) {
      server.broadcast({ type: "design:mode:off" });
      await server.stop();
      server = undefined;
    }
  });
}
