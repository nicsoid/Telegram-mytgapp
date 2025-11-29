#!/bin/bash

# Cron script to call the Telegram post scheduling endpoint
# This script should be called every minute by cron

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables from .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Get the app URL and cron secret from environment
APP_URL="${NEXT_PUBLIC_APP_URL:-${NEXTAUTH_URL:-https://mytgapp.com}}"
CRON_SECRET="${CRON_SECRET}"

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: CRON_SECRET is not set in environment variables" >&2
  exit 1
fi

# Call the cron endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/telegram/cron")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Log the response
if [ "$HTTP_CODE" -eq 200 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') SUCCESS: $BODY"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') ERROR: HTTP $HTTP_CODE - $BODY" >&2
  exit 1
fi

