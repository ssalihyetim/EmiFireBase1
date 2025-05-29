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
  },
};

export default withNextIntl(nextConfig);
