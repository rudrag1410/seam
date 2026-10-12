import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@seam/ui", "@seam/resume-core", "@seam/api-client"],
  reactStrictMode: true,
  // lets a second dev server (for testing) run beside the main one without sharing build output
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // the old home page is gone; bookmarks to it open the tailoring screen
  redirects: async () => [{ source: "/home", destination: "/tailor/new", permanent: false }],
};

export default config;
