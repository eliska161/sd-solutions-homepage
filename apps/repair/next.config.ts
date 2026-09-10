import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingIncludes: {
    "/**": [
      "./data/**/*",
      "./assets/fonts/**/*",
      "./node_modules/pdfkit/**/*",
    ],
  },
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
