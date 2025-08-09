import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Make environment variables available to the browser
    NEXT_PUBLIC_IPFS_GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? '',
    NEXT_PUBLIC_INFURA_PROJECT_ID: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ?? '',
    NEXT_PUBLIC_INFURA_PROJECT_SECRET: process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET ?? '',
    NEXT_PUBLIC_PINATA_API_KEY: process.env.NEXT_PUBLIC_PINATA_API_KEY ?? '',
    NEXT_PUBLIC_PINATA_SECRET_API_KEY: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY ?? '',
    NEXT_PUBLIC_MEDICAL_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_MEDICAL_REGISTRY_ADDRESS ?? '',
  },
  webpack: (config) => {
    // IPFS uses native modules that need polyfills in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      path: false,
      os: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
