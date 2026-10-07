import type { NextConfig } from "next";

// The browser only ever talks to this origin; /api/* is proxied to FastAPI.
// That keeps the session cookie first-party and removes the need for CORS in production.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
