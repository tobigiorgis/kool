// public/scripts/kool-checkout.js
// Script de checkout para Kool usando NubeSDK de Tiendanube
// Documentación: https://tiendanube.github.io/nube-sdk/

((app) => {
  // Leer el código guardado en cookie
  function getSavedRef() {
    try {
      var match = document.cookie.match(/(^|;\s*)kool_ref=([^;]+)/)
      if (match) return match[2]
      return localStorage.getItem('kool_ref') || null
    } catch (e) {
      return null
    }
  }

  app.on("checkout:ready", (state, helpers) => {
    const code = getSavedRef()
    if (!code) {
      console.log("[Kool Checkout] No saved ref found")
      return
    }

    console.log("[Kool Checkout] Found code:", code)

    // Aplicar cupón usando NubeSDK
    // El método exacto depende de la versión del SDK
    if (helpers && helpers.cart && helpers.cart.applyCoupon) {
      helpers.cart.applyCoupon(code)
        .then(() => console.log("[Kool Checkout] Coupon applied:", code))
        .catch((err) => console.error("[Kool Checkout] Error applying coupon:", err))
    } else if (helpers && helpers.applyCoupon) {
      helpers.applyCoupon(code)
        .then(() => console.log("[Kool Checkout] Coupon applied:", code))
        .catch((err) => console.error("[Kool Checkout] Error applying coupon:", err))
    }
  })

  // También intentar en cada cambio de paso del checkout
  app.on("checkout:step:change", (state, helpers) => {
    const code = getSavedRef()
    if (!code) return

    // Verificar si ya hay un cupón aplicado
    if (state.cart && state.cart.coupon === code) {
      console.log("[Kool Checkout] Coupon already applied:", code)
      return
    }

    if (helpers && helpers.cart && helpers.cart.applyCoupon) {
      helpers.cart.applyCoupon(code)
    }
  })

})(NubeSDK)
