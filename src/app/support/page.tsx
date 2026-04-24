import type { Metadata } from "next"
import Link from "next/link"
import { Mail, MessageCircle, BookOpen } from "lucide-react"

export const metadata: Metadata = {
  title: "Soporte — Kool",
  description: "Contactá al equipo de Kool o consultá los recursos de ayuda.",
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Kool
          </Link>
        </div>

        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Soporte</h1>
        <p className="text-gray-500 mb-12 text-sm">
          ¿Necesitás ayuda? Estamos acá para vos.
        </p>

        <div className="space-y-4">

          <a
            href="mailto:hola@kool.link"
            className="flex items-start gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
              <Mail size={16} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Email</p>
              <p className="text-sm text-gray-500 mt-0.5">
                hola@kool.link — respondemos en menos de 24 horas.
              </p>
            </div>
          </a>

          <a
            href="https://wa.me/message/kool"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
              <MessageCircle size={16} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Soporte directo para tiendas activas.
              </p>
            </div>
          </a>

        </div>

        <div className="mt-16 pt-8 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Preguntas frecuentes</h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <p className="text-sm font-medium text-gray-900">{faq.q}</p>
                <p className="text-sm text-gray-500 mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 text-xs text-gray-400">
          ¿Tenés un problema técnico urgente?{" "}
          <a href="mailto:hola@kool.link" className="text-gray-600 underline underline-offset-2">
            Escribinos con el asunto "Urgente"
          </a>{" "}
          y lo priorizamos.
        </p>
      </div>
    </div>
  )
}

const faqs = [
  {
    q: "¿Cómo conecto mi tienda Tiendanube?",
    a: "Desde el dashboard, andá a Configuración → Integraciones y hacé clic en Conectar. Vas a ser redirigido al flujo OAuth de Tiendanube.",
  },
  {
    q: "¿Cómo se atribuyen las ventas a un creator?",
    a: "Kool usa cookies de primera parte para rastrear el ?ref= del link del creator. Cuando el visitante completa una compra, la orden se asocia automáticamente al creator.",
  },
  {
    q: "¿Qué pasa si el script de tracking no funciona?",
    a: "Verificá en Configuración → Integraciones que la conexión con Tiendanube esté activa. Si el problema persiste, escribinos a hola@kool.link con el dominio de tu tienda.",
  },
  {
    q: "¿Puedo usar Kool con múltiples tiendas?",
    a: "Actualmente cada workspace soporta una conexión de Tiendanube. Soporte multi-tienda está en el roadmap.",
  },
  {
    q: "¿Cómo elimino mi cuenta?",
    a: "Escribinos a hola@kool.link desde el email de tu cuenta y procesamos la eliminación en menos de 48 horas.",
  },
]
