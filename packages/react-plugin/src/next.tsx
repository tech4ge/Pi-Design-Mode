"use client";

// Pi Design Mode — Next.js client injection
// Import this in your root layout.tsx:
//   import { PiDesignClient } from "@pi-design/react-plugin/next";
//   ...
//   <PiDesignClient />
//
// Only activates in development. Tree-shaken in production builds.

export function PiDesignClient() {
  // The browser client self-initialises on import (IIFE side-effect).
  // This component ensures it's loaded in a Client Component context
  // (Server Components can't run browser-side code).
  if (process.env.NODE_ENV !== "production") {
    import("@pi-design/react-plugin/browser-client");
  }
  return null;
}
