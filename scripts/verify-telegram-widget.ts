#!/usr/bin/env tsx
/**
 * Quick utility to verify Telegram Login Widget payloads against TELEGRAM_BOT_TOKEN.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=xxxx tsx scripts/verify-telegram-widget.ts \
 *     --id=123 --first_name=John --last_name=Doe --username=johnd \
 *     --auth_date=1700000000 --hash=abcdef --photo_url=""
 *
 * You can also supply a JSON file:
 *   TELEGRAM_BOT_TOKEN=xxxx tsx scripts/verify-telegram-widget.ts --from-file=widget.json
 */

import crypto from "crypto"
import fs from "fs"
import path from "path"

type WidgetArgs = {
  id: string
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: string
  hash: string
}

function parseArgs(): { data: WidgetArgs } {
  const args = process.argv.slice(2)
  const data: any = {}
  let fromFile = ""

  for (const arg of args) {
    if (arg.startsWith("--from-file=")) {
      fromFile = arg.replace("--from-file=", "")
    } else if (arg.startsWith("--")) {
      const [key, value] = arg.replace("--", "").split("=")
      data[key] = value ?? ""
    }
  }

  if (fromFile) {
    const filePath = path.resolve(process.cwd(), fromFile)
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return { data: fileData }
  }

  return { data }
}

function verifyWidgetData(data: WidgetArgs, botToken: string) {
  const required = ["id", "first_name", "auth_date", "hash"]
  for (const key of required) {
    if (!data[key as keyof WidgetArgs]) {
      throw new Error(`Missing required field: ${key}`)
    }
  }

  const normalizedToken = botToken.trim()
  if (!normalizedToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing or empty")
  }

  const dataCheckString = Object.keys(data)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${(data as any)[key] ?? ""}`)
    .join("\n")

  const secretKey = crypto.createHash("sha256").update(normalizedToken).digest()
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")
  const matches = calculatedHash === data.hash

  return { dataCheckString, calculatedHash, matches }
}

async function main() {
  try {
    console.log("=== Environment ===")
    console.log("TELEGRAM_BOT_TOKEN:", process.env.TELEGRAM_BOT_TOKEN)
    console.log("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME:", process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME)
    console.log("TELEGRAM_BOT_USERNAME:", process.env.TELEGRAM_BOT_USERNAME)
    console.log("===================")

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not set (export it before running)")
    }

    const { data } = parseArgs()
    const result = verifyWidgetData(data as WidgetArgs, token)

    console.log("=== Telegram Widget Verification ===")
    console.log("Input fields:", Object.keys(data))
    console.log("Data check string:\n", result.dataCheckString)
    console.log("Calculated hash:", result.calculatedHash)
    console.log("Provided hash:  ", data.hash)
    console.log("Match:", result.matches ? "✅ YES" : "❌ NO")

    if (!result.matches) {
      console.log("\nIf hashes do not match:")
      console.log("- Ensure TELEGRAM_BOT_TOKEN matches the bot used in the widget")
      console.log("- Double-check there are no hidden spaces in the token")
      console.log("- Ensure widget payload contains all fields")
    }
  } catch (error) {
    console.error("Error:", (error as Error).message)
    process.exit(1)
  }
}

main()

