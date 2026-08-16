import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Whitelist LAN IPs that are allowed to access the Next.js dev server.
  // Without this, requests from other devices on the network are blocked with 403.
  allowedDevOrigins: ["192.168.1.206"],

  async rewrites() {
    // Proxy /api/v1/* → the FastAPI backend.
    // This way the browser always calls a relative path (same host/port as the
    // Next.js dev server), which works on any device on the LAN without
    // hardcoding the server IP in NEXT_PUBLIC_API_URL.
    const backendUrl =
      process.env.BACKEND_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000/api/v1";

    // Normalise: strip trailing /api/v1 so we can append it cleanly
    const backendBase = backendUrl.replace(/\/api\/v1\/?$/, "");

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
