// public/scripts/kool-checkout.js
// Script de CHECKOUT para Kool — NubeSDK.
// Docs: https://dev.nuvemshop.com.br/en/docs/applications/nube-sdk/
//
// ⚠️ El checkout nuevo corre en Web Worker SANDBOX: NO hay document, window,
// cookies ni localStorage. Por eso NO leemos cookies (eso rompía antes).
//
// Estrategia:
//   1) Si el storefront (kool-tracker.js) ya aplicó el cupón, `cart.coupon` lo
//      trae → no hacemos nada.
//   2) Si no, recuperamos el código de la URL (state.location.queries) o del
//      asyncLocalStorage (lo dejó el tracker; el storage es scoped a la app,
//      compartido entre storefront y checkout) y lo aplicamos con coupon:add.

export function App(nube) {
  var KEY = "kool_ref"
  var COUPON_RE = /^[A-Za-z0-9_-]{2,40}$/

  var browser = nube.getBrowserAPIs()
  var store = browser && browser.asyncLocalStorage

  function clean(v) {
    if (!v) return null
    v = String(v).trim()
    return COUPON_RE.test(v) ? v : null
  }

  function refFromQueries(q) {
    if (!q) return null
    return clean(q.coupon || q.ref || q.kool_ref || q.utm_campaign)
  }

  function appliedCoupon(cart) {
    var c = cart && cart.coupon
    if (!c) return null
    return clean(typeof c === "string" ? c : c.code)
  }

  function apply(code) {
    if (!code) return
    nube.send("coupon:add", function () {
      return { cart: { coupon: { code: code } } }
    })
    console.log("[Kool Checkout] coupon:add →", code)
  }

  function ensure() {
    var state = nube.getState()
    if (!state || !state.cart) return

    // 1) ya aplicado → listo
    if (appliedCoupon(state.cart)) return
    // 2) en la URL del checkout
    var fromUrl = refFromQueries(state.location && state.location.queries)
    if (fromUrl) { apply(fromUrl); return }
    // 3) lo que dejó el tracker en el storage
    if (!store) return
    store.getItem(KEY).then(function (saved) {
      var code = clean(saved)
      if (code) apply(code)
    }).catch(function () {})
  }

  nube.on("checkout:ready", function () { try { ensure() } catch (e) {} })
  nube.on("cart:update", function () { try { ensure() } catch (e) {} })

  nube.on("coupon:add:success", function (state) {
    console.log("[Kool Checkout] aplicado:", appliedCoupon(state.cart))
  })
  nube.on("coupon:add:fail", function () {
    console.warn("[Kool Checkout] coupon:add falló")
  })
}
