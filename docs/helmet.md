# Helmet

**Helmet** is a popular Node.js/Express middleware library that automatically sets a collection of **HTTP security response headers** to protect your app against common web vulnerabilities. It's essentially a security hardening layer for your HTTP responses.

---

## What headers it sets (13 by default)

| Header | Protects Against |
|--------|-----------------|
| `Content-Security-Policy` | XSS, data injection attacks |
| `Strict-Transport-Security` | MITM attacks by enforcing HTTPS |
| `X-Content-Type-Options: nosniff` | MIME-type sniffing |
| `X-Frame-Options` | Clickjacking (iframe embedding) |
| `Referrer-Policy` | Leaking referrer URLs to third parties |
| `Permissions-Policy` | Unauthorized use of browser APIs (camera, mic, etc.) |
| `Cross-Origin-Embedder-Policy` | Cross-origin embedding attacks |
| `Cross-Origin-Opener-Policy` | Cross-origin window access |
| `Cross-Origin-Resource-Policy` | Cross-origin resource reads |
| *(removes)* `X-Powered-By` | Server fingerprinting |
| ...and a few more | Various browser-level protections |

---

## Would it be beneficial for this app?

**Yes, definitely.** Here's why it fits well:

1. **The app already has security features** — rate limiting (`ThrottlerModule`) and CORS are configured, so Helmet is a natural next layer.

2. **The app handles auth tokens** — since Supabase JWTs flow through the API, headers like `Strict-Transport-Security` and `Content-Security-Policy` are directly relevant.

3. **It's trivially easy to add** — NestJS has first-class support:
   ```typescript
   import helmet from 'helmet';
   // ...
   app.use(helmet());
   ```
   One line in `main.ts`, right before `app.enableCors()`.

4. **It removes `X-Powered-By`** automatically — so attackers can't trivially fingerprint your NestJS/Express stack.

5. **Low risk, high value** — it's a well-maintained industry standard (recommended by Express.js official security guidelines and OWASP). Minimal overhead.

---

## One caveat for this app

The **Content-Security-Policy** header that Helmet sets by default can sometimes conflict with Angular SSR or Swagger UI (since both inject inline scripts). You'd want to test after enabling it and potentially customize the CSP if needed:

```typescript
app.use(helmet({
  contentSecurityPolicy: env === 'production' ? undefined : false, // relax in dev for Swagger
}));
```

---

## Integration in NestJS (`main.ts`)

```typescript
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
  app.use(helmet()); // add before enableCors()
  app.enableCors({ origin: configService.get<string>('frontendUrl') });
  // ...
}
```

---

## Summary

Helmet is a **low-effort, high-impact security win** and a natural complement to the rate limiting and CORS already in place in this app.
