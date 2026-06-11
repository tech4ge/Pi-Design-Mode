"use client";

// Pi Design Mode — Next.js client injection
// Import this in your root layout.tsx:
//   import { PiDesignClient } from "@pi-design/react-plugin/next";
//   ...
//   <PiDesignClient />
//
// Only activates in development. Tree-shaken in production builds.

export function PiDesignClient() {
  // The client self-initialises on import. This component just ensures
  // it's loaded in a Client Component context (Server Components
  // can't run browser-side code).
  //
  // Dynamic import avoids bundling the entire client into this chunk;
  // Next.js/Turbopack resolves @pi-design/react-plugin/client at runtime.
  if (process.env.NODE_ENV !== "production") {
    import("@pi-design/react-plugin/client");
  }
  return null;
}
