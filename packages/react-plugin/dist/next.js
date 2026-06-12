"use client";

// src/next.tsx
import { useEffect } from "react";
function PiDesignClient() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      import("@pi-design/react-plugin/browser-client");
    }
  }, []);
  return null;
}
export {
  PiDesignClient
};
//# sourceMappingURL=next.js.map