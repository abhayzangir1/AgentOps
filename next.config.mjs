/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable Next.js instrumentation hook (runs once per cold start)
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig
