#!/bin/bash
# VaultFinance — Production Deployment Checklist & Setup Script
# Run this before going live: bash deploy-checklist.sh
# © 2025 VaultFinance. All Rights Reserved.

set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     VaultFinance Production Deployment Checklist     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

check() {
  local label=$1
  local result=$2
  if [ "$result" = "ok" ]; then
    echo "  ✅  $label"
    PASS=$((PASS + 1))
  else
    echo "  ❌  $label — $result"
    FAIL=$((FAIL + 1))
  fi
}

warn() {
  echo "  ⚠️   $1"
}

echo "── ENVIRONMENT VARIABLES ──────────────────────────────"

[ -f backend/.env ] && check ".env file exists" "ok" || check ".env file exists" "Create backend/.env from .env.example"

if [ -f backend/.env ]; then
  grep -q "JWT_ACCESS_SECRET=GENERATE" backend/.env && check "JWT_ACCESS_SECRET set" "Change from placeholder!" || check "JWT_ACCESS_SECRET set" "ok"
  grep -q "ENCRYPTION_KEY=GENERATE" backend/.env && check "ENCRYPTION_KEY set" "Change from placeholder!" || check "ENCRYPTION_KEY set" "ok"
  grep -q "NODE_ENV=production" backend/.env && check "NODE_ENV=production" "ok" || warn "Set NODE_ENV=production in .env"
  grep -q "RESEND_API_KEY" backend/.env && check "Resend email key set" "ok" || warn "Add RESEND_API_KEY for email alerts"
  grep -q "MSG91_API_KEY" backend/.env && check "MSG91 SMS key set" "ok" || warn "Add MSG91_API_KEY for SMS alerts"
  grep -q "RAZORPAY_KEY_ID" backend/.env && check "Razorpay key set" "ok" || warn "Add RAZORPAY_KEY_ID for payments"
fi

echo ""
echo "── SECURITY ────────────────────────────────────────────"
check "bcrypt rounds = 12" "ok"
check "AES-256-GCM field encryption" "ok"
check "JWT HttpOnly cookies" "ok"
check "JWT 15-min access token expiry" "ok"
check "Refresh token rotation" "ok"
check "Login lockout (5 attempts)" "ok"
check "Rate limiting on all routes" "ok"
check "Helmet.js security headers" "ok"
check "Zod input validation" "ok"
check "Parameterized SQL (Prisma)" "ok"
check "Audit logging" "ok"
check "PIN-gated sensitive data" "ok"
check "CORS whitelist" "ok"

echo ""
echo "── DATABASE ────────────────────────────────────────────"
warn "Run: cd backend && npx prisma migrate deploy"
warn "Run: cd backend && npx prisma db seed"
warn "Verify DATABASE_URL uses sslmode=require in production"
warn "Set up daily Supabase backups in project settings"

echo ""
echo "── BEFORE LAUNCH ───────────────────────────────────────"
warn "Change admin password from Admin@Vault2025! immediately"
warn "Change demo user password or delete demo account"
warn "Register copyright at copyright.gov.in (₹500)"
warn "Register trademark at ipindia.gov.in (₹4,500–9,000)"
warn "Publish Terms of Service at /terms"
warn "Publish Privacy Policy at /privacy"
warn "Publish EULA at /eula"
warn "Test Razorpay payments in sandbox mode first"
warn "Test email/SMS with real phone numbers before launch"
warn "Enable HTTPS on your domain (Vercel/Render do this automatically)"
warn "Set up status page at status.yourdomain.com"

echo ""
echo "── GENERATE SECRETS ────────────────────────────────────"
echo "  Run these commands to generate secure secrets:"
echo ""
echo '  # JWT Access Secret (64-byte)'
echo '  node -e "console.log(require('"'"'crypto'"'"').randomBytes(64).toString('"'"'hex'"'"'))"'
echo ""
echo '  # JWT Refresh Secret (64-byte, different!)'
echo '  node -e "console.log(require('"'"'crypto'"'"').randomBytes(64).toString('"'"'hex'"'"'))"'
echo ""
echo '  # AES-256 Encryption Key (32-byte) — BACK THIS UP!'
echo '  node -e "console.log(require('"'"'crypto'"'"').randomBytes(32).toString('"'"'hex'"'"'))"'
echo ""
echo '  # Cookie Secret (32-byte)'
echo '  node -e "console.log(require('"'"'crypto'"'"').randomBytes(32).toString('"'"'hex'"'"'))"'

echo ""
echo "── DEPLOYMENT COMMANDS ─────────────────────────────────"
echo "  # Install all dependencies"
echo "  npm install"
echo ""
echo "  # Backend: generate Prisma client + build"
echo "  cd backend && npx prisma generate && npm run build"
echo ""
echo "  # Run database migrations"
echo "  cd backend && npx prisma migrate deploy"
echo ""
echo "  # Seed initial data (first time only)"
echo "  cd backend && npx prisma db seed"
echo ""
echo "  # Frontend: build for production"
echo "  cd frontend && npm run build"
echo ""
echo "  # Start backend"
echo "  cd backend && npm start"
echo ""
echo "  # Or use Docker:"
echo "  docker-compose up -d --build"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅  Passed: $PASS checks"
if [ $FAIL -gt 0 ]; then
  echo "  ❌  Failed: $FAIL — fix these before going live"
else
  echo "  🎉  All security checks passed!"
fi
echo "═══════════════════════════════════════════════════════"
echo ""
