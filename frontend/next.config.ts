import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = dirname(fileURLToPath(import.meta.url));
const ramzServiceUrl = process.env.RAMZ_SERVICE_URL ?? "http://127.0.0.1:8000";
const translateServiceUrl =
  process.env.TRANSLATE_SERVICE_URL ?? "http://127.0.0.1:8003";
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
      {
        source: "/api/translate/api/:path*",
        destination: `${translateServiceUrl}/api/:path*`,
      },
      {
        source: "/api/translate/:path*",
        destination: `${translateServiceUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
