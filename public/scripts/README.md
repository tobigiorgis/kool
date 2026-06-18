# Kool — Scripts de tienda (Tiendanube)

Estos `.js` son la **fuente** que se sube al Partner Portal. **NO** se inyectan
por API: el endpoint legacy `POST /scripts` con `src` propio **ya no registra
scripts** (modelo 2025-03). El flujo actual es Partner Portal + auto-install.

## Cómo se cargan en las tiendas (auto-install)

1. Entrar a **partners.tiendanube.com** → tu app → **Scripts**.
2. Crear un script por archivo:

   | Script             | location   | event              | auto-install | aprobación |
   |--------------------|------------|--------------------|--------------|------------|
   | `kool-tracker.js`  | `store`    | `onfirstinteraction` | ✅ sí       | no         |
   | `kool-checkout.js` | `checkout` | `onfirstinteraction` | ✅ sí       | no         |

   - Subir el archivo JS (Tiendanube lo hostea en `apps-scripts.tiendanube.com`).
   - **auto-install = sí** → se activa solo en cada tienda que instaló la app.
     No hace falta ninguna llamada a la API.
   - `event: onload` en `store` **requiere aprobación** por mail
     (api@nuvemshop.com.br). `onfirstinteraction` no la requiere y alcanza:
     el cupón se captura de la URL al primer scroll/click.

3. Verificar que quedó cargado en una tienda real:

   ```
   npx dotenv -e .env.local -- npx tsx scripts/verify-tiendanube.ts list <ref>
   ```

## Qué hace cada uno (modelo NubeSDK)

Ambos son apps NubeSDK: `export function App(nube)`, corren en Web Worker
**sandbox** (sin DOM/cookies/localStorage). Toda la lógica es vía eventos +
estado del SDK.

- **kool-tracker.js** (`store`): lee el código del creator de
  `state.location.queries` (`?ref` / `?utm_campaign` / `?coupon`), lo persiste
  en `asyncLocalStorage` (scoped a la app, 30 días) y lo aplica al carrito con
  `nube.send("coupon:add", …)`. El cupón queda en `cart.coupon`.

- **kool-checkout.js** (`checkout`): si `cart.coupon` ya viene aplicado del
  storefront, no hace nada; si no, recupera el código de la URL o del
  `asyncLocalStorage` (compartido con el tracker) y lo aplica con `coupon:add`.

## Handoff storefront → checkout (resuelto)

El sandbox no tiene cookies/localStorage, así que el handoff NO usa cookies.
El código viaja por dos canales del propio SDK:
1. **`cart.coupon`**: el tracker aplica el cupón en el storefront → queda en el
   carrito → el checkout lo hereda solo.
2. **`asyncLocalStorage`**: storage scoped a la app, compartido entre storefront
   y checkout (TTL 30 días) → respaldo si el cupón aún no se aplicó.

## ⚠️ A verificar en el Partner Portal

Estos archivos usan el entry point oficial `export function App(nube)` (sin
imports de npm, así que deberían subirse tal cual). Confirmá si el portal los
toma como módulo directo o pide bundle con `@tiendanube/nube-sdk-build`. La
lógica no cambia; sólo cambiaría el empaquetado. Validar siempre en tienda real
(logs `[Kool]` / `[Kool Checkout]` en consola).

## Fallback de atribución sin scripts

La atribución NO depende de estos scripts. El webhook `order/paid` atribuye por:
1. `promotional_discount.code` (cupón aplicado) — los scripts ayudan acá.
2. `utm_parameters.campaign` — Tiendanube lo captura **solo** si el cliente
   entra con `?utm_campaign=<codigo>`. Esto atribuye **sin ningún script**.

O sea: links de creator con `?utm_campaign=CODIGO` ya atribuyen. Los scripts
mejoran la conversión (auto-aplican el descuento), no son obligatorios para
trackear.
