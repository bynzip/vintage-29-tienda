const storageUrl = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://unconfigured.invalid",
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
    middlewareClientMaxBodySize: 11534336,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 640, 768, 1024, 1280, 1600, 1920, 2560],
    imageSizes: [48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: storageUrl.protocol.slice(0, -1),
        hostname: storageUrl.hostname,
        port: storageUrl.port,
        pathname: "/storage/v1/object/public/catalog-media/**",
      },
    ],
  },
};

export default nextConfig;
