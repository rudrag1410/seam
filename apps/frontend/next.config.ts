import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@seam/ui", "@seam/resume-core", "@seam/api-client"],
  reactStrictMode: true,
  compress: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  rewrites: async () => [
    {
      source: "/v1/:path*",
      destination: `${process.env.API_PROXY_URL ?? "http://localhost:8000"}/v1/:path*`,
    },
  ],
  redirects: async () => [{ source: "/home", destination: "/tailor/new", permanent: false }],
};

export default config;
