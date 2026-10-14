/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 640, 768, 1024, 1280, 1600, 1920, 2560],
    imageSizes: [48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
