# Landing Page & Hosting Research

_Research date: 2026-05-28_

---

## 1. Landing Page Technology

### Current Situation

The app already has a home page at `/home` inside the Angular app (`apps/opticv-web/src/app/features/home/`). It's a public, prerendered (SSR) page — good for SEO. But a proper marketing landing page + blog has different needs than an app page.

### Option A: Extend the Existing Angular App

Add more marketing pages (`/features`, `/pricing`, `/blog`) directly inside `opticv-web`.

**Pros:**
- Single codebase, no extra infrastructure
- Shared design system (PrimeNG, Tailwind)
- SSR + prerendering already works — great for SEO

**Cons:**
- Blog in Angular is painful — no CMS, no Markdown support out of the box
- Angular bundle size grows with app features
- Mixing marketing content with app code gets messy over time

### Option B: Separate Static Site (Recommended for blog)

Use a dedicated static site generator for the landing page + blog, served from a separate subdomain (e.g. `opticv.com` → landing, `app.opticv.com` → Angular app).

| Option | Fit | Why |
|---|---|---|
| **Astro** ⭐ | Excellent | TypeScript-native, supports Angular components via islands, markdown/MDX for blog, near-zero JS by default, brilliant SEO |
| **Next.js** | Good | React-based, very mature, but adds React dependency not already present |
| **Nuxt** | OK | Vue-based — different ecosystem from Angular |
| **Hugo** | Good for blog-only | Very fast, Go-based, Markdown-native, but no component reuse with Angular |

**Astro is the top recommendation** because:
- TypeScript-first (aligns with the stack)
- Angular components can be embedded via `@astrojs/angular` integration
- Markdown + MDX for blog posts is first-class
- Generates fully static HTML — ideal SEO and performance
- Can be hosted on Netlify/Vercel for free

### Connecting Landing Page and App

#### Subdomain split (cleanest)
```
opticv.com          → Astro landing page + blog (static, CDN-hosted)
app.opticv.com      → Angular app (NestJS backend on :3000)
```

**Connection points:**
- "Get Started" / CTA buttons on the landing page link to `app.opticv.com/login` or `app.opticv.com/cv-optimization`
- Shared design tokens — copy Tailwind config and color palette into the Astro project
- No shared auth needed — the landing page is fully public

#### Same domain with path prefix (more complex)
```
opticv.com/         → Landing page
opticv.com/blog/    → Blog
opticv.com/app/     → Angular app
```
Requires a reverse proxy (Nginx/Caddy) to route paths to different origins. More DevOps work, but keeps a single domain.

### Recommendation Summary

| Need | Solution |
|---|---|
| Landing page | **Astro** on a separate repo/subdomain |
| Blog | **Astro + Markdown/MDX** (or connect a headless CMS like Contentful/Sanity later) |
| App | Keep Angular app as-is at `app.opticv.com` |
| Connection | CTA links between the two; shared Tailwind color palette |

If keeping everything in the Nx monorepo, Astro can be added as a new project inside `apps/` using the `@nxtensions/astro` Nx integration.

---

## 2. Hosting

### Stack Deployment Requirements

Three things to deploy:
1. **Angular SSR app** (`opticv-web`) — Node.js server (Express, port 4000)
2. **NestJS backend** (`opticv-be`) — Node.js server (Express, port 3000)
3. **PostgreSQL database** — already on **Supabase** ✅ (no action needed)

Plus: Redis (BullMQ, rate limiting), S3 (already using AWS SDK).

---

### Option A: Railway ⭐ (Recommended)

Deploy both Node.js apps as separate services from the same GitHub repo.

```
Railway Project
├── Service: opticv-be     (NestJS, nx build opticv-be)
├── Service: opticv-web    (Angular SSR, nx build opticv-web)
└── Service: Redis         (1-click plugin, for BullMQ + throttler)
```

**Why Railway:**
- Native monorepo support — each service gets a different build command
- Built-in Redis (needed for BullMQ + throttler)
- No Dockerfile required to start
- Easy env vars per service
- GitHub auto-deploy on push

#### Railway Pricing (as of 2026)

**Billing formula:** Pay per actual resource consumed

