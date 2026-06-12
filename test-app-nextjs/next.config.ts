import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    swcPlugins: [
      ["swc-plugin-react-source-string", { root: process.cwd() }],
    ],
  },
};

export default nextConfig;
