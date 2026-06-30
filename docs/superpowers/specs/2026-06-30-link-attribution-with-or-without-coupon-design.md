# Atribución por link, con o sin cupón — Diseño

**Fecha:** 2026-06-30
**Branch:** `feat/link-attribution-no-coupon`
**Estado:** aprobado para implementación

## Problema

Hoy una conversión solo se atribuye si la orden trae un **código de cupón** que mapea a un creator. Si una marca no quiere dar descuento, no hay cupón → no hay tracking de quién generó la venta. El link queda fuera del sistema.

Objetivo: que un **link** trackee todas sus conversiones **tenga o no un cupón de descuento asociado**, y que cada conversión se atribuya al link y (si corresponde) a su creator.

## Estado actual (hechos verificados)

- **El modelo ya lo soporta.** `Conversion.linkId`, `Conversion.creatorId`, `Conversion.campaignId` son todos nullable (`prisma/schema.prisma:444-446`). Una conversión puede tener `linkId` sin `creatorId`. `Link.creatorId` y `Link.campaignId` también son nullable (`schema.prisma:160-161`). `Link.slug` es `@unique` (`schema.prisma:165`).
- **El identificador del link YA llega en cada orden**, con o sin cupón. La orden de Tiendanube trae `customer_visit`:
  ```json
  "customer_visit": {
    "landing_page": "https://tienda.../productos/tee/?utm_source=kool&utm_content=<slug>&coupon=<CODE>&...",
    "utm_parameters": { "utm_content": "<slug>", "utm_campaign": "...", "utm_source": "kool", "utm_medium": "affiliate" }
  }
  ```
  Verificado contra `GET /orders`: órdenes **sin cupón** (`discount_coupon: null`) igual traen el link en `customer_visit.utm_parameters` y `customer_visit.landing_page`.
- **El bug actual:** `parseTiendanubeOrderWebhook` lee `order.utm_parameters?.content` (top-level), que viene **siempre null**. El dato real está en `order.customer_visit.utm_parameters.utm_content` y en `customer_visit.landing_page`. Es la misma clase de bug que el del cupón (recién corregido: leer `order.coupon[]` en vez de `promotional_discount.code`).
- **El creator se resuelve solo del cupón.** Si un link tiene `creatorId` pero la orden no trae cupón, hoy la conversión queda sin creator y sin comisión (`route.ts:148-182`).
- **No hay `customer_visit` en el tipo `TiendanubeOrder`** ni se lee en el webhook (`src/lib/tiendanube/index.ts:47-96`, `src/app/api/webhooks/tiendanube/order-paid/route.ts`).
- **No existe matching click→orden.** El `Click` no comparte ninguna clave con la orden (sin email/customer id); el `ipHash` se usa solo para contar clicks únicos. (No se usa en este diseño.)

## Decisión de negocio (tomada)

Comisión cuando una venta entra por el link de un creator **sin cupón/descuento**: **configurable por link**. Un flag por link decide si paga comisión sin cupón.

## Diseño

### 1. Modelo de datos

Agregar a `Link`:

```prisma
/// Si true, el link paga comisión al creator aunque la orden no traiga cupón.
commissionWithoutCoupon Boolean @default(false)
```

Migración Prisma. Default `false` → comportamiento actual no cambia para links existentes.

### 2. Lectura de la orden (fuente del dato)

Para garantizar que `customer_visit` esté presente y el cupón sea autoritativo, el webhook **trae la orden completa por la API** (`GET /orders/{id}`) usando el token de la conexión, en vez de confiar solo en el body del webhook. Esto elimina la dependencia del shape del payload del webhook (origen de los dos bugs de "campo equivocado").

> Optimización opcional en implementación: si el body del webhook ya incluye `customer_visit`, usarlo y saltear el fetch. Por defecto, fetch.

### 3. Parsing — `parseTiendanubeOrderWebhook` (o equivalente sobre la orden completa)

Devuelve:

- `creatorCode`: `order.coupon[].code` → `customer_visit.utm_parameters.utm_campaign` → (parse de `landing_page`), uppercased. (Hoy ya lee `coupon[]`; agregar la lectura desde `customer_visit`.)
- `linkSlug`: `customer_visit.utm_parameters.utm_content` → fallback: parsear `utm_content` de `customer_visit.landing_page`.
- `couponApplied`: boolean — ¿la orden tiene algún cupón aplicado? (`order.coupon[].code` presente).

### 4. Resolución de atribución (webhook)

1. **LINK** — por `linkSlug` (slug). Backup: por el creator del cupón (lookup existente).
2. **CREATOR** — del cupón (`campaignCreator` / `creator` por `discountCode`). Si no hay → `link.creatorId`.
3. **CAMPAÑA** — `campaignCreator.campaignId`. Si no → `link.campaignId`.
4. **CONVERSIÓN** — se registra siempre que haya `link` **o** `creator` (incluye link sin creator → conversión sin comisión).
5. **COMISIÓN** — se crea si: hay `creator`, `commissionPct > 0`, y (`couponApplied` **o** `link.commissionWithoutCoupon === true`).

### 5. Casos cubiertos

| Caso                              | Conversión                          | Comisión          |
| --------------------------------- | ----------------------------------- | ----------------- |
| Link + cupón (creator)            | ✅ atribuida a link + creator       | ✅                |
| Link sin cupón, creator, flag ON  | ✅                                  | ✅                |
| Link sin cupón, creator, flag OFF | ✅                                  | ❌ (solo trackea) |
| Link genérico sin creator         | ✅ atribuida al link                | ❌                |
| Venta directa, sin link ni cupón  | ❌ (solo DropProductSale si aplica) | ❌                |

### 6. Edge cases

- **Cupón y `utm_content` apuntan a cosas distintas** (ej. cupón del creator A, `utm_content` del link B de otro creator): gana el **link del click** (`utm_content`) para `linkId`, y el **creator del cupón** para `creatorId`. `customer_visit` guarda una visita; en data real de un cliente normal no se cruzan. Documentado, no bloqueante.
- **`utm_content` ausente** (links viejos sin slug en la URL): cae al lookup por creator del cupón (comportamiento actual). Los links nuevos siempre mandan `utm_content` (`route.ts:90`).
- **Idempotencia**: se mantiene el check `@@unique([orderId, platform])` (sin cambios).
- **Firma HMAC**: se verifica antes de cualquier fetch/proceso (sin cambios).

## Testing

- **Unit**: parsing de una orden con `customer_visit` (con y sin cupón) → `linkSlug` y `creatorCode` correctos; fallback a `landing_page`.
- **Unit/integration**: regla de comisión (flag ON/OFF × cupón sí/no).
- **E2E sintético** (como el fix del cupón): POST de un webhook firmado **sin cupón**, con `customer_visit.utm_content = <slug real>`, contra el endpoint → confirmar `Conversion` con `linkId` + `creatorId` (del link) + `Commission` cuando el flag está ON; limpiar la fila de prueba.

## Fuera de scope

- Captura de UTM vía scripts NubeSDK (no hace falta; `customer_visit` es nativo).
- Matching click→orden por IP/fingerprint.
- UI para setear `commissionWithoutCoupon` por link (se puede sumar después; el flag y el backend van primero).
- Atribución multi-touch / ventana de atribución configurable.
