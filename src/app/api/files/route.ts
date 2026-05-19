import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { head } from "@vercel/blob"

// GET /api/files?url=<blob-url>
// Returns a short-lived signed download URL for a private blob
export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = request.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 })

  const token = process.env.BRIEF_READ_WRITE_TOKEN
  if (!token) return NextResponse.json({ error: "Storage not configured" }, { status: 500 })

  try {
    const info = await head(url, { token })
    // Redirect to the blob URL with a download token (Vercel Blob private URLs already include auth via token)
    // For private blobs, we stream the content through our server
    const blobRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!blobRes.ok) return NextResponse.json({ error: "File not found" }, { status: 404 })

    const contentType = info.contentType ?? "application/octet-stream"
    const body = await blobRes.arrayBuffer()

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${info.pathname.split("/").pop()}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[files] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
