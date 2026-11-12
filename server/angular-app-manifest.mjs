
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
    "renderMode": 1,
    "route": "/pricing"
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
    'index.csr.html': {size: 13023, hash: '23751211de1f77b7b684b678e67ed5dc3d122f0b895afbcf130d9b27d8cbd3bd', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1513, hash: '26df2a2f9a9fd82cc1b2ee035f6169ffebdad80c2f04ce8f46f53a88c07cecae', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'privacy-policy/index.html': {size: 127643, hash: 'dbaa5379f8cd9a80aa4566ae4a0befcb75fb2c8e2c07b68e0d3d378e669cd185', text: () => import('./assets-chunks/privacy-policy_index_html.mjs').then(m => m.default)},
    'home/index.html': {size: 115482, hash: '8df52c643b460d4efb6ae73763199aaeb488667b889d98e20b4f9ffed05070b6', text: () => import('./assets-chunks/home_index_html.mjs').then(m => m.default)},
    'terms-of-use/index.html': {size: 123656, hash: '963f7e72867afa8e04d03b8226200fa0ec9916d7d89ae122ca3b131d7348b7fe', text: () => import('./assets-chunks/terms-of-use_index_html.mjs').then(m => m.default)},
    'styles-CQ4T3RWX.css': {size: 62914, hash: 'H/W6x9gXEyI', text: () => import('./assets-chunks/styles-CQ4T3RWX_css.mjs').then(m => m.default)}
  },
};
