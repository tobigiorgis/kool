# Kool

**Plataforma de links, tracking y partnerships para LATAM**

Trackea campañas con influencers, gestioná gifting y medí conversiones — conectado a Tiendanube y Shopify.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Auth | Clerk |
| Base de datos | PostgreSQL (Neon) + Prisma |
| Analytics | Tinybird |
| Email | Resend |
| Deploy | Vercel |

---

## Setup local

### 1. Clonar y instalar

```bash
git clone https://github.com/tu-org/kool
cd kool
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
# Completar todas las variables en .env.local
```

Variables necesarias para el MVP:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `CLERK_SECRET_KEY` — Clerk backend key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk frontend key
- `TINYBIRD_API_KEY` — Tinybird admin token
- `RESEND_API_KEY` — Resend API key
- `TIENDANUBE_CLIENT_ID` — App ID del Partner Portal de Tiendanube
- `TIENDANUBE_CLIENT_SECRET` — App Secret del Partner Portal de Tiendanube
- `ENCRYPTION_KEY` — 32 bytes hex para encriptar access tokens

### 3. Base de datos

```bash
npm run db:push     # Crear tablas en Neon
npm run db:studio   # Abrir Prisma Studio (opcional)
```

### 4. Tinybird

Crear los siguientes Data Sources y Pipes en Tinybird:

**Data Source: `kool_clicks`**
```sql
SCHEMA >
    `link_id`       String,
    `workspace_id`  String,
    `creator_id`    String,
    `timestamp`     DateTime,
    `country`       LowCardinality(String),
    `city`          String,
    `region`        String,
    `device`        LowCardinality(String),
    `os`            LowCardinality(String),
    `browser`       LowCardinality(String),
    `source`        LowCardinality(String),
    `referer`       String,
    `utm_campaign`  String,
    `utm_source`    String,
    `utm_medium`    String,
    `ip_hash`       String
```

**Pipes necesarios:**
- `kool_link_stats` — Total clics y unique clics por link_id + rango de fechas
- `kool_clicks_by_day` — Clics agrupados por día
- `kool_clicks_by_country` — Top países
- `kool_clicks_by_device` — Desglose mobile/desktop
- `kool_clicks_by_source` — Desglose por red social
- `kool_workspace_stats` — Stats agregadas por workspace
- `kool_creator_stats` — Stats por creator

### 5. Tiendanube App

1. Registrarse en [partners.tiendanube.com](https://partners.tiendanube.com)
2. Crear una nueva App
3. Configurar redirect URL: `https://tu-dominio.com/api/auth/tiendanube/callback`
4. Copiar Client ID y Client Secret al `.env.local`

### 6. Correr en local

```bash
npm run dev
# App en http://localhost:3000
```

---

## Estructura del proyecto

```
kool/
├── prisma/
│   └── schema.prisma          # Modelo de datos completo
├── public/
│   └── scripts/
│       └── kool-tracker.js    # Script inyectado en storefronts TN
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/tiendanube/callback/  # OAuth TN callback
│   │   │   ├── links/[slug]/              # Redirect handler
│   │   │   ├── gifting/                   # API de gifting
│   │   │   └── webhooks/tiendanube/       # Webhook order/paid
│   │   ├── dashboard/                     # Panel de la marca/agencia
│   │   │   ├── links/
│   │   │   ├── analytics/
│   │   │   ├── creators/
│   │   │   ├── gifting/
│   │   │   └── briefing/
│   │   └── creator/                       # Panel del creator
│   ├── lib/
│   │   ├── tiendanube/        # Cliente API + OAuth + helpers
│   │   ├── tinybird/          # Analytics client
│   │   ├── email/             # Templates y envío con Resend
│   │   └── utils/
│   └── types/
```

---

## Flujo de atribución

```
1. Creator comparte: kool.link/camila
2. Comprador hace clic
3. Kool registra clic en Tinybird (país, dispositivo, hora)
4. Redirect a: tienda.com/producto?ref=CAMILA15&utm_campaign=CAMILA15
5. Script JS en la tienda detecta ?ref=CAMILA15
6. Aplica cupón CAMILA15 en el checkout automáticamente
7. Comprador compra → Tiendanube dispara webhook order/paid
8. Kool matchea CAMILA15 → creator Camila
9. Se registra conversión + comisión pendiente
```

---

## Deploy

```bash
# Vercel (recomendado)
vercel deploy

# Variables de entorno en Vercel Dashboard
# Dominio corto: kool.link → apuntar a Vercel
```
