import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import crypto from "crypto"
import { execSync } from "child_process"
import { auth } from "@/auth"

export const runtime = "nodejs"

// Get upload directory - use absolute path to avoid ownership issues
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads")
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB for images
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB for videos
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo"] // mp4, mpeg, mov, avi

async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
  // Ensure directory has proper permissions (755 - readable and executable by all)
  try {
    await fs.chmod(UPLOAD_DIR, 0o755)
  } catch (chmodError) {
    // Log but don't fail if chmod fails (e.g., on Windows)
    console.warn("Failed to set upload directory permissions:", chmodError)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureUploadDir()

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Unsupported file type. Only images (JPEG, PNG, WebP) and videos (MP4, MPEG, MOV, AVI) are allowed." },
        { status: 400 }
      )
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSizeMB}MB for ${isImage ? "images" : "videos"}` },
        { status: 400 }
      )
    }

    // Extract file extension from MIME type
    let extension = file.type.split("/")[1]
    // Handle edge cases
    if (extension === "jpeg") {
      extension = "jpg"
    } else if (extension === "quicktime") {
      extension = "mov"
    } else if (extension === "x-msvideo") {
      extension = "avi"
    }
    
    const fileName = `${crypto.randomUUID()}.${extension}`
    const filePath = path.join(UPLOAD_DIR, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Write file
    await fs.writeFile(filePath, fileBuffer)
    
    // Set file permissions: read/write for owner, read for group and others (644)
    // This ensures the file is accessible by the web server
    try {
      await fs.chmod(filePath, 0o644)
    } catch (chmodError) {
      // Log but don't fail if chmod fails (e.g., on Windows)
      console.warn("Failed to set file permissions:", chmodError)
    }
    
    // Try to change ownership to web server user if running on Linux/Unix
    if (process.platform !== "win32") {
      const webServerUser = process.env.WEB_SERVER_USER || "nobody"
      const webServerGroup = process.env.WEB_SERVER_GROUP || "nobody"
      
      try {
        execSync(`chown ${webServerUser}:${webServerGroup} "${filePath}"`, { 
          stdio: "ignore",
          timeout: 5000 
        })
        console.log(`Changed file ownership to ${webServerUser}:${webServerGroup} - ${fileName}`)
      } catch (chownError: any) {
        console.warn(`Could not change file ownership (may need sudo): ${chownError.message}`)
        console.warn(`File created with permissions 644. If web server can't read it, manually run:`)
        console.warn(`  chown ${webServerUser}:${webServerGroup} "${filePath}"`)
      }
    }
    
    // Verify file was written and is readable
    try {
      const stats = await fs.stat(filePath)
      if (stats.size !== fileBuffer.length) {
        throw new Error(`File size mismatch: expected ${fileBuffer.length}, got ${stats.size}`)
      }
      
      // Verify file is readable
      try {
        await fs.readFile(filePath)
      } catch (readError) {
        console.warn(`File may not be readable: ${readError}`)
      }
    } catch (verifyError) {
      console.error("File verification failed:", verifyError)
      throw new Error("Failed to verify uploaded file")
    }

    const url = `/uploads/${fileName}`

    // Final verification
    try {
      const finalStats = await fs.stat(filePath)
      if (finalStats.size !== fileBuffer.length) {
        throw new Error(`Final verification failed: size mismatch`)
      }
      
      await fs.access(filePath, fs.constants.R_OK)
      
      console.log(`File uploaded successfully: ${filePath} -> ${url} (size: ${fileBuffer.length} bytes, mime: ${file.type})`)
    } catch (finalError) {
      console.error(`Final file verification failed:`, finalError)
      console.warn(`File created but may have access issues. Verify manually: ${filePath}`)
    }
    
    return NextResponse.json({ 
      url,
      fileName,
      size: fileBuffer.length,
      mimeType: file.type
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}

