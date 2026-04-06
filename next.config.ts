import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inlines App Router CSS into the HTML response in production so Tailwind/layout
  // still applies if `/_next/static/css/*` fails to load (strict proxies, previews, etc.).
  // Dev still uses linked stylesheets (required for HMR).
  experimental: {
    inlineCss: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for MetaMask SDK module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Handle React Native modules
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': require.resolve('@react-native-async-storage/async-storage'),
    };

    return config;
  },
};

export default nextConfig;

