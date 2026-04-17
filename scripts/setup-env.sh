#!/bin/bash
# === Phase 1 Local Setup Script ===
# Run from project root: bash scripts/setup-env.sh
#
# Creates .env.local with PLACEHOLDERS only. Paste real values from:
#   Supabase: Project Settings → API / Database
#   Anthropic: https://console.anthropic.com/settings/keys
#
# NEVER put real keys in this script or commit .env.local.

set -e

ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
  echo "⚠️  $ENV_FILE already exists. Backing up to .env.local.bak"
  cp "$ENV_FILE" "${ENV_FILE}.bak"
fi

cat > "$ENV_FILE" << 'EOF'
# === The Tower — Environment Variables ===
# Paste secrets here. NEVER commit this file.

# --- Phase 0: Foundation ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=

# Google OAuth (via Supabase Auth dashboard)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# --- Phase 1: Agents ---
ANTHROPIC_API_KEY=
EOF

echo "✅ Created $ENV_FILE (empty lines — you paste values in next)"
echo ""
echo "See .env.example at the top for simple fill-in steps."
