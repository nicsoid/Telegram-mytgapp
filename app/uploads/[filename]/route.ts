import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Security: prevent directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
    }
    
    const filePath = path.join(UPLOAD_DIR, filename)
    
    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    
    // Read file
    const fileBuffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase()
    const contentTypeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".mp4": "video/mp4",
      ".mpeg": "video/mpeg",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
    }
    
    const contentType = contentTypeMap[ext] || "application/octet-stream"
    
    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}

