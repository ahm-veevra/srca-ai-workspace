/** @type {import('next').NextConfig} */
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // On-prem model inference (large documents, Arabic, etc.) can legitimately take
    // 30–120s. Without this, the rewrite proxy cuts the request at ~30s and the browser
    // sees a 500 even though the backend completes. Allow long-running analyses.
    proxyTimeout: 180_000,
  },
  async rewrites() {
    // Proxy API calls through the web origin so httpOnly auth cookies stay
    // first-party to the browser (no cross-origin cookie issues in dev or prod).
    return [
      {
        source: "/api/:path*",
        destination: `${API_INTERNAL_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
