/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
};

export default nextConfig;
