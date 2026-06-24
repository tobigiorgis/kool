/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tiendanube.com" },
      { protocol: "https", hostname: "**.nuvemshop.com.br" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  // Shortlinks (<short-domain>/:slug → /api/r/:slug) ahora los resuelve
  // src/middleware.ts, que corre ANTES de los rewrites de next.config y por
  // eso evita el rebote a login de Clerk. Ver shortlinkRewrite().
}

module.exports = nextConfig
