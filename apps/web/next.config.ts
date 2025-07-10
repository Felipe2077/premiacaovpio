import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://10.10.112.205:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
