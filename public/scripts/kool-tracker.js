;(function () {
  "use strict"

  var KOOL_API_URL = "https://kool-beta.vercel.app"
  var STORAGE_KEY = "kool_ref"
  var COOKIE_NAME = "kool_ref"
  var EXPIRY_DAYS = 30

  function getRefFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search)
      return params.get("ref") || params.get("utm_campaign") || params.get("coupon")
    } catch (e) { return null }
  }

  // Guardar en cookie con dominio padre para que sobreviva al checkout
  function saveRef(code) {
    try {
      var expiry = new Date()
      expiry.setDate(expiry.getDate() + EXPIRY_DAYS)

      // Detectar dominio padre
      var host = window.location.hostname
      var parts = host.split(".")
      var parentDomain = parts.length >= 2 ? "." + parts.slice(-2).join(".") : host

      document.cookie = COOKIE_NAME + "=" + code +
        "; expires=" + expiry.toUTCString() +
        "; path=/; domain=" + parentDomain + "; SameSite=Lax"

      // Backup en localStorage
      localStorage.setItem(STORAGE_KEY, code)
      localStorage.setItem(STORAGE_KEY + "_expiry", expiry.getTime().toString())

      console.log("[Kool] Saved ref:", code, "domain:", parentDomain)
    } catch (e) {
      console.error("[Kool] Error saving ref:", e)
    }
  }

  function getSavedRef() {
    try {
      // 1. Intentar cookie
      var match = document.cookie.match(new RegExp("(^|;\\s*)" + COOKIE_NAME + "=([^;]+)"))
      if (match) return match[2]

      // 2. Fallback localStorage
      var expiry = parseInt(localStorage.getItem(STORAGE_KEY + "_expiry") || "0")
      if (Date.now() > expiry) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      return localStorage.getItem(STORAGE_KEY)
    } catch (e) { return null }
  }

  // Modificar todos los links internos para incluir el cupón
  function injectCouponInLinks(code) {
    try {
      var links = document.querySelectorAll("a[href]")
      var host = window.location.hostname

      for (var i = 0; i < links.length; i++) {
        var link = links[i]
        var href = link.getAttribute("href")
        if (!href) continue

        // Solo links internos (mismo dominio o relativos)
        var isInternal = href.startsWith("/") ||
          href.indexOf(host) !== -1 ||
          href.indexOf("tiendanube.com") !== -1 ||
          href.indexOf("mitiendanube.com") !== -1

        if (!isInternal) continue
        if (href.indexOf("coupon=") !== -1) continue

        var separator = href.indexOf("?") !== -1 ? "&" : "?"
        link.setAttribute("href", href + separator + "coupon=" + encodeURIComponent(code))
      }
    } catch (e) {
      console.error("[Kool] Error injecting in links:", e)
    }
  }

  // Interceptar formularios de "agregar al carrito"
  function interceptAddToCartForms(code) {
    try {
      var forms = document.querySelectorAll('form[action*="cart"], form[action*="carrito"], form.js-form-cart')
      for (var i = 0; i < forms.length; i++) {
        var form = forms[i]

        // Agregar campo oculto si no existe
        if (form.querySelector('input[name="coupon"]')) continue

        var input = document.createElement("input")
        input.type = "hidden"
        input.name = "coupon"
        input.value = code
        form.appendChild(input)
      }
    } catch (e) {
      console.error("[Kool] Error intercepting forms:", e)
    }
  }

  // Aplicar cupón directamente si encontramos el input (checkout)
  function applyCouponInCheckout(code) {
    var selectors = [
      'input[name="discount_coupon"]',
      'input[name="coupon"]',
      'input[id*="coupon"]',
      'input[id*="discount"]',
      'input[placeholder*="cupón"]',
      'input[placeholder*="cupon"]',
      'input[placeholder*="descuento"]',
      'input[placeholder*="código"]',
      '.js-coupon-input',
      '#coupon_code',
    ]

    for (var i = 0; i < selectors.length; i++) {
      var input = document.querySelector(selectors[i])
      if (!input) continue

      console.log("[Kool] Found coupon input, applying:", code)

      try {
        var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
        setter.call(input, code)
      } catch(e) {
        input.value = code
      }

      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))

      // Click submit
      setTimeout(function() {
        var btnSelectors = [
          'button[data-coupon-submit]',
          '.js-coupon-submit',
          'form[action*="coupon"] button[type="submit"]',
          'form[action*="discount"] button[type="submit"]',
          '.coupon-form button',
        ]
        for (var j = 0; j < btnSelectors.length; j++) {
          var btn = document.querySelector(btnSelectors[j])
          if (btn) { btn.click(); break }
        }
      }, 400)

      return true
    }
    return false
  }

  function init() {
    var refFromUrl = getRefFromUrl()
    if (refFromUrl) {
      console.log("[Kool] Ref from URL:", refFromUrl)
      saveRef(refFromUrl)
    }

    var code = refFromUrl || getSavedRef()
    if (!code) {
      console.log("[Kool] No active code")
      return
    }

    console.log("[Kool] Active code:", code)

    // Estrategia 1: inyectar en links
    injectCouponInLinks(code)

    // Estrategia 2: interceptar forms de carrito
    interceptAddToCartForms(code)

    // Estrategia 3: si estamos en checkout, aplicar directamente
    var isCheckout =
      window.location.pathname.indexOf("/checkout") !== -1 ||
      window.location.pathname.indexOf("/carrito") !== -1 ||
      window.location.hostname.indexOf("checkout") !== -1

    if (isCheckout) {
      applyCouponInCheckout(code)

      // Observar cambios del DOM
      if (window.MutationObserver) {
        var observer = new MutationObserver(function() {
          if (applyCouponInCheckout(code)) {
            observer.disconnect()
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
        setTimeout(function() { observer.disconnect() }, 15000)
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }

  // Re-ejecutar si cambia la URL (SPA)
  var lastUrl = window.location.href
  setInterval(function() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      var code = getSavedRef()
      if (code) {
        injectCouponInLinks(code)
        interceptAddToCartForms(code)
      }
    }
  }, 1500)
})()
