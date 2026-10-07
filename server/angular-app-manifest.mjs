
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
    'index.csr.html': {size: 12834, hash: 'fcbefe1b7cb69e627d1506ad8c1651e1f35cd5afbd42bb0a45f955f7db49c933', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1513, hash: 'e491c7e6db34fd72bce21953cdea362c7ceae66e709ef5336adb3cbcb6a6b927', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'home/index.html': {size: 129953, hash: 'd903ca35625ffb6506d30c3400dee3f1cf58324e8b380abc52cd603ab1a53ac7', text: () => import('./assets-chunks/home_index_html.mjs').then(m => m.default)},
    'styles-KNGKYVKU.css': {size: 61473, hash: 'ezlc8i15Um0', text: () => import('./assets-chunks/styles-KNGKYVKU_css.mjs').then(m => m.default)}
  },
};
