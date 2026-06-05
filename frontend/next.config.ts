import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = dirname(fileURLToPath(import.meta.url));
const ramzServiceUrl = process.env.RAMZ_SERVICE_URL ?? "http://127.0.0.1:8000";
const predictionServiceUrl =
  process.env.PREDICTION_SERVICE_URL ?? "http://127.0.0.1:8002";

const nextConfig: NextConfig = {
  turbopack: {
    root: rootDirectory,
  },
  async rewrites() {
    return [
      {
        source: "/api/ramz/api/:path*",
        destination: `${ramzServiceUrl}/api/:path*`,
      },
      {
        source: "/api/ramz/:path*",
        destination: `${ramzServiceUrl}/api/:path*`,
      },
      {
        source: "/api/prediction/:path*",
        destination: `${predictionServiceUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
