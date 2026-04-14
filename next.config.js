/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tiendanube.com" },
      { protocol: "https", hostname: "**.nuvemshop.com.br" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  async rewrites() {
    return [
      // Shortlinks: kool.link/[slug] → /api/r/[slug]
      {
        source: "/:slug",
        destination: "/api/r/:slug",
        has: [{ type: "host", value: "kool.link" }],
      },
    ]
  },
}

module.exports = nextConfig
