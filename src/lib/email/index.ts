import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || "Kool <hola@kool.link>"

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

// ─────────────────────────────────────────────
// SEND BASE
// ─────────────────────────────────────────────

async function sendEmail(opts: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    })
    if (error) throw error
    return { ok: true, id: data?.id }
  } catch (err) {
    console.error("[Email] Send error:", err)
    return { ok: false, error: err }
  }
}

// ─────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────

function baseTemplate(content: string, brandName?: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 580px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #0F1117; padding: 24px 32px; }
    .logo { color: white; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .logo span { color: #00C46A; }
    .body { padding: 32px; color: #374151; font-size: 15px; line-height: 1.6; }
    .body h1 { color: #111827; font-size: 22px; font-weight: 600; margin: 0 0 16px; }
    .btn { display: inline-block; background: #00C46A; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .footer { padding: 16px 32px; background: #f9fafb; color: #9ca3af; font-size: 12px; text-align: center; }
    .pill { display: inline-block; background: #f3f4f6; border-radius: 6px; padding: 6px 12px; font-size: 13px; font-weight: 600; color: #111827; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">kool<span>.</span></div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      ${brandName ? `Este email fue enviado por ${brandName} a través de Kool.` : "Kool — Plataforma de creator commerce para LATAM"}
    </div>
  </div>
</body>
</html>
  `.trim()
}

// ─── Invitación a creator ─────────────────────

export async function sendCreatorInvite({
  to,
  creatorName,
  brandName,
  discountCode,
  commissionPct,
  onboardingUrl,
}: {
  to: string
  creatorName: string
  brandName: string
  discountCode?: string
  commissionPct: number
  onboardingUrl: string
}) {
  const html = baseTemplate(
    `
    <h1>¡Te invitaron al programa de ${brandName}! 🎉</h1>
    <p>Hola ${creatorName},</p>
    <p><strong>${brandName}</strong> te invitó a unirte a su programa de creators en Kool.</p>
    ${discountCode ? `
    <p>Tu código de descuento exclusivo para compartir con tu comunidad:</p>
    <div style="text-align:center; margin: 20px 0;">
      <span class="pill">${discountCode}</span>
    </div>
    <p style="color:#6b7280; font-size:13px; text-align:center;">Tus seguidores obtienen un descuento, vos ganás <strong>${commissionPct}%</strong> de comisión por cada venta.</p>
    ` : `<p>Vas a ganar <strong>${commissionPct}%</strong> de comisión por cada venta que generes.</p>`}
    <hr class="divider">
    <p>Completá tu perfil para empezar:</p>
    <a href="${onboardingUrl}" class="btn">Activar mi cuenta →</a>
    <p style="color:#9ca3af; font-size:12px;">Este link es personal y expira en 7 días.</p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `${brandName} te invitó a su programa de creators`,
    html,
  })
}

// ─── Briefing de campaña ──────────────────────

export async function sendBriefing({
  to,
  creatorName,
  brandName,
  campaignName,
  briefingHtml,
  startDate,
  endDate,
  replyTo,
}: {
  to: string | string[]
  creatorName?: string
  brandName: string
  campaignName: string
  briefingHtml: string
  startDate?: string
  endDate?: string
  replyTo?: string
}) {
  const html = baseTemplate(
    `
    <h1>${campaignName}</h1>
    ${creatorName ? `<p>Hola ${creatorName},</p>` : ""}
    <p>A continuación encontrás el brief de campaña de <strong>${brandName}</strong>:</p>
    ${startDate && endDate ? `
    <p style="background:#f3f4f6; padding: 12px 16px; border-radius:8px; font-size:13px;">
      📅 <strong>Fechas:</strong> ${startDate} — ${endDate}
    </p>` : ""}
    <hr class="divider">
    ${briefingHtml}
    <hr class="divider">
    <p style="color:#6b7280; font-size:13px;">
      Si tenés preguntas, respondé este email directamente.
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `Brief de campaña: ${campaignName} — ${brandName}`,
    html,
    replyTo,
  })
}

// ─── Notificación de gifting ──────────────────

export async function sendGiftingNotification({
  to,
  creatorName,
  brandName,
  products,
  trackingNumber,
  notes,
}: {
  to: string
  creatorName: string
  brandName: string
  products: { name: string; quantity: number }[]
  trackingNumber?: string
  notes?: string
}) {
  const productsList = products
    .map((p) => `<li>${p.quantity}x ${p.name}</li>`)
    .join("")

  const html = baseTemplate(
    `
    <h1>¡${brandName} te envió un regalo! 📦</h1>
    <p>Hola ${creatorName},</p>
    <p><strong>${brandName}</strong> te está enviando los siguientes productos:</p>
    <ul style="background:#f9fafb; padding: 16px 16px 16px 32px; border-radius:8px;">
      ${productsList}
    </ul>
    ${notes ? `<p style="background:#f0fdf4; padding:12px 16px; border-radius:8px; font-size:13px; color:#166534;">💬 ${notes}</p>` : ""}
    ${trackingNumber ? `
    <p>Número de seguimiento:</p>
    <div style="text-align:center; margin: 12px 0;">
      <span class="pill">${trackingNumber}</span>
    </div>` : "<p style='color:#6b7280; font-size:13px;'>Te avisaremos cuando tengamos el número de seguimiento.</p>"}
    <hr class="divider">
    <p style="color:#6b7280; font-size:13px;">Cuando recibas el paquete, confirmá la recepción desde tu panel de Kool.</p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `${brandName} te envió un regalo`,
    html,
  })
}

// ─── Aplicación recibida ──────────────────────

export async function sendApplicationConfirmation({
  to,
  applicantName,
  campaignName,
  brandName,
}: {
  to: string
  applicantName: string
  campaignName: string
  brandName: string
}) {
  const html = baseTemplate(
    `
    <h1>Recibimos tu aplicación ✅</h1>
    <p>Hola ${applicantName},</p>
    <p>Tu aplicación para <strong>${campaignName}</strong> fue recibida correctamente.</p>
    <p><strong>${brandName}</strong> va a revisar tu perfil y te contactaremos con el resultado en los próximos días.</p>
    <hr class="divider">
    <p style="color:#6b7280; font-size:13px;">Gracias por tu interés. Estén atentos a tu casilla de correo.</p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `Recibimos tu aplicación para ${campaignName}`,
    html,
  })
}

// ─── Aplicación aceptada (sin cuenta) ────────

export async function sendApplicationAccepted({
  to,
  applicantName,
  campaignName,
  brandName,
  registerUrl,
}: {
  to: string
  applicantName: string
  campaignName: string
  brandName: string
  registerUrl: string
}) {
  const html = baseTemplate(
    `
    <h1>¡Fuiste aceptado/a en ${campaignName}! 🎉</h1>
    <p>Hola ${applicantName},</p>
    <p>¡Buenas noticias! <strong>${brandName}</strong> revisó tu aplicación y queremos que seas parte del programa.</p>
    <p>Para acceder a tu panel, códigos de descuento y comisiones, creá tu cuenta en Kool:</p>
    <p style="text-align:center;">
      <a href="${registerUrl}" class="btn">Crear mi cuenta →</a>
    </p>
    <hr class="divider">
    <p style="color:#6b7280; font-size:13px;">Si el botón no funciona, copiá y pegá este link: ${registerUrl}</p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `¡Fuiste aceptado/a en ${campaignName}! Creá tu cuenta`,
    html,
  })
}

// ─── Aplicación aceptada (con cuenta) ────────

export async function sendApplicationAcceptedExisting({
  to,
  applicantName,
  campaignName,
  brandName,
  dashboardUrl,
}: {
  to: string
  applicantName: string
  campaignName: string
  brandName: string
  dashboardUrl: string
}) {
  const html = baseTemplate(
    `
    <h1>¡Fuiste aceptado/a en ${campaignName}! 🎉</h1>
    <p>Hola ${applicantName},</p>
    <p>¡Buenas noticias! <strong>${brandName}</strong> te aceptó en el programa <strong>${campaignName}</strong>.</p>
    <p>Ya podés ver tu código de descuento, links y comisiones desde tu panel:</p>
    <p style="text-align:center;">
      <a href="${dashboardUrl}" class="btn">Ver mi programa →</a>
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `¡Fuiste aceptado/a en ${campaignName}!`,
    html,
  })
}

// ─── Aplicación rechazada ─────────────────────

export async function sendApplicationRejected({
  to,
  applicantName,
  campaignName,
  brandName,
}: {
  to: string
  applicantName: string
  campaignName: string
  brandName: string
}) {
  const html = baseTemplate(
    `
    <h1>Actualización sobre tu aplicación</h1>
    <p>Hola ${applicantName},</p>
    <p>Gracias por aplicar a <strong>${campaignName}</strong> de <strong>${brandName}</strong>.</p>
    <p>Luego de revisar las aplicaciones, en esta oportunidad no pudimos seleccionarte. Recibimos muchas aplicaciones y la decisión fue difícil.</p>
    <p>Esto no significa que no puedas participar en el futuro. Te invitamos a estar atento/a a nuevas campañas.</p>
    <hr class="divider">
    <p style="color:#6b7280; font-size:13px;">Gracias nuevamente por tu interés en ${brandName}.</p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `Actualización sobre tu aplicación a ${campaignName}`,
    html,
  })
}

// ─── Notificación de comisión ─────────────────

export async function sendCommissionApproved({
  to,
  creatorName,
  amount,
  currency,
  brandName,
  dashboardUrl,
}: {
  to: string
  creatorName: string
  amount: number
  currency: string
  brandName: string
  dashboardUrl: string
}) {
  const formatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount)

  const html = baseTemplate(
    `
    <h1>Tenés una comisión aprobada 💸</h1>
    <p>Hola ${creatorName},</p>
    <p><strong>${brandName}</strong> aprobó una comisión para vos:</p>
    <div style="text-align:center; margin: 24px 0;">
      <div style="font-size: 36px; font-weight: 700; color: #111827;">${formatted}</div>
      <div style="color:#6b7280; font-size:13px; margin-top:4px;">${currency}</div>
    </div>
    <p style="text-align:center;">
      <a href="${dashboardUrl}" class="btn">Ver mis comisiones →</a>
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `Comisión aprobada de ${brandName}: ${formatted}`,
    html,
  })
}
