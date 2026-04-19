# VaultFinance Pro — Production-Ready Loan Management SaaS

> **© 2025 VaultFinance. All Rights Reserved.**
> Proprietary software. Unauthorised copying, cloning, or distribution is prohibited
> under the Copyright Act, 1957 (India) and the Berne Convention.

---

## Architecture Overview

```
vaultfinance/
├── backend/          Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── controllers/   Business logic
│   │   ├── middleware/     Auth, error handling, logging
│   │   ├── routes/        API route definitions
│   │   ├── services/      Audit, notifications
│   │   └── utils/         JWT, encryption, logger, Prisma
│   └── prisma/
│       ├── schema.prisma  Full database schema
│       └── seed.ts        Initial data (admin + loan types)
├── frontend/         Next.js 14 + TypeScript + Tailwind CSS
│   └── src/
│       ├── app/           All pages (App Router)
│       ├── components/    Sidebar, Topbar
│       ├── lib/           Axios API client
│       └── store/         Zustand auth store
└── docker-compose.yml    Local dev with Postgres + Redis
```

---

## Security Features

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt (12 rounds) |
| Field encryption | AES-256-GCM — Aadhaar & PAN |
| Authentication | JWT Access (15min) + Refresh (7d) tokens |
| Token storage | HttpOnly cookies — never localStorage |
| Token rotation | Refresh token rotated on every use |
| Login lockout | 5 failed attempts → 15 min lock |
| Rate limiting | Auth: 5/15min, Global: 500/15min |
| Security headers | Helmet.js (CSP, HSTS, X-Frame-Options, XSS) |
| Input validation | Zod schemas on all endpoints |
| SQL injection | Parameterized queries via Prisma ORM |
| Audit logging | Every sensitive action timestamped |
| PIN gate | 4-digit PIN required to view Aadhaar/PAN |
| Session timeout | 15 min inactivity (frontend) |
| CORS | Whitelist only |
| Data masking | Aadhaar/PAN masked by default |
| Role-based access | ADMIN / USER with ownership checks |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Docker)

### Option A — Docker (Recommended, fastest)

```bash
# 1. Clone and enter the project
git clone <your-repo-url> vaultfinance
cd vaultfinance

# 2. Start all services (Postgres + Redis + Backend + Frontend)
docker-compose up -d

# 3. Run database migrations and seed
docker exec vaultfinance-api npx prisma migrate dev
docker exec vaultfinance-api npx prisma db seed

# 4. Open the app
open http://localhost:3000
```

### Option B — Manual Setup

**Step 1 — Backend**

```bash
cd backend

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (admin user + loan types)
npx prisma db seed

# Start development server
npm run dev
# API runs on http://localhost:5000
```

**Step 2 — Frontend**

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL if your backend runs on a different port

# Start development server
npm run dev
# App runs on http://localhost:3000
```

---

## Environment Variables

### Backend (.env)

Generate the required secrets with these commands:

```bash
# JWT Access Secret (64-byte hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT Refresh Secret (different from access)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# AES-256 Encryption Key (32-byte hex — used for Aadhaar/PAN encryption)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Cookie Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://USER:PASS@HOST:5432/vaultfinance?sslmode=require
JWT_ACCESS_SECRET=<64-byte hex>
JWT_REFRESH_SECRET=<64-byte hex — DIFFERENT from access>
ENCRYPTION_KEY=<32-byte hex>
COOKIE_SECRET=<32-byte hex>
CLIENT_URL=https://yourdomain.com

# Email (Resend — https://resend.com)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@yourdomain.com

# SMS (MSG91 — https://msg91.com)
MSG91_API_KEY=your_key
MSG91_SENDER_ID=VAULTF

# Razorpay (https://razorpay.com)
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=your_secret
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

---

## Default Login Credentials

After running `npx prisma db seed`:

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@vaultfinance.com | Admin@Vault2025! |
| **Demo User** | demo@sriramnance.com | Demo@123! |

⚠️ **Change these passwords immediately in production.**

---

## Production Deployment

### Recommended Stack

| Service | Provider | Cost |
|---|---|---|
| Frontend | Vercel (free tier) | Free |
| Backend API | Render.com | ~₹600/mo |
| Database | Supabase (PostgreSQL) | Free up to 500MB |
| Domain | GoDaddy (buy domain only) | ~₹800/yr |
| Email | Resend | Free up to 3000/mo |
| SMS | MSG91 (India) | ~₹0.20/SMS |

### Deploy Backend to Render.com

