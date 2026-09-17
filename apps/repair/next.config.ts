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
      "./src/lib/legal-catalog.ts",
    ],
  },
  serverExternalPackages: ["pdfkit", "resend"],
};

export default nextConfig;
