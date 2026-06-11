import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    swcPlugins: [
      ["swc-plugin-react-source-string", { attr: "data-oid" }],
    ],
  },
};

export default nextConfig;
