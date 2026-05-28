import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // INTERNAL_API_URL uses Docker service name (server-side only).
        // Fallback 'http://backend:7120' covers production Docker builds where the
        // env var is not available at build time but the service name is always valid.
        // NEXT_PUBLIC_API_URL is used only for local dev outside Docker.
        destination: `${process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://backend:7120'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
