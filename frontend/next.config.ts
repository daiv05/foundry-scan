import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // INTERNAL_API_URL uses Docker service name (server-side only)
        // NEXT_PUBLIC_API_URL is used as fallback for local dev outside Docker
        destination: `${process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
