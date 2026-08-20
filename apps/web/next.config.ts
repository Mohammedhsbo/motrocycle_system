import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["lucide-react"],
};

export default withNextIntl(nextConfig);
