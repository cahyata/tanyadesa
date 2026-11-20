import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // /admin membaca data/sop saat dijalankan (bukan saat build), jadi berkasnya harus ikut dibundel
  outputFileTracingIncludes: {
    "/admin": ["./data/sop/**/*"],
  },
};

export default nextConfig;
