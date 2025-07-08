/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true,
    domains: []
  },
  experimental: {
    esmExternals: 'loose'
  }
};

module.exports = nextConfig;
