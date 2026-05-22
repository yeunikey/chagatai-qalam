import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: "/ramz",
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
