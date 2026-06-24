# Dominios — checklist de cutover (joinkool.co)

Estado: código **pre-armado y gateado**. Mientras los envs `NEXT_PUBLIC_*_DOMAIN`
estén vacíos, la app funciona en un solo dominio como hasta ahora (cero cambios
de comportamiento). Al setearlos, se activa el routing multi-host.

## Arquitectura v1 — redirect-alias (la actual)

Dominio **canónico**: `app.joinkool.co` (dashboard de marca + portal de creators).
La auth de Clerk vive en un único dominio → simple, sin "satellite domains".

| Host                  | Comportamiento                                           |
| --------------------- | -------------------------------------------------------- |
| `app.joinkool.co`     | App / dashboard (sirve normal: `/dashboard`, `/creator`) |
| `www.joinkool.co`     | Landing (sirve la `/` de la app)                         |
| `joinkool.co` (apex)  | Vercel redirige → `www.joinkool.co` (en Vercel, no app)  |
| `creator.joinkool.co` | 307 → `app.joinkool.co/creator` (middleware)             |
| `refer.joinkool.co`   | Short links de afiliado → rewrite a `/api/r/:slug`       |

Lógica en `src/middleware.ts`: `hostRedirect` (apex/creator) y `shortlinkRewrite`
(dominio corto). El shortlink se resuelve en el middleware (NO en `next.config`)
porque el middleware corre ANTES de los rewrites → así el slug no rebota al login.
`refer.joinkool.co` se configura con `NEXT_PUBLIC_SHORT_DOMAIN`; el legacy `kool.link`
sigue resolviendo durante la transición.

## Pasos de cutover (cuando el DNS propague)

1. **Vercel → Settings → Domains → Add**:
   - `joinkool.co`
   - `app.joinkool.co`
   - `creator.joinkool.co`
   - `refer.joinkool.co` (short links)
     (DNS ya delegado a Vercel vía nameservers → verifican solas + SSL auto.)

2. **Vercel → Settings → Environment Variables** (production):

   ```
   NEXT_PUBLIC_APP_URL=https://app.joinkool.co
   NEXT_PUBLIC_APP_DOMAIN=app.joinkool.co
   NEXT_PUBLIC_CREATOR_DOMAIN=creator.joinkool.co
   NEXT_PUBLIC_SHORT_DOMAIN=refer.joinkool.co
   # NEXT_PUBLIC_ROOT_DOMAIN: NO setear — Vercel ya redirige el apex → www.
   TIENDANUBE_REDIRECT_URI=https://app.joinkool.co/api/auth/tiendanube/callback
   ```

3. **Clerk dashboard**:
   - Agregar `app.joinkool.co` (y `joinkool.co`) a los dominios permitidos /
     allowed origins de la instancia de producción.
   - Si se usa instancia de producción nueva → cargar las prod keys
     (`pk_live_…`, `sk_live_…`) en Vercel.

4. **Tiendanube (Partners dashboard)**:
   - Actualizar la **Redirect URI** de la app a
     `https://app.joinkool.co/api/auth/tiendanube/callback`
     (debe coincidir EXACTO con `TIENDANUBE_REDIRECT_URI`).

5. **Redeploy** y verificar:
   - `app.joinkool.co/dashboard` carga y loguea.
   - `creator.joinkool.co` redirige a `app.joinkool.co/creator`.
   - `joinkool.co` redirige a `app.joinkool.co`.
   - `refer.joinkool.co/<slug>` → 302 a la tienda (rápido, sin pasar por login).
   - Login/OAuth Tiendanube OK.

6. **Webhooks (tiendas ya conectadas antes del cutover)**: el `order/paid` quedó
   apuntando a la URL vieja del deploy. Re-registrar reconectando la tienda por
   OAuth (re-corre `registerTiendanubeWebhooks` con la `NEXT_PUBLIC_APP_URL`
   nueva) o con un script one-off. Verificar con `scripts/verify-tiendanube.ts list`.

## Subdominio nativo del creator (Fase 2 — IMPLEMENTADO)

El portal del creator se sirve **nativo** en `creator.joinkool.co` con URL limpia
(sin el prefijo `/creator` visible). NO hace falta **Clerk satellite domain**:
subdominios del mismo root (`app.`/`creator.`/`go.`) comparten la sesión solos
(satellite es solo para roots distintos). Una sola instancia Clerk de producción.

Cómo funciona:

- `src/middleware.ts` → `creatorRewrite`: en `host === NEXT_PUBLIC_CREATOR_DOMAIN`
  reescribe `/<x>` → `/creator/<x>` (`/` → `/creator`), corriendo `auth.protect()`
  antes. Las rutas compartidas pasan derecho: `/login`, `/register`, `/onboarding`,
  `/apply`, `/api`, `/scripts`, `/privacy`, `/support` (+ assets).
- Links internos del portal usan `creatorPath()` (`src/lib/host.ts`) → limpios en
  prod, con prefijo `/creator` en dev (localhost) → andan en ambos.
- Post-login rutea por rol al host correcto (`roleHomeUrl`): creator → `creator.`,
  marca → `app.`. Canonicalización cross-host en los layouts.
- `clerkMiddleware` recibe `authorizedParties` (app + creator) cuando los domains
  están seteados.

### Pasos Clerk (producción)

- Instancia de **producción** keyada en `joinkool.co` (`pk_live`/`sk_live`) →
  cookie en `.joinkool.co`, compartida entre subdominios.
- Agregar `https://creator.joinkool.co` (y `https://app.joinkool.co`) a **allowed
  origins** y **allowed redirect URLs** (para aceptar el `afterSignInUrl` absoluto
  al host del creator).

### Dev local (probar el split de hosts)

Usar `lvh.me` (resuelve a 127.0.0.1, soporta subdominios sin tocar `/etc/hosts`).
En `.env.local`: `NEXT_PUBLIC_APP_DOMAIN=app.lvh.me`,
`NEXT_PUBLIC_CREATOR_DOMAIN=creator.lvh.me`. Abrir `http://creator.lvh.me:3000`.
Sin esos envs (`localhost:3000`), todo es single-domain como antes.
