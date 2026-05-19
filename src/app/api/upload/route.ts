import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { put } from "@vercel/blob"

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Solo PDF, imágenes o documentos Word." }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera el límite de 10MB" }, { status: 400 })
    }

    const token = process.env.BRIEF_READ_WRITE_TOKEN
    if (!token) return NextResponse.json({ error: "BRIEF_READ_WRITE_TOKEN no configurado" }, { status: 500 })

    const filename = `briefings/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const blob = await put(filename, file, { access: "private", token })

    return NextResponse.json({ url: blob.url, name: file.name, type: file.type, size: file.size })
  } catch (err) {
    console.error("[upload] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
