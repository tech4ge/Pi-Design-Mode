import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { DesignModeServer } from "./server.js";
import type { ClientMessage } from "./server.js";
import { parseDataOid } from "./data-oid.js";
import { inspectElement } from "./inspect.js";
import { resolve } from "node:path";

export default function (pi: ExtensionAPI) {
  let server: DesignModeServer | undefined;
  let currentSelection: ClientMessage[] = [];
  let designModeActive = false;
  let designTurnInFlight = false;

  // --- design_inspect tool (always registered, but guarded by designModeActive) ---

  pi.registerTool({
    name: "design_inspect",
    label: "Inspect UI Element",
    description: "Inspect a React component in the running app. Returns component name, source file, props, and layout info. Only available when design mode is active. Use when the user has selected an element in design mode or when you need to inspect a specific component.",
    promptSnippet: "Inspect React UI elements for design changes",
    promptGuidelines: [
      "Use design_inspect when the user has submitted a design change and you need element details.",
      "design_inspect requires a dataOid parameter — use the dataOid from the design-mode selection message.",
      "design_inspect only works when design mode is active — suggest running /design first if needed.",
    ],
    parameters: Type.Object({
      dataOid: Type.String({ description: "The data-oid attribute value of the element to inspect" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!designModeActive || !server) {
        return {
          content: [{ type: "text", text: "Design mode is not active. Run /design to start design mode first." }],
          details: {},
          isError: true,
        };
      }

      const parsed = parseDataOid(params.dataOid);
      if (!parsed) {
        return {
          content: [{ type: "text", text: `Invalid data-oid format: ${params.dataOid}` }],
          details: {},
          isError: true,
        };
      }

      // Highlight the element in the browser
      server.broadcast({ type: "design:highlight", dataOid: params.dataOid });

      // Find element info from prior selection messages
      const priorSelect = currentSelection.find(
        (s) => s.type === "design:select" && s.dataOid === params.dataOid,
      );

      // Inspect the source file
      const filePath = resolve(ctx.cwd, parsed.filePath);
      const inspected = await inspectElement({
        dataOid: params.dataOid,
        filePath,
        computedStyles: priorSelect?.type === "design:select" ? priorSelect.computedStyles : undefined,
        boundingBox: priorSelect?.type === "design:select" ? priorSelect.boundingBox : undefined,
      });

      if (!inspected) {
        return {
          content: [{ type: "text", text: `Could not inspect element at ${parsed.filePath}:${parsed.line}` }],
          details: {},
          isError: true,
        };
      }

      // Merge runtime info from browser
      const result = {
        ...inspected,
        computedStyles: priorSelect?.type === "design:select" ? priorSelect.computedStyles : undefined,
        boundingBox: priorSelect?.type === "design:select" ? priorSelect.boundingBox : undefined,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // --- UI ---

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

  // --- /design command ---

  pi.registerCommand("design", {
    description: "Toggle design mode — connect to browser for visual editing",
    handler: async (_args, ctx) => {
      if (server) {
        server.broadcast({ type: "design:mode:off" });
        await server.stop();
        server = undefined;
        designModeActive = false;
        currentSelection = [];
        ctx.ui.setStatus("design", undefined);
        ctx.ui.setWidget("design", undefined);
        ctx.ui.notify("Design mode off", "info");
        return;
      }

      server = new DesignModeServer({ port: 9481 });

      try {
        const port = await server.start();
        designModeActive = true;
        ctx.ui.setStatus("design", "🔴 Design Mode");
        updateWidget(ctx);

        server.onMessage((_ws, message: ClientMessage) => {
          handleMessage(message, ctx);
        });

        server.onDisconnect(() => {
          currentSelection = [];
          updateWidget(ctx);
        });

        ctx.ui.notify(`Design mode on — WS server on port ${port}`, "info");
      } catch (err) {
        ctx.ui.notify(`Failed to start design mode: ${err}`, "error");
        server = undefined;
      }
    },
  });

  // --- Message handling ---

  function handleMessage(message: ClientMessage, ctx: any) {
    switch (message.type) {
      case "design:connect": {
        // W1: Send design:mode:on back to client with actual port
        const port = server?.getPort();
        server?.broadcast({ type: "design:mode:on", wsPort: port });
        updateWidget(ctx);
        break;
      }

      case "design:select": {
        currentSelection = currentSelection.filter(
          (s) => s.type === "design:select" && s.dataOid !== message.dataOid,
        );
        currentSelection.push(message);
        updateWidget(ctx);
        break;
      }

      case "design:deselect": {
        if (message.dataOid === "__all__") {
          currentSelection = [];
        } else {
          currentSelection = currentSelection.filter(
            (s) => s.type === "design:select" && s.dataOid !== message.dataOid,
          );
        }
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
        // Add structural context if available (multi-select only)
        if (message.structuralContext && (message.structuralContext.siblings.length > 0 || message.structuralContext.sameComponent.length > 0)) {
          if (message.structuralContext.siblings.length > 0) {
            content += `Sibling groups (elements sharing the same parent):\n`;
            for (const group of message.structuralContext.siblings) {
              const locs = group.map((oid) => { const p = parseDataOid(oid); return p ? `${p.filePath}:${p.line}` : oid; });
              content += `  - ${locs.join(", ")}\n`;
            }
          }
          if (message.structuralContext.sameComponent.length > 0) {
            content += `Same component groups (elements from the same file):\n`;
            for (const group of message.structuralContext.sameComponent) {
              const locs = group.map((oid) => { const p = parseDataOid(oid); return p ? `${p.filePath}:${p.line}` : oid; });
              content += `  - ${locs.join(", ")}\n`;
            }
          }
          content += `\n`;
        }
        content += `Instruction: ${message.instruction}`;

        designTurnInFlight = true; // W3: Track design-triggered turns
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
            structuralContext: message.structuralContext,
          },
        }, { triggerTurn: true });

        server?.broadcast({ type: "design:processing" });
        break;
      }
    }
  }

  // --- Lifecycle ---

  // Fire design:done when the full agent run completes (all turns),
  // not after each individual turn — Pi may take multiple turns
  pi.on("agent_end", (event) => {
    if (server && designTurnInFlight) {
      // Check if the agent ended with errors
      const msgs = event.messages || [];
      const hasError = msgs.some((m: any) =>
        m.role === "toolResult" && m.isError
      );
      if (hasError) {
        server.broadcast({ type: "design:error", message: "Pi encountered an error while processing your design changes" });
      } else {
        server.broadcast({ type: "design:done" });
      }
      designTurnInFlight = false;
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
