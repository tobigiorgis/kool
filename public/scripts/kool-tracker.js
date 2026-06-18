// public/scripts/kool-tracker.js
// Script de STOREFRONT para Kool — NubeSDK.
// Docs: https://dev.nuvemshop.com.br/en/docs/applications/nube-sdk/
//
// ⚠️ Corre en un Web Worker SANDBOX: NO hay document, window, cookies ni
// localStorage. Todo es vía el modelo de eventos/estado del SDK.
//
// Qué hace: captura el código del creator desde la URL (?ref / ?utm_campaign /
// ?coupon), lo persiste en asyncLocalStorage (scoped a la app, 30 días) y lo
// aplica como cupón del carrito. Una vez aplicado, vive en `cart.coupon` y
// sobrevive solo al checkout (que también es sandbox) → la venta se atribuye.

export function App(nube) {
  var KEY = "kool_ref"
  var TTL = 30 * 24 * 60 * 60 // 30 días, en segundos
  var COUPON_RE = /^[A-Za-z0-9_-]{2,40}$/

  var browser = nube.getBrowserAPIs()
  var store = browser && browser.asyncLocalStorage

  function clean(v) {
    if (!v) return null
    v = String(v).trim()
    return COUPON_RE.test(v) ? v : null
  }

  // Lee el código de los query params de la URL (sandbox-safe vía el SDK).
  function refFromQueries(q) {
    if (!q) return null
    return clean(q.coupon || q.ref || q.kool_ref || q.utm_campaign)
  }

  // Código de cupón ya aplicado en el carrito, si lo hay.
  function appliedCoupon(cart) {
    var c = cart && cart.coupon
    if (!c) return null
    return clean(typeof c === "string" ? c : c.code)
  }

  function applyIfNeeded(state, code) {
    if (!code || !state || !state.cart) return
    if (appliedCoupon(state.cart) === code) return // ya está
    nube.send("coupon:add", function () {
      return { cart: { coupon: { code: code } } }
    })
    console.log("[Kool] coupon:add →", code)
  }

  // Resuelve el código: prioridad URL (y lo persiste); si no, storage previo.
  function resolve(state, cb) {
    var fromUrl = refFromQueries(state.location && state.location.queries)
    if (fromUrl) {
      if (store) store.setItem(KEY, fromUrl, TTL).catch(function () {})
      cb(fromUrl)
      return
    }
    if (!store) return cb(null)
    store.getItem(KEY).then(function (saved) { cb(clean(saved)) }).catch(function () { cb(null) })
  }

  function handle() {
    var state = nube.getState()
    resolve(state, function (code) { applyIfNeeded(state, code) })
  }

  // Arranque + cuando cambia el carrito (agregan productos) + navegación.
  try { handle() } catch (e) {}
  nube.on("cart:update", function () { try { handle() } catch (e) {} })
  nube.on("location:updated", function () { try { handle() } catch (e) {} })

  nube.on("coupon:add:success", function (state) {
    console.log("[Kool] cupón aplicado:", appliedCoupon(state.cart))
  })
  nube.on("coupon:add:fail", function () {
    console.warn("[Kool] coupon:add falló (cupón inválido o sin carrito todavía)")
  })
}
