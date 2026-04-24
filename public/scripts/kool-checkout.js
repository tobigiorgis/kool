;(function () {
  "use strict"

  var COOKIE_NAME = "kool_ref"
  var STORAGE_KEY = "kool_ref"

  function getSavedRef() {
    try {
      // 1. Intentar cookie
      var match = document.cookie.match(
        new RegExp("(^|;\\s*)" + COOKIE_NAME + "=([^;]+)")
      )
      if (match) return match[2]

      // 2. Fallback localStorage
      var expiry = parseInt(
        localStorage.getItem(STORAGE_KEY + "_expiry") || "0"
      )
      if (Date.now() > expiry) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      return localStorage.getItem(STORAGE_KEY)
    } catch (e) {
      return null
    }
  }

  // Esperar a que NubeSDK esté disponible
  function waitForNubeSDK(callback, attempts) {
    attempts = attempts || 0
    if (attempts > 20) return

    if (window.NubeSDK) {
      callback(window.NubeSDK)
    } else {
      setTimeout(function () {
        waitForNubeSDK(callback, attempts + 1)
      }, 300)
    }
  }

  function applyDiscount(sdk, code) {
    try {
      // NubeSDK método para aplicar cupón
      sdk.dispatch({
        type: "cart:update",
        payload: {
          coupon: code,
        },
      })
      console.log("[Kool Checkout] Coupon applied via NubeSDK:", code)
    } catch (e) {
      console.error("[Kool Checkout] NubeSDK error:", e)
      // Fallback: intentar con DOM directo
      applyViaDOM(code)
    }
  }

  function applyViaDOM(code) {
    var selectors = [
      'input[name="discount_coupon"]',
      'input[name="coupon"]',
      'input[id*="coupon"]',
      'input[id*="discount"]',
      'input[placeholder*="cupón"]',
      'input[placeholder*="cupon"]',
      'input[placeholder*="descuento"]',
      'input[placeholder*="código"]',
      ".js-coupon-input",
      "#coupon_code",
    ]

    for (var i = 0; i < selectors.length; i++) {
      var input = document.querySelector(selectors[i])
      if (!input) continue

      console.log("[Kool Checkout] Applying via DOM:", code)

      try {
        var setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        ).set
        setter.call(input, code)
      } catch (e) {
        input.value = code
      }

      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))

      setTimeout(function () {
        var btnSelectors = [
          "button[data-coupon-submit]",
          ".js-coupon-submit",
          "form[action*='coupon'] button[type='submit']",
          "form[action*='discount'] button[type='submit']",
          ".coupon-form button",
        ]
        for (var j = 0; j < btnSelectors.length; j++) {
          var btn = document.querySelector(btnSelectors[j])
          if (btn) {
            btn.click()
            break
          }
        }
      }, 400)

      return true
    }
    return false
  }

  function init() {
    var code = getSavedRef()
    if (!code) {
      console.log("[Kool Checkout] No saved ref found")
      return
    }

    console.log("[Kool Checkout] Found code:", code)

    // Intentar con NubeSDK primero
    waitForNubeSDK(function (sdk) {
      applyDiscount(sdk, code)
    })

    // También intentar con DOM directo como fallback
    // por si NubeSDK no está disponible
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        applyViaDOM(code)
      })
    } else {
      applyViaDOM(code)
    }

    // Observar DOM para checkout dinámico
    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        if (applyViaDOM(code)) {
          observer.disconnect()
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      setTimeout(function () {
        observer.disconnect()
      }, 15000)
    }
  }

  init()
})()
