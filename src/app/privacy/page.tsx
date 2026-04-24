import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Política de Privacidad — Kool",
  description: "Cómo Kool recopila, usa y protege tu información personal.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Kool
          </Link>
        </div>

        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-400 mb-12">Última actualización: 24 de abril de 2025</p>

        <div className="prose prose-sm prose-gray max-w-none space-y-8 text-gray-600 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. Introducción</h2>
            <p>
              Kool ("nosotros", "nuestro") opera la plataforma disponible en{" "}
              <span className="text-gray-900">kool.link</span>. Esta política describe qué datos
              recopilamos, cómo los usamos y qué derechos tenés sobre ellos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">2. Datos que recopilamos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="text-gray-900 font-medium">Datos de cuenta:</span> nombre, email y
                contraseña al registrarte.
              </li>
              <li>
                <span className="text-gray-900 font-medium">Datos de la tienda:</span> nombre de tienda,
                dominio y tokens de acceso OAuth cuando conectás tu tienda Tiendanube.
              </li>
              <li>
                <span className="text-gray-900 font-medium">Datos de uso:</span> páginas visitadas,
                acciones realizadas en el dashboard y logs de errores.
              </li>
              <li>
                <span className="text-gray-900 font-medium">Datos de conversión:</span> órdenes, montos
                y códigos de descuento asociados a creators en tus campañas.
              </li>
              <li>
                <span className="text-gray-900 font-medium">Datos de tracking:</span> el script de Kool
                guarda una cookie (<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">kool_ref</code>)
                en el navegador del visitante para atribuir conversiones, con vencimiento de 30 días.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">3. Cómo usamos tus datos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Proveer y mejorar el servicio de Kool.</li>
              <li>Atribuir ventas a creators y calcular comisiones.</li>
              <li>Enviar notificaciones transaccionales (nuevas órdenes, conversiones).</li>
              <li>Detectar y prevenir fraudes o abusos en la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">4. Compartir datos con terceros</h2>
            <p>No vendemos tus datos. Podemos compartirlos con:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <span className="text-gray-900 font-medium">Tiendanube:</span> para sincronizar órdenes,
                coupons y webhooks a través de su API oficial.
              </li>
              <li>
                <span className="text-gray-900 font-medium">Clerk:</span> proveedor de autenticación.
              </li>
              <li>
                <span className="text-gray-900 font-medium">Vercel:</span> infraestructura de hosting.
              </li>
              <li>Autoridades legales cuando lo requiera la ley aplicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">5. Retención de datos</h2>
            <p>
              Conservamos tus datos mientras tu cuenta esté activa. Al eliminar tu cuenta, borramos
              tus datos personales en un plazo de 30 días, excepto los que debamos conservar por
              obligaciones legales.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">6. Tus derechos</h2>
            <p>Podés en cualquier momento:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Acceder, corregir o exportar tus datos.</li>
              <li>Solicitar la eliminación de tu cuenta y datos.</li>
              <li>Revocar el acceso de Kool a tu tienda Tiendanube desde el Partner Portal.</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos escribinos a{" "}
              <a href="mailto:hola@kool.link" className="text-gray-900 underline underline-offset-2">
                hola@kool.link
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">7. Seguridad</h2>
            <p>
              Los tokens de acceso se almacenan encriptados. Usamos HTTPS en todas las
              comunicaciones y seguimos buenas prácticas de seguridad para proteger tu información.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">8. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Te notificaremos por email ante cambios
              significativos. El uso continuado de Kool implica la aceptación de la política vigente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">9. Contacto</h2>
            <p>
              Preguntas sobre esta política:{" "}
              <a href="mailto:hola@kool.link" className="text-gray-900 underline underline-offset-2">
                hola@kool.link
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
