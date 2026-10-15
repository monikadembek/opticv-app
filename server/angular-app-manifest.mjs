
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/home",
    "route": "/"
  },
  {
    "renderMode": 1,
    "route": "/login"
  },
  {
    "renderMode": 1,
    "route": "/verify"
  },
  {
    "renderMode": 2,
    "route": "/home"
  },
  {
    "renderMode": 1,
    "route": "/upload-cv"
  },
  {
    "renderMode": 1,
    "route": "/dashboard"
  },
  {
    "renderMode": 1,
    "route": "/cv-optimization"
  },
  {
    "renderMode": 1,
    "route": "/cv-optimization/*"
  },
  {
    "renderMode": 1,
    "route": "/settings"
  },
  {
    "renderMode": 2,
    "redirectTo": "/home",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 12834, hash: '18d49bd2961b4b071e9aff01d206ef943ad17edd0f92f80463f8e2d116c0f4f3', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1513, hash: '431682c56856c84c0f4f80c86c5ad184093749a16d0d886eed8223f8baf1d4ce', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'home/index.html': {size: 112958, hash: '299e6bac827f33837fd15e3350945f9e7a79af901fb49caf029f20908d26f725', text: () => import('./assets-chunks/home_index_html.mjs').then(m => m.default)},
    'styles-XSLDZODZ.css': {size: 61552, hash: 'APd+zidFnDQ', text: () => import('./assets-chunks/styles-XSLDZODZ_css.mjs').then(m => m.default)}
  },
};
