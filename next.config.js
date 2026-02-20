/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    unoptimized: false,
  },
};

module.exports = nextConfig;
