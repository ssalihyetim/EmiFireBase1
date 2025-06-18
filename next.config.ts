// next.config.js
import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// This is now correct because next-intl will look for ./i18n/request.ts by default
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      "https://9003-firebase-studio-1747202598214.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev",
      "https://9004-firebase-studio-1747202598214.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev",
    ],
    // Suppress warnings for sync dynamic APIs until next-intl is fully compatible with Next.js 15
    typedRoutes: false,
  },
  // Add this to suppress specific warnings in development
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Log level configuration to reduce warning noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Webpack configuration to suppress specific warnings
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Suppress the specific headers() warnings during development
      const originalWarnings = config.ignoreWarnings || [];
      config.ignoreWarnings = [
        ...originalWarnings,
        /headers\(\)\.get\('X-NEXT-INTL-LOCALE'\)/,
        /headers\(\) should be awaited before using its value/,
      ];
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
