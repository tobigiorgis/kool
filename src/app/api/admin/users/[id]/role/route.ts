import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { handleError } from "@/lib/api/response"
import { z } from "zod"

const ADMIN_EMAIL = "tobigiorgis@icloud.com"

const Schema = z.object({
  role: z.enum(["BRAND", "CREATOR", "ADMIN"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser()
  if (user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { role } = Schema.parse(body)

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (error) {
    return handleError("[Admin] update user role", error)
  }
}