1. Push your code to a **private** GitHub repository
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo, select the `backend` folder
4. Set Build Command: `npm install && npx prisma generate && npm run build`
5. Set Start Command: `npm start`
6. Add all environment variables from `.env`
7. Deploy

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel --prod
```

Set `NEXT_PUBLIC_API_URL` to your Render backend URL.

### Connect GoDaddy Domain

1. Buy your domain from GoDaddy (e.g. `vaultfinance.in`)
2. In GoDaddy DNS, add:
   - **CNAME**: `www` → `cname.vercel-dns.com`
   - **A Record**: `@` → `76.76.21.21` (Vercel IP)
   - **CNAME**: `api` → your-app.onrender.com
3. In Vercel/Render, add your custom domain
4. SSL is automatic (Let's Encrypt)

> **Do NOT use GoDaddy hosting for Node.js.** Use it only as a domain registrar.

### Database Setup on Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Copy the connection string: `Project → Settings → Database → Connection String`
3. Set as `DATABASE_URL` in your backend environment
4. Run: `npx prisma migrate deploy`
5. Run: `npx prisma db seed`

---

## API Reference

### Auth
```
POST /api/auth/register      Register new user
POST /api/auth/login         Login
POST /api/auth/logout        Logout (revokes token)
POST /api/auth/refresh       Refresh access token
GET  /api/auth/me            Get current user
PUT  /api/auth/change-password  Change password
```

### Customers
```
GET    /api/customers           List customers (paginated)
POST   /api/customers           Create customer (encrypts Aadhaar/PAN)
GET    /api/customers/:id       Get customer (masked sensitive data)
PUT    /api/customers/:id       Update customer
DELETE /api/customers/:id       Soft delete
POST   /api/customers/:id/reveal  Reveal Aadhaar/PAN (requires PIN)
```

### Loans
```
GET  /api/loans                           List loans
POST /api/loans                           Create loan (generates full repayment schedule)
GET  /api/loans/:id                       Get loan with schedule
GET  /api/loans/:id/schedule              Full repayment schedule
POST /api/loans/:loanId/repayments/:repaymentId/pay  Record payment
```

### Applications
```
GET  /api/applications          List pending applications
POST /api/applications          Submit new application
PUT  /api/applications/:id/approve  Approve → creates loan
PUT  /api/applications/:id/reject   Reject with reason
```

### Repayments
```
GET  /api/repayments/overdue     All overdue EMIs (auto-marks status)
GET  /api/repayments/due-today   EMIs due today
```

### Admin
```
GET  /api/admin/stats              Platform statistics
GET  /api/admin/users              All finance users
GET  /api/admin/users/:id          User detail with customers/loans
PUT  /api/admin/users/:id/plan     Update subscription plan
PUT  /api/admin/users/:id/toggle   Enable/disable account
GET  /api/admin/loan-types         All loan types
POST /api/admin/loan-types         Create new loan type
PUT  /api/admin/loan-types/:id     Update loan type
PUT  /api/admin/loan-types/:id/toggle  Enable/disable
GET  /api/admin/audit-logs         Platform-wide audit logs
```

---

## Adding New Loan Types (Admin Panel)

1. Log in as admin → **Loan Products** in sidebar
2. Click **+ Add Loan Type**
3. Fill in: name, slug, icon (emoji), color, rate range, asset fields
4. The new type immediately appears for all finance users

**No code changes needed** — the loan type engine is fully dynamic.

---

## Important Security Notes

1. **Never commit `.env` files** — add to `.gitignore`
2. **Keep your repo private** — source code contains business logic
3. **Rotate secrets quarterly** — JWT, encryption key, cookie secret
4. **Backup your encryption key** — if lost, encrypted Aadhaar/PAN cannot be recovered
5. **Monitor audit logs** — check for `FAILED_LOGIN` and `SENSITIVE_DATA_VIEWED` events
6. **Run on HTTPS only** — Render and Vercel provide free SSL automatically
7. **Never store Aadhaar/PAN in logs** — already handled by masking

---

## Legal & Compliance

- Software protected under Copyright Act, 1957 (India)
- Register at [copyright.gov.in](https://copyright.gov.in) — ₹500 fee
- Trademark "VaultFinance" at [ipindia.gov.in](https://ipindia.gov.in) — Class 36 & 42
- Compliant with India's DPDP Act 2023 (data protection)
- Add Terms of Service, Privacy Policy, and EULA pages before launch

---

## Support

For technical support, custom development, or enterprise licensing:
- Email: admin@vaultfinance.com
- WhatsApp: +91 XXXXXXXXXX

---

*VaultFinance is proprietary software. All rights reserved.*
*© 2025 VaultFinance / [YOUR COMPANY NAME]*
