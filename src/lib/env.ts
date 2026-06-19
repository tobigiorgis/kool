import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

/**
 * Validación centralizada de variables de entorno.
 * Falla en build/arranque si falta una var requerida (en vez de crashear en runtime).
 * Set SKIP_ENV_VALIDATION=1 para saltear (ej. build de CI sin secrets reales).
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    CLERK_SECRET_KEY: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    TIENDANUBE_CLIENT_ID: z.string().min(1),
    TIENDANUBE_CLIENT_SECRET: z.string().min(1),
    TIENDANUBE_REDIRECT_URI: z.string().url(),
    TINYBIRD_API_KEY: z.string().min(1),
    TINYBIRD_BASE_URL: z.string().url().default("https://api.tinybird.co"),
    // Opcionales — features que no todos los entornos usan.
    BRIEF_READ_WRITE_TOKEN: z.string().optional(),
    WEBHOOK_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    // Multi-host routing: vacíos => app single-domain (ver DOMAINS.md).
    NEXT_PUBLIC_APP_DOMAIN: z.string().optional(),
    NEXT_PUBLIC_CREATOR_DOMAIN: z.string().optional(),
    NEXT_PUBLIC_ROOT_DOMAIN: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    TIENDANUBE_CLIENT_ID: process.env.TIENDANUBE_CLIENT_ID,
    TIENDANUBE_CLIENT_SECRET: process.env.TIENDANUBE_CLIENT_SECRET,
    TIENDANUBE_REDIRECT_URI: process.env.TIENDANUBE_REDIRECT_URI,
    TINYBIRD_API_KEY: process.env.TINYBIRD_API_KEY,
    TINYBIRD_BASE_URL: process.env.TINYBIRD_BASE_URL,
    BRIEF_READ_WRITE_TOKEN: process.env.BRIEF_READ_WRITE_TOKEN,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
    NEXT_PUBLIC_CREATOR_DOMAIN: process.env.NEXT_PUBLIC_CREATOR_DOMAIN,
    NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
