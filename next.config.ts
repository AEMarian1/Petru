import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imaginea pentru containere (producția, în Azure) folosește ieșirea „standalone”.
  output: process.env.NETLIFY ? undefined : "standalone",
  poweredByHeader: false,
  // Exportul registrului (CSV) se încarcă printr-o acțiune de server; limita implicită e 1 MB.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
