import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  turbopack: {
    resolveAlias: {
      '@': './app',
      '@components': './app/components',
      '@generated': './app/generated',
      '@lib': './app/lib',
    },
  },
};

export default nextConfig;
