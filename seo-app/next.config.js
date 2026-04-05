/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fetch from Express API (same origin in prod or env)
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || '',
  },
  async rewrites() {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5002';
    return [
      { source: '/api/proxy/:path*', destination: `${base}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
