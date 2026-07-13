import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { clerkAllowedOrigins } from "@/lib/host"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Kool — Creator Commerce para LATAM",
  description: "Trackea campañas, gestioná gifting y medí conversiones con influencers.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Whitelist de dominios para los redirects cross-host de Clerk. Vacío en dev
  // single-domain → undefined (no cambia el comportamiento actual).
  const allowedOrigins = clerkAllowedOrigins()
  return (
    <ClerkProvider allowedRedirectOrigins={allowedOrigins.length ? allowedOrigins : undefined}>
      <html lang="es" className={`${geist.variable} ${geistMono.variable}`}>
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
