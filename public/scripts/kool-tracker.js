/**
 * Kool Tracker — Script de storefront para Tiendanube
 *
 * Este script se inyecta en todas las tiendas conectadas a Kool.
 * Detecta el parámetro ?ref=CODIGO en la URL y aplica
 * el cupón automáticamente en el checkout.
 *
 * El script es minúsculo (<2KB) y no bloquea el render.
 *
 * ARCHIVO: /public/scripts/kool-tracker.js
 * URL pública: https://app.kool.link/scripts/kool-tracker.js
 */

;(function () {
  "use strict"

  var STORAGE_KEY = "kool_ref"
  var STORAGE_EXPIRY_KEY = "kool_ref_expiry"
  var EXPIRY_DAYS = 30 // El código se recuerda 30 días (ventana de atribución)

  /**
   * Lee el parámetro ?ref= de la URL actual
   */
  function getRefFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search)
      return params.get("ref") || params.get("utm_campaign")
    } catch (e) {
      return null
    }
  }

  /**
   * Guarda el código en sessionStorage con expiración
   */
  function saveRef(code) {
    try {
      var expiry = Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000
      sessionStorage.setItem(STORAGE_KEY, code)
      sessionStorage.setItem(STORAGE_EXPIRY_KEY, expiry.toString())
    } catch (e) {}
  }

  /**
   * Lee el código guardado (si no expiró)
   */
  function getSavedRef() {
    try {
      var expiry = parseInt(sessionStorage.getItem(STORAGE_EXPIRY_KEY) || "0")
      if (Date.now() > expiry) {
        sessionStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem(STORAGE_EXPIRY_KEY)
        return null
      }
      return sessionStorage.getItem(STORAGE_KEY)
    } catch (e) {
      return null
    }
  }

  /**
   * Aplica el cupón en el checkout de Tiendanube.
   *
   * Tiendanube tiene un input con id="coupon_code" o similar
   * en la página de checkout. Lo detectamos y llenamos.
   */
  function applyCouponInCheckout(code) {
    // Selector del input de cupón en Tiendanube
    var selectors = [
      'input[name="discount_coupon"]',
      'input[id="discount-coupon"]',
      'input[placeholder*="cupón"]',
      'input[placeholder*="cupon"]',
      'input[placeholder*="descuento"]',
      'input[placeholder*="código"]',
      'input[placeholder*="codigo"]',
      ".js-coupon-input",
    ]

    var input = null
    for (var i = 0; i < selectors.length; i++) {
      input = document.querySelector(selectors[i])
      if (input) break
    }

    if (!input) return

    // Llenar el input
    var nativeInputSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set
    nativeInputSetter.call(input, code)
    input.dispatchEvent(new Event("input", { bubbles: true }))
    input.dispatchEvent(new Event("change", { bubbles: true }))

    // Buscar y hacer click en el botón de aplicar
    var submitBtn = document.querySelector(
      'button[data-coupon-submit], .js-coupon-submit, button[type="submit"][form*="coupon"]'
    )
    if (submitBtn) {
      setTimeout(function () {
        submitBtn.click()
      }, 300)
    }
  }

  /**
   * Observa cambios en el DOM para detectar cuando
   * el checkout aparece en la página (SPA behavior)
   */
  function watchForCheckout(code) {
    var observer = new MutationObserver(function () {
      applyCouponInCheckout(code)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // También intentamos aplicar inmediatamente
    applyCouponInCheckout(code)

    // Timeout de seguridad: dejamos de observar después de 30s
    setTimeout(function () {
      observer.disconnect()
    }, 30000)
  }

  /**
   * Punto de entrada principal
   */
  function init() {
    // 1. Leer el ref de la URL actual
    var refFromUrl = getRefFromUrl()
    if (refFromUrl) {
      saveRef(refFromUrl)
    }

    // 2. Obtener el código (desde URL o guardado)
    var code = refFromUrl || getSavedRef()
    if (!code) return

    // 3. Si estamos en el checkout, aplicar el cupón
    var isCheckout =
      window.location.pathname.includes("/checkout") ||
      window.location.pathname.includes("/carrito") ||
      document.querySelector('[data-page="checkout"]') !== null

    if (isCheckout) {
      // Esperar a que el DOM esté listo
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
          watchForCheckout(code)
        })
      } else {
        watchForCheckout(code)
      }
    }
  }

  // Correr inmediatamente
  init()
})()
