import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DesignModeServer } from "./server.js";

export default function (pi: ExtensionAPI) {
  let server: DesignModeServer | undefined;

  pi.registerCommand("design", {
    description: "Toggle design mode — connect to browser for visual editing",
    handler: async (_args, ctx) => {
      if (server) {
        // Stop design mode
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
        ctx.ui.setWidget("design", [`🔴 Design Mode | WS: waiting... | Port: ${port}`]);

        server.onMessage((_ws, message) => {
          // Message handlers will be added in later slices
          console.log("[design-mode]", message.type);
        });

        ctx.ui.notify(`Design mode on — WS server on port ${port}`, "info");
      } catch (err) {
        ctx.ui.notify(`Failed to start design mode: ${err}`, "error");
        server = undefined;
      }
    },
  });

  pi.on("session_shutdown", async () => {
    if (server) {
      await server.stop();
      server = undefined;
    }
  });
}
