import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();

const allowedHosts = process.env['ALLOWED_HOSTS']
  ? process.env['ALLOWED_HOSTS'].split(',').map((h) => h.trim())
  : [];

// Hostinger terminates TLS at its reverse proxy, so the app only sees the
// original scheme/host/port via X-Forwarded-*. Angular ignores those headers
// unless told which to trust.
const trustProxyHeaders = process.env['TRUST_PROXY_HEADERS']
  ? process.env['TRUST_PROXY_HEADERS'].split(',').map((h) => h.trim())
  : false;

const angularApp = new AngularNodeAppEngine({
  allowedHosts,
  trustProxyHeaders,
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Listen unconditionally rather than behind `isMainModule(import.meta.url)`.
 * Hostinger loads this file through its own wrapper instead of running it as
 * the entry point, so that check is false there and the server never binds.
 */
const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  console.log(`Node Express server listening on http://localhost:${port}`);
});

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
