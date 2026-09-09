import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
  },
  serverExternalPackages: ["ios-device-list"],
};

export default nextConfig;
