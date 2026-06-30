# Deployment Guide — Vercel + Supabase

## Live Platform Access

### Login Accounts

| Email | Password | Role | Access Level |
|-------|----------|------|-------------|
| admin@amira-capstone.com | admin123 | ADMIN | Full access (settings, users, all features) |
| researcher@amira-capstone.com | researcher123 | RESEARCHER | Dashboard, testing, analytics, reports |
| panel@amira-capstone.com | panel123 | PANEL | Dashboard, testing, analytics (read-focused) |

---

## Deploy to Vercel (Step-by-Step)

### Prerequisites
- GitHub account (repo already at: `github.com/corestacktechph-ui/SDN-Map`)
- Vercel account (sign up free at vercel.com)
- Supabase project (already configured)

---

### Step 1 — Connect GitHub to Vercel

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select the `corestacktechph-ui/SDN-Map` repository
4. Click **Import**

---

### Step 2 — Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `./` |
| Build Command | `prisma generate && next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

---

### Step 3 — Set Environment Variables

In Vercel project settings → **Environment Variables**, add these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres.rlultndwlfqqpcdfvvmb:Carlpogi%401029@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | `postgresql://postgres.rlultndwlfqqpcdfvvmb:Carlpogi%401029@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres` |
| `NEXTAUTH_SECRET` | `amira-capstone-production-secret-key-2024` |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` (update after first deploy) |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` |
| `NEXT_PUBLIC_WS_URL` | `https://your-project.vercel.app` |

> **Important:** After your first deploy, update `NEXTAUTH_URL` with your actual Vercel URL (e.g., `https://sdn-map.vercel.app`).

---

### Step 4 — Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Your app is live at `https://sdn-map-xxxxx.vercel.app`

---

### Step 5 — Update NEXTAUTH_URL

After the first deploy:
1. Go to Vercel → your project → **Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` to your actual domain (e.g., `https://sdn-map.vercel.app`)
3. Redeploy: **Deployments** → click **"..."** on latest → **Redeploy**

---

### Step 6 — Custom Domain (Optional)

1. Go to Vercel → your project → **Settings** → **Domains**
2. Add your custom domain or use the free `.vercel.app` subdomain
3. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to match

---

## Vercel Build Configuration

If needed, create `vercel.json` in the project root:

```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs"
}
```

---

## Database (Supabase)

### Connection Details

| Property | Value |
|----------|-------|
| Provider | Supabase (PostgreSQL 15) |
| Region | ap-southeast-1 (Singapore) |
| Project Ref | rlultndwlfqqpcdfvvmb |
| Dashboard | https://supabase.com/dashboard/project/rlultndwlfqqpcdfvvmb |

### Tables (14 total)

| Table | Records | Description |
|-------|---------|-------------|
| User | 3 | Admin, Researcher, Panel accounts |
| Topology | 2 | Traditional + SDN topologies |
| Device | 42 | All switches, hosts, servers |
| Controller | 1 | Ryu SDN Controller |
| Vlan | 14 | All VLAN definitions |
| FlowEntry | — | OpenFlow flow entries |
| Link | — | Device-to-device connections |
| PerformanceTest | — | Test execution records |
| PerformanceResult | — | Test metric results |
| ComparisonResult | — | Traditional vs SDN comparisons |
| QoSPolicy | — | QoS traffic policies |
| Report | — | Generated reports |
| Alert | — | System alerts |
| Log | — | Audit trail |

### Re-seed Database (if needed)

```bash
npx tsx prisma/seed.ts
```

---

## Post-Deployment Verification

After deploying, verify everything works:

1. **Login page:** Go to `https://your-domain.vercel.app/login`
2. **Login with:** `admin@amira-capstone.com` / `admin123`
3. **Dashboard:** Should show devices, controller status, network health
4. **Testing:** Run a performance test from Testing Center
5. **Analytics:** Check Statistical Analysis tab for comparison data
6. **Topology:** View network visualization

---

## Troubleshooting

### "Invalid credentials" on login
- Database might not be seeded. Run: `npx tsx prisma/seed.ts`
- Check that `DATABASE_URL` in Vercel env vars is correct

### Build fails with Prisma error
- Make sure build command is: `prisma generate && next build`
- Verify `DATABASE_URL` and `DIRECT_URL` are set in Vercel env vars

### "NEXTAUTH_URL mismatch" or redirect loops
- Update `NEXTAUTH_URL` in Vercel to match your actual deployment URL
- Must include `https://` prefix

### Database connection timeout
- Supabase free tier may pause after inactivity
- Go to Supabase Dashboard and click "Restore project" if paused
- Verify pooler URL uses port 6543 (transaction mode) for `DATABASE_URL`

### WebSocket not connecting
- The WebSocket server (`server/index.js`) runs separately and cannot run on Vercel
- For production real-time, consider: Supabase Realtime, Pusher, or Ably
- The dashboard will still work — real-time charts use simulated data as fallback

---

## Architecture on Vercel

```
┌─────────────────────────────────────────┐
│           Vercel (Edge Network)          │
│  ┌───────────────────────────────────┐  │
│  │   Next.js App (SSR + API Routes)  │  │
│  │   - Dashboard pages               │  │
│  │   - REST API (/api/*)             │  │
│  │   - NextAuth authentication       │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼──────────────────────┘
                   │ PostgreSQL connection
                   ▼
┌─────────────────────────────────────────┐
│        Supabase (ap-southeast-1)         │
│  ┌───────────────────────────────────┐  │
│  │  PostgreSQL 15                    │  │
│  │  - 14 tables                      │  │
│  │  - PgBouncer connection pooling   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Quick Deploy Commands (CLI Alternative)

If you prefer deploying via Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time — will ask for project settings)
vercel

# Deploy to production
vercel --prod

# Set environment variables via CLI
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add NEXT_PUBLIC_APP_URL
```

---

## Security Notes

- Change all passwords after initial deployment
- Rotate the `NEXTAUTH_SECRET` for production
- The Supabase database password should be changed via Dashboard → Settings → Database
- Never commit `.env` or `.env.local` files (already in `.gitignore`)
- Consider enabling Supabase Row Level Security (RLS) for extra protection
