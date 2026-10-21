
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
    "route": "/privacy-policy"
  },
  {
    "renderMode": 2,
    "route": "/terms-of-use"
  },
  {
    "renderMode": 2,
    "redirectTo": "/home",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 12856, hash: '5cac74da6da81cb31b661e9a2ff591722cf668a4c10a6ebb71e625ec89202ea7', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1513, hash: '05062399798aa7c1177582cad24183720aa88bf923ba8d93ed081fcb394a650d', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'privacy-policy/index.html': {size: 126053, hash: '2c2db44ff765a76f53fdf084cceef4dde012d6eb6653376142749e79555d0b32', text: () => import('./assets-chunks/privacy-policy_index_html.mjs').then(m => m.default)},
    'home/index.html': {size: 113892, hash: '8eba7d427e0cc108a0e09e6dde88e6c15ffbde8237d70074c93ff262f76ee8c0', text: () => import('./assets-chunks/home_index_html.mjs').then(m => m.default)},
    'terms-of-use/index.html': {size: 122066, hash: 'a236ba896781014c4dd1cd4e721e0434dd8bd37ee27e655a380248324e425a5b', text: () => import('./assets-chunks/terms-of-use_index_html.mjs').then(m => m.default)},
    'styles-KECXAJ6F.css': {size: 62406, hash: 'f4ertv/v5CE', text: () => import('./assets-chunks/styles-KECXAJ6F_css.mjs').then(m => m.default)}
  },
};
