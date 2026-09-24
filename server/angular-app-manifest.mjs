
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
    'index.csr.html': {size: 12834, hash: 'ef83f984709dc14eb825db72c2f1945f0fc9f689b128afafc1dcd145fb8b1ffe', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1513, hash: '59f1658609a7a7c7e822196359c85926bf068045e444966f602538e8cf459d9d', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'home/index.html': {size: 129953, hash: '82c59f6dbc862e9568d1d95d29f70b8dcdae9503b54f7b594b6cf983041ed509', text: () => import('./assets-chunks/home_index_html.mjs').then(m => m.default)},
    'styles-KNGKYVKU.css': {size: 61473, hash: 'ezlc8i15Um0', text: () => import('./assets-chunks/styles-KNGKYVKU_css.mjs').then(m => m.default)}
  },
};