| Resource | Cost |
|---|---|
| CPU | $20 / vCPU / month |
| RAM | $10 / GB RAM / month |
| Egress (outbound traffic) | $0.10 / GB |
| Storage | $0.25 / GB / month |

**Plans:**

| Plan | Monthly fee | Included credit |
|---|---|---|
| **Hobby** | $5/month | $5 usage credit |
| **Pro** | Higher | $20 usage credit |

**Realistic estimate for OptiCV at early/low traffic:**

- `opticv-be`: ~0.2 vCPU + 0.3 GB RAM = ~$7/month
- `opticv-web`: ~0.2 vCPU + 0.3 GB RAM = ~$7/month
- Redis: ~$2–5/month
- **Total: ~$14–20/month** (minus $5 Hobby credit = **~$9–15/month net**)

> ⚠️ Idle containers still cost money — Railway charges even when receiving zero requests.

Sources: [Railway Pricing Docs](https://docs.railway.com/pricing) · [Railway Pricing Plans](https://docs.railway.com/pricing/plans) · [Railway Pricing Calculator](https://makerkit.dev/pricing-calculator/railway) · [What You'll Actually Pay](https://servercompass.app/blog/railway-pricing-what-youll-actually-pay)

---

### Option B: Hostinger Managed Node.js Hosting

Hostinger offers a managed Node.js hosting product with flat monthly pricing.

#### Plans

| | **Business Plan** | **Premium Plan** |
|---|---|---|
| CPU | 2 cores | 4 cores |
| RAM | 3 GB | 4 GB |
| Storage | 50 GB NVMe | 100 GB NVMe |
| Node.js apps | 5 | 10 |
| Bandwidth | Unlimited | Unlimited |
| Renewal price | ~$17/month | ~$26/month |

#### Redis Consideration

Hostinger managed hosting does **not** include Redis. External provider needed:
- **Upstash Redis** — free tier up to 10k requests/day, then pay-per-use (~$0–10/month for small apps)
- **Redis Cloud** — free 30 MB tier

Sources: [Hostinger Node.js Hosting](https://www.hostinger.com/nodejs-hosting) · [Hostinger Node.js Options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/) · [Hostinger Blog](https://www.hostinger.com/blog/nodejs-hosting-launch) · [Hostinger Pricing](https://www.hostinger.com/pricing)

---

### Option C: Render

Similar to Railway, slightly more manual for monorepos. Free tier spins down after inactivity (bad for APIs). Paid from ~$7/service/month.

### Option D: Fly.io

Docker-based, more DevOps involved. Great performance globally. Requires Dockerfiles for both apps.

### Option E: Vercel + separate backend host

Vercel is excellent for frontend SSR but Angular SSR support is less mature than Next.js. Splits deployment across two platforms.

### Option F: Cloudways

Managed cloud hosting sitting on top of AWS/GCP/DigitalOcean. Better suited for PHP/WordPress/Laravel. More manual Nginx config needed for Node.js monorepos.

---

### Railway vs Cloudways Comparison

| | **Railway** | **Cloudways** |
|---|---|---|
| **Type** | PaaS | Managed cloud hosting |
| **Target user** | Developers, modern Node.js apps | Agencies, PHP/WordPress sites |
| **Deploy from** | GitHub (auto-deploy on push) | SFTP, Git (more manual) |
| **Node.js support** | First-class | Yes, but not primary focus |
| **Redis** | 1-click plugin | Manual setup |
| **Nx monorepo support** | Good | Awkward |
| **Pricing model** | Pay per actual usage | Fixed monthly (server size) |
| **Starting cost** | ~$5/month | ~$14/month |
| **Free tier** | Yes (limited) | No |
| **Primary strength** | Modern Node.js/containerized apps | PHP/WordPress/traditional web |

---

### Railway vs Hostinger Comparison

| | **Hostinger Managed** | **Railway** |
|---|---|---|
| **Pricing model** | Flat monthly fee | Pay per actual usage |
| **Predictability** | ✅ Fixed cost, no surprises | ⚠️ Can fluctuate |
| **Starting cost** | ~$17/month (renews) | ~$10–20/month |
| **RAM** | 3 GB shared across apps | Per-service, scales up |
| **Redis included** | ❌ No | ✅ 1-click plugin |
| **GitHub auto-deploy** | ✅ Yes | ✅ Yes |
| **Nx monorepo support** | ⚠️ Less clear | ✅ Custom build commands |
| **Angular SSR support** | ✅ Listed as supported | ✅ Native Node.js |
| **NestJS support** | ✅ Express-based | ✅ Native Node.js |
| **Scaling** | Manual (upgrade plan) | Automatic |
| **Redis/BullMQ** | ❌ Need external service | ✅ Built-in |

---

### Final Hosting Recommendation

| Scenario | Pick |
|---|---|
| Want **predictable flat pricing** and simplicity | **Hostinger** |
| Want **usage-based pricing** and built-in Redis | **Railway** |
| Cost-conscious at launch (promo pricing) | **Hostinger** |
| Expect rapid scaling | **Railway** |

---

## 3. Domain & Subdomains

Domain `opticv.com` is already purchased. **Subdomains are free** — no additional purchase needed.

### How Subdomains Work

When you own `opticv.com`, you control all subdomains under it. Configure them via DNS settings at your domain registrar.

When deployed to Railway, each service gets a URL like:
- `opticv-web-production.up.railway.app`
- `opticv-be-production.up.railway.app`

Add CNAME records in your DNS panel:
```
app.opticv.com   →  CNAME  →  opticv-web-production.up.railway.app
api.opticv.com   →  CNAME  →  opticv-be-production.up.railway.app
```

### SSL/HTTPS

Also free. Railway (and most modern hosts) automatically provision **Let's Encrypt SSL certificates** for custom domains.

### Tip: Use Cloudflare for DNS

Switch to Cloudflare as nameserver (free) for:
- Fast global DNS propagation
- DDoS protection
- Free CDN layer
- Easy subdomain management

---

## 4. Recommended Full Architecture

```
opticv.com            → Netlify or Vercel     (Astro landing page — free)
app.opticv.com        → Hostinger             (Angular SSR — paid)
api.opticv.com        → Hostinger             (NestJS — paid)
```

- Supabase handles PostgreSQL ✅
- Upstash Redis handles BullMQ + throttler ✅
- AWS S3 credentials passed as env vars ✅
- Astro landing page hosted for free on Netlify/Vercel ✅

---

## 5. Staging Environment

**Decision: Render for both staging services**

Render is a good fit for staging because:
- Runs a real Node.js server — Angular SSR works without special adapters
- Free tier is acceptable for staging (cold starts after inactivity are tolerable in non-prod)
- Two services point at the same GitHub repo, each with a different build/start command
- Branch deploys supported — can auto-deploy a `staging` branch

### Render Service Configuration

**`opticv-be` (staging)**

| Setting | Value |
|---|---|
| Repo | same GitHub repo |
| Branch | `staging` (or `develop`) |
| Build command | `npm ci && npm exec nx build opticv-be` |
| Start command | `node apps/opticv-be/dist/main.js` |
| Environment | Set env vars per service in Render dashboard |

**`opticv-web` (staging)**

| Setting | Value |
|---|---|
| Repo | same GitHub repo |
| Branch | `staging` (or `develop`) |
| Build command | `npm ci && npm exec nx build opticv-web` |
| Start command | `node apps/opticv-web/dist/opticv-web/server/server.mjs` |
| Environment | Set `API_URL` to point at the staging backend |

> ⚠️ Verify the exact SSR entry point path after the first build — it may differ slightly depending on Nx output config.

### Redis for Staging

**Upstash Redis free tier** — 10k requests/day, sufficient for staging. No credit card required for the free plan.

### Staging URLs

Render assigns URLs automatically per service:

```
staging-opticv-web.onrender.com   → Angular SSR frontend
staging-opticv-be.onrender.com    → NestJS backend
```

Custom subdomains can be added later (e.g. `staging.app.opticv.com`) via CNAME in DNS.

### Cost

- Free tier: $0/month (with cold starts after ~15 min inactivity)
- Paid tier: ~$7/service/month to keep services always-on (not necessary for staging)
