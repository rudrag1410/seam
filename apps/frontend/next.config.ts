import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@seam/ui", "@seam/resume-core", "@seam/api-client"],
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  redirects: async () => [{ source: "/home", destination: "/tailor/new", permanent: false }],
};

export default config;
