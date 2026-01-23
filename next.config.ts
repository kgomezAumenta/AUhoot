import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress cross-origin warnings during dev
  experimental: {
    serverActions: {
      allowedOrigins: ["*"] // Allow all origins for server actions
    }
  }
};

export default nextConfig;
