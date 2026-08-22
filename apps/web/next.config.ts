import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Only the container image consumes the standalone bundle, and emitting it
  // requires symlink privileges that a non-elevated Windows shell lacks.
  // Dockerfile.web sets NEXT_STANDALONE=1.
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["lucide-react"],
};

export default withNextIntl(nextConfig);
