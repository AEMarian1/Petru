import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imaginea pentru containere (producția, în Azure) folosește ieșirea „standalone”.
  output: process.env.NETLIFY ? undefined : "standalone",
  poweredByHeader: false,
};

export default nextConfig;
