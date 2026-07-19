import { Resend } from "resend"
import { env } from "@/lib/env"
import { logger } from "@/lib/logger"

// Lazy: no instanciar el cliente (ni requerir la API key) al importar el módulo,
// así una key ausente no crashea rutas no relacionadas en build/arranque.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY)
  return _resend
}
const FROM = env.EMAIL_FROM

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
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    })
    if (error) throw error
    return { ok: true, id: data?.id }
  } catch (err) {
    logger.error("[Email]", "Send error", { err })
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
    .logo span { color: #FB7185; }
    .body { padding: 32px; color: #374151; font-size: 15px; line-height: 1.6; }
    .body h1 { color: #111827; font-size: 22px; font-weight: 600; margin: 0 0 16px; }
    .btn { display: inline-block; background: #FB7185; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 16px 0; }
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
    ${
      discountCode
        ? `
    <p>Tu código de descuento exclusivo para compartir con tu comunidad:</p>
    <div style="text-align:center; margin: 20px 0;">
      <span class="pill">${discountCode}</span>
    </div>
    <p style="color:#6b7280; font-size:13px; text-align:center;">Tus seguidores obtienen un descuento, vos ganás <strong>${commissionPct}%</strong> de comisión por cada venta.</p>
    `
        : `<p>Vas a ganar <strong>${commissionPct}%</strong> de comisión por cada venta que generes.</p>`
    }
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
    ${
      startDate && endDate
        ? `
    <p style="background:#f3f4f6; padding: 12px 16px; border-radius:8px; font-size:13px;">
      📅 <strong>Fechas:</strong> ${startDate} — ${endDate}
    </p>`
        : ""
    }
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

// ─── Invitación a campaña (creator existente) ─

export async function sendCampaignInviteExisting({
  to,
  creatorName,
  brandName,
  campaignName,
  discountCode,
  commissionPct,
  dashboardUrl,
}: {
  to: string
  creatorName: string
  brandName: string
  campaignName: string
  discountCode?: string
  commissionPct?: number
  dashboardUrl: string
}) {
  const html = baseTemplate(
    `
    <h1>Te invitaron a una nueva campaña 🚀</h1>
    <p>Hola ${creatorName},</p>
    <p><strong>${brandName}</strong> te invitó a participar en su campaña <strong>${campaignName}</strong>.</p>
    ${
      discountCode
        ? `
    <p>Tu código de descuento exclusivo para esta campaña:</p>
    <div style="text-align:center; margin: 20px 0;">
      <span class="pill">${discountCode}</span>
    </div>`
        : ""
    }
    ${commissionPct ? `<p style="color:#6b7280; font-size:13px; text-align:center;">Ganás <strong>${commissionPct}%</strong> de comisión por cada venta que generes.</p>` : ""}
    <hr class="divider">
    <p>Aceptá o decliná la invitación desde tu panel:</p>
    <p style="text-align:center;">
      <a href="${dashboardUrl}" class="btn">Ver invitación →</a>
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `${brandName} te invitó a su campaña "${campaignName}"`,
    html,
  })
}

// ─── Invitación a campaña (creator nuevo) ─────

export async function sendCampaignInviteNew({
  to,
  creatorName,
  brandName,
  campaignName,
  discountCode,
  commissionPct,
  registerUrl,
}: {
  to: string
  creatorName: string
  brandName: string
  campaignName: string
  discountCode?: string
  commissionPct?: number
  registerUrl: string
}) {
  const html = baseTemplate(
    `
    <h1>¡${brandName} quiere trabajar con vos! 🎉</h1>
    <p>Hola ${creatorName},</p>
    <p><strong>${brandName}</strong> te invitó a ser parte de su programa de creators en Kool y participar en la campaña <strong>${campaignName}</strong>.</p>
    ${
      discountCode
        ? `
    <p>Tu código de descuento exclusivo para compartir con tu comunidad:</p>
    <div style="text-align:center; margin: 20px 0;">
      <span class="pill">${discountCode}</span>
    </div>`
        : ""
    }
    ${commissionPct ? `<p style="color:#6b7280; font-size:13px; text-align:center;">Tus seguidores obtienen un descuento, vos ganás <strong>${commissionPct}%</strong> de comisión por cada venta.</p>` : ""}
    <hr class="divider">
    <p>Completá tu perfil para activar tu cuenta y empezar a ganar:</p>
    <p style="text-align:center;">
      <a href="${registerUrl}" class="btn">Activar mi cuenta →</a>
    </p>
    <p style="color:#9ca3af; font-size:12px; text-align:center;">Este link es personal. Una vez que completes tu perfil, podrás aceptar o declinar la invitación.</p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `${brandName} te invitó a su programa de creators en Kool`,
    html,
  })
}

// ─── Bienvenida (signup / onboarding completado) ─

export async function sendWelcomeCreator({
  to,
  creatorName,
  brandName,
  discountCode,
  commissionPct,
  dashboardUrl,
}: {
  to: string
  creatorName: string
  brandName: string
  discountCode?: string
  commissionPct?: number
  dashboardUrl: string
}) {
  const html = baseTemplate(
    `
    <h1>¡Bienvenido/a a Kool, ${creatorName}! 👋</h1>
    <p>Tu cuenta ya está activa. Desde acá vas a poder gestionar tus links, ver tus métricas y seguir tus comisiones con <strong>${brandName}</strong>.</p>
    ${
      discountCode
        ? `
    <p>Tu código de descuento para compartir con tu comunidad:</p>
    <div style="text-align:center; margin: 20px 0;">
      <span class="pill">${discountCode}</span>
    </div>`
        : ""
    }
    ${commissionPct ? `<p style="color:#6b7280; font-size:13px; text-align:center;">Ganás <strong>${commissionPct}%</strong> de comisión por cada venta que generes.</p>` : ""}
    <hr class="divider">
    <p>Entrá a tu panel para empezar:</p>
    <p style="text-align:center;">
      <a href="${dashboardUrl}" class="btn">Ir a mi panel →</a>
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `¡Bienvenido/a a Kool! Tu cuenta está activa`,
    html,
  })
}

// ─── Venta generada (conversión registrada) ──────

export async function sendSaleGenerated({
  to,
  creatorName,
  brandName,
  orderAmount,
  commissionAmount,
  currency,
  dashboardUrl,
}: {
  to: string
  creatorName: string
  brandName: string
  orderAmount: number
  commissionAmount: number
  currency: string
  dashboardUrl: string
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(n)

  const html = baseTemplate(
    `
    <h1>¡Generaste una venta! 🎉</h1>
    <p>Hola ${creatorName},</p>
    <p>Alguien compró en <strong>${brandName}</strong> usando tu link o código. ¡Felicitaciones!</p>
    <div style="text-align:center; margin: 24px 0;">
      <div style="font-size: 36px; font-weight: 700; color: #FB7185;">${fmt(commissionAmount)}</div>
      <div style="color:#6b7280; font-size:13px; margin-top:4px;">comisión generada · pendiente de aprobación</div>
    </div>
    <p style="background:#f9fafb; padding: 12px 16px; border-radius:8px; font-size:13px; color:#6b7280; text-align:center;">
      Venta de ${fmt(orderAmount)} · ${currency}
    </p>
    <hr class="divider">
    <p style="text-align:center;">
      <a href="${dashboardUrl}" class="btn">Ver mis comisiones →</a>
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `¡Generaste una venta en ${brandName}! 🎉`,
    html,
  })
}

// ─── Bounty alcanzado (objetivo logrado) ──────────

export async function sendBountyAchieved({
  to,
  creatorName,
  brandName,
  bountyName,
  reward,
  dashboardUrl,
}: {
  to: string
  creatorName: string
  brandName: string
  bountyName: string
  reward: string
  dashboardUrl: string
}) {
  const html = baseTemplate(
    `
    <h1>¡Desbloqueaste una recompensa! 🏆</h1>
    <p>Hola ${creatorName},</p>
    <p>¡Felicitaciones! Alcanzaste el objetivo <strong>${bountyName}</strong> de <strong>${brandName}</strong>.</p>
    <div style="text-align:center; margin: 24px 0;">
      <div style="font-size: 22px; font-weight: 700; color: #FB7185;">${reward}</div>
      <div style="color:#6b7280; font-size:13px; margin-top:4px;">tu recompensa · la marca coordinará la entrega</div>
    </div>
    <hr class="divider">
    <p style="text-align:center;">
      <a href="${dashboardUrl}" class="btn">Ver mis objetivos →</a>
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `🏆 ¡Desbloqueaste una recompensa en ${brandName}!`,
    html,
  })
}

// ─── Gifting recibido (la marca te envió productos) ─

export async function sendGiftingReceived({
  to,
  creatorName,
  brandName,
  products,
  hasAddress,
  notes,
  dashboardUrl,
}: {
  to: string
  creatorName: string
  brandName: string
  products: { name: string; quantity: number }[]
  hasAddress: boolean
  notes?: string
  dashboardUrl: string
}) {
  const productsList = products
    .map(
      (p) =>
        `<li style="margin: 4px 0;">${p.name}${p.quantity > 1 ? ` <span style="color:#9ca3af;">×${p.quantity}</span>` : ""}</li>`
    )
    .join("")

  const html = baseTemplate(
    `
    <h1>¡${brandName} te envió un gifting! 🎁</h1>
    <p>Hola ${creatorName},</p>
    <p><strong>${brandName}</strong> te seleccionó para recibir productos sin cargo.</p>
    <p style="margin-bottom: 4px;"><strong>Productos:</strong></p>
    <ul style="padding-left: 20px; margin: 4px 0 16px; color:#374151;">
      ${productsList}
    </ul>
    ${
      notes
        ? `<p style="background:#f3f4f6; padding: 12px 16px; border-radius:8px; font-size:13px;">📝 ${notes}</p>`
        : ""
    }
    <p style="color:#6b7280; font-size:13px;">
      ${
        hasAddress
          ? "Tu envío ya está siendo procesado y llegará a la dirección que cargaste en tu perfil."
          : "Todavía no tenemos tu dirección de envío. Completá tus datos en tu panel para que la marca pueda enviártelo."
      }
    </p>
    <hr class="divider">
    <p style="text-align:center;">
      <a href="${dashboardUrl}" class="btn">${hasAddress ? "Ver mi gifting →" : "Completar mi dirección →"}</a>
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `🎁 ${brandName} te envió un gifting`,
    html,
  })
}

// ─── Invitación a colaborar en campaña ────────

export async function sendCollaboratorInvite({
  to,
  inviterName,
  brandName,
  campaignName,
  role,
  acceptUrl,
}: {
  to: string
  inviterName: string
  brandName: string
  campaignName: string
  role: "EDITOR" | "VIEWER"
  acceptUrl: string
}) {
  const roleLabel = role === "EDITOR" ? "Editor" : "Viewer"
  const roleDesc =
    role === "EDITOR"
      ? "Podés ver y editar los contenidos de la campaña."
      : "Podés ver los contenidos de la campaña (solo lectura)."

  const html = baseTemplate(
    `
    <h1>Te invitaron a colaborar</h1>
    <p><strong>${inviterName}</strong> de <strong>${brandName}</strong> te invitó a colaborar en la campaña:</p>
    <p style="font-size:18px; font-weight:600; color:#111827; margin: 8px 0 16px;">${campaignName}</p>
    <p>Tu rol: <span style="background:#f3f4f6; padding: 3px 10px; border-radius:6px; font-size:13px; font-weight:600;">${roleLabel}</span></p>
    <p style="color:#6b7280; font-size:13px;">${roleDesc}</p>
    <hr class="divider">
    <p style="text-align:center;">
      <a href="${acceptUrl}" class="btn">Aceptar invitación →</a>
    </p>
    <p style="color:#9ca3af; font-size:12px; text-align:center; margin-top:8px;">
      Si no esperabas esta invitación, podés ignorar este email.
    </p>
    `,
    brandName
  )

  return sendEmail({
    to,
    subject: `${inviterName} te invitó a colaborar en "${campaignName}"`,
    html,
  })
}

