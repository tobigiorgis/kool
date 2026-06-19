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
| `kool.link`           | Short links (sin tocar)                                  |

Lógica en `src/middleware.ts` (`hostRedirect`).

## Pasos de cutover (cuando el DNS propague)

1. **Vercel → Settings → Domains → Add**:
   - `joinkool.co`
   - `app.joinkool.co`
   - `creator.joinkool.co`
     (DNS ya delegado a Vercel vía nameservers → verifican solas + SSL auto.)

2. **Vercel → Settings → Environment Variables** (production):

   ```
   NEXT_PUBLIC_APP_URL=https://app.joinkool.co
   NEXT_PUBLIC_APP_DOMAIN=app.joinkool.co
   NEXT_PUBLIC_CREATOR_DOMAIN=creator.joinkool.co
   # NEXT_PUBLIC_ROOT_DOMAIN: NO setear — Vercel ya redirige el apex → www.
   TIENDANUBE_REDIRECT_URI=https://app.joinkool.co/api/auth/tiendanube/callback
   ```

   (Dejar `NEXT_PUBLIC_SHORT_DOMAIN=kool.link`.)

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
   - Login/OAuth Tiendanube OK.

## Upgrade futuro — subdominio nativo (opcional)

Si se quiere que el portal viva _de verdad_ en `creator.joinkool.co` (URL
branded, sin redirect), hay que:

- Configurar `creator.joinkool.co` como **Clerk satellite domain**
  (auth cross-domain) — esta es la parte fiddly.
- Reemplazar el redirect por un **rewrite** host-based hacia `/creator/*`
  en `src/middleware.ts`, dejando intactas las rutas compartidas
  (`/login`, `/register`, `/onboarding`, `/api`, `/scripts`).

No es necesario para lanzar; v1 (redirect-alias) ya da links branded usables.
