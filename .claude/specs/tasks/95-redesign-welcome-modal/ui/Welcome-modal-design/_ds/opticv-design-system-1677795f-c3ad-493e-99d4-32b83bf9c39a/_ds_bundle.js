/* @ds-bundle: {"format":3,"namespace":"OptiCVDesignSystem_167779","components":[{"name":"Accordion","sourcePath":"components/data-display/Accordion.jsx"},{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Card","sourcePath":"components/data-display/Card.jsx"},{"name":"FeatureCard","sourcePath":"components/data-display/FeatureCard.jsx"},{"name":"StatTile","sourcePath":"components/data-display/StatTile.jsx"},{"name":"StepCard","sourcePath":"components/data-display/StepCard.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"Callout","sourcePath":"components/feedback/Callout.jsx"},{"name":"ScoreRing","sourcePath":"components/feedback/ScoreRing.jsx"},{"name":"SeverityBadge","sourcePath":"components/feedback/SeverityBadge.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"}],"sourceHashes":{"components/data-display/Accordion.jsx":"9d1e2883199a","components/data-display/Avatar.jsx":"11ef27aaf2f4","components/data-display/Card.jsx":"1eebe74aae21","components/data-display/FeatureCard.jsx":"68922ac83221","components/data-display/StatTile.jsx":"0485e92649d7","components/data-display/StepCard.jsx":"f3116a314e9a","components/feedback/Badge.jsx":"6915b373a2d9","components/feedback/Callout.jsx":"b7e4dfcc57f7","components/feedback/ScoreRing.jsx":"fe7f0257db5e","components/feedback/SeverityBadge.jsx":"94621378043b","components/forms/Button.jsx":"d4d55bd8f11f","components/forms/Checkbox.jsx":"6c777e84fd2e","components/forms/Input.jsx":"d540732568d4","ui_kits/app/AppShell.jsx":"2b8aace6209e","ui_kits/app/DashboardScreen.jsx":"1aceafef79ef","ui_kits/app/HomeScreen.jsx":"50390b8f28ab","ui_kits/app/OptimizationScreen.jsx":"e43285eedc86","ui_kits/app/UploadScreen.jsx":"3ec93b69ec22","ui_kits/marketing/MarketingPage.jsx":"eca4f55d1503"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OptiCVDesignSystem_167779 = window.OptiCVDesignSystem_167779 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data-display/Accordion.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** OptiCV accordion panel (single, controlled or uncontrolled). */
function Accordion({
  title,
  status,
  children,
  defaultOpen = false,
  className = "",
  ...rest
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const classes = ["ocv-accordion", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "ocv-accordion__header",
    "aria-expanded": open,
    onClick: () => setOpen(!open)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)"
    }
  }, status, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-chevron-down ocv-accordion__chev",
    "aria-hidden": "true",
    style: {
      transform: open ? "rotate(180deg)" : "rotate(0deg)"
    }
  }))), open && /*#__PURE__*/React.createElement("div", {
    className: "ocv-accordion__body"
  }, children));
}
Object.assign(__ds_scope, { Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Accordion.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** OptiCV avatar — initials or image, circular. */
function Avatar({
  label,
  src,
  alt,
  size = "base",
  style,
  className = "",
  ...rest
}) {
  const classes = ["ocv-avatar", `ocv-avatar--${size}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes,
    style: style
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt || label || ""
  }) : label);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** OptiCV surface card. */
function Card({
  children,
  bordered = false,
  accent = false,
  flush = false,
  className = "",
  ...rest
}) {
  const classes = ["ocv-card", bordered && "ocv-card--bordered", accent && "ocv-card--accent", flush && "ocv-card--flush", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Card.jsx", error: String((e && e.message) || e) }); }

// components/data-display/FeatureCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** OptiCV feature card — emerald icon circle, title, blurb. */
function FeatureCard({
  icon,
  title,
  children,
  className = "",
  ...rest
}) {
  const classes = ["ocv-feature", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "ocv-feature__icon"
  }, /*#__PURE__*/React.createElement("i", {
    className: icon,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "ocv-feature__title"
  }, title), /*#__PURE__*/React.createElement("p", {
    className: "ocv-feature__text"
  }, children));
}
Object.assign(__ds_scope, { FeatureCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/FeatureCard.jsx", error: String((e && e.message) || e) }); }

// components/data-display/StatTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** OptiCV social-proof stat tile — big emerald number + caption. */
function StatTile({
  value,
  children,
  className = "",
  ...rest
}) {
  const classes = ["ocv-stat", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "ocv-stat__num"
  }, value), /*#__PURE__*/React.createElement("div", {
    className: "ocv-stat__cap"
  }, children));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/data-display/StepCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** OptiCV "how it works" numbered step card with emerald left accent. */
function StepCard({
  number,
  title,
  children,
  className = "",
  ...rest
}) {
  const classes = ["ocv-step", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "ocv-step__num"
  }, number), /*#__PURE__*/React.createElement("h3", {
    className: "ocv-step__title"
  }, title), /*#__PURE__*/React.createElement("p", {
    className: "ocv-step__text"
  }, children));
}
Object.assign(__ds_scope, { StepCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/StepCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** OptiCV badge — small label/count. */
function Badge({
  children,
  variant = "neutral",
  icon,
  className = "",
  ...rest
}) {
  const classes = ["ocv-badge", `ocv-badge--${variant}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes
  }, rest), icon && /*#__PURE__*/React.createElement("i", {
    className: icon,
    "aria-hidden": "true"
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Callout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** OptiCV inline callout / alert strip with a left accent border. */
function Callout({
  children,
  variant = "info",
  icon,
  className = "",
  ...rest
}) {
  const defaultIcon = {
    warning: "pi pi-info-circle",
    success: "pi pi-check-circle",
    info: "pi pi-info-circle",
    critical: "pi pi-exclamation-triangle"
  }[variant];
  const classes = ["ocv-callout", `ocv-callout--${variant}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: icon || defaultIcon,
    "aria-hidden": "true",
    style: {
      marginTop: 2,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: 0
    }
  }, children));
}
Object.assign(__ds_scope, { Callout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Callout.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ScoreRing.jsx
try { (() => {
/**
 * OptiCV ScoreRing — the signature circular progress used for ATS scores and
 * keyword match. Color thresholds follow the app: emerald ≥ 70, amber ≥ 40, red below.
 */
function ScoreRing({
  value,
  max = 100,
  size = 128,
  label,
  suffix = "",
  trackColor = "#e5e7eb"
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const stroke = value / max >= 0.7 ? "var(--primary-600)" : value / max >= 0.4 ? "#d97706" : "#dc2626";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    style: {
      width: size,
      height: size
    },
    role: "img",
    "aria-label": `${label || "Score"}: ${value}${suffix}`
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: r,
    fill: "none",
    stroke: trackColor,
    strokeWidth: "10"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: r,
    fill: "none",
    stroke: stroke,
    strokeWidth: "10",
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: offset,
    transform: "rotate(-90 50 50)",
    style: {
      transition: "stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)"
    }
  }), /*#__PURE__*/React.createElement("text", {
    x: "50",
    y: "50",
    textAnchor: "middle",
    dominantBaseline: "central",
    fontSize: "22",
    fontWeight: "700",
    fill: stroke,
    style: {
      fontFamily: "var(--font-heading)"
    }
  }, value, suffix)), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      color: "var(--text-muted)"
    }
  }, label));
}
Object.assign(__ds_scope, { ScoreRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ScoreRing.jsx", error: String((e && e.message) || e) }); }

// components/feedback/SeverityBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * OptiCV severity / status pill — uppercase rounded tag used for ATS issue
 * severity and keyword importance.
 */
function SeverityBadge({
  level = "medium",
  children,
  className = "",
  ...rest
}) {
  const label = children ?? level;
  const classes = ["ocv-pill", `ocv-pill--${level}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes
  }, rest), label);
}
Object.assign(__ds_scope, { SeverityBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/SeverityBadge.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * OptiCV Button — primary action element.
 * Renders an <a> when `href` is provided, otherwise a <button>.
 */
function Button({
  children,
  variant = "primary",
  size = "base",
  elevated = false,
  icon,
  iconRight,
  href,
  type = "button",
  disabled = false,
  className = "",
  ...rest
}) {
  const classes = ["ocv-btn", `ocv-btn--${variant}`, variant !== "link" && `ocv-btn--${size}`, elevated && "ocv-btn--elevated", className].filter(Boolean).join(" ");
  const inner = /*#__PURE__*/React.createElement(React.Fragment, null, icon && /*#__PURE__*/React.createElement("i", {
    className: icon,
    "aria-hidden": "true"
  }), children && /*#__PURE__*/React.createElement("span", null, children), iconRight && /*#__PURE__*/React.createElement("i", {
    className: iconRight,
    "aria-hidden": "true"
  }));
  if (href && !disabled) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      className: classes
    }, rest), inner);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: classes,
    disabled: disabled
  }, rest), inner);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * OptiCV checkbox with inline label. Used heavily in keyword selection.
 */
function Checkbox({
  label,
  checked,
  onChange,
  id,
  disabled = false,
  ...rest
}) {
  const inputId = id || (typeof label === "string" ? `ocv-cb-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    className: "ocv-check",
    htmlFor: inputId
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    id: inputId,
    checked: checked,
    onChange: onChange,
    disabled: disabled
  }, rest)), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * OptiCV text input / textarea with optional label and hint.
 */
function Input({
  label,
  hint,
  error,
  multiline = false,
  rows = 4,
  id,
  className = "",
  ...rest
}) {
  const inputId = id || (label ? `ocv-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const fieldClass = [multiline ? "ocv-textarea" : "ocv-input", error && "ocv-input--error", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: "ocv-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "ocv-label",
    htmlFor: inputId
  }, label), multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
    id: inputId,
    className: fieldClass,
    rows: rows
  }, rest)) : /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    className: fieldClass
  }, rest)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    className: `ocv-hint${error ? " ocv-hint--error" : ""}`
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShell.jsx
try { (() => {
// OptiCV web-app shell — sticky glassy header + footer.
const {
  Button,
  Avatar
} = window.OptiCVDesignSystem_167779;
function AppHeader({
  route,
  onNavigate,
  loggedIn,
  onAuth
}) {
  const links = [{
    label: "Home",
    route: "home"
  }, {
    label: "Upload CV",
    route: "upload"
  }, {
    label: "Optimize",
    route: "optimize"
  }, {
    label: "Dashboard",
    route: "dashboard"
  }];
  return /*#__PURE__*/React.createElement("header", {
    className: "app-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-header__inner"
  }, /*#__PURE__*/React.createElement("a", {
    className: "app-logo",
    onClick: () => onNavigate("home")
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/opticv-logo-icon.svg",
    alt: "",
    width: "34",
    height: "40"
  }), /*#__PURE__*/React.createElement("span", null, "Opti", /*#__PURE__*/React.createElement("em", null, "CV"))), /*#__PURE__*/React.createElement("nav", {
    className: "app-nav"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.route,
    className: "app-nav__link" + (route === l.route ? " is-active" : ""),
    onClick: () => onNavigate(l.route)
  }, l.label))), /*#__PURE__*/React.createElement("div", {
    className: "app-header__end"
  }, loggedIn ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Avatar, {
    label: "JD",
    size: "sm",
    onClick: () => onNavigate("dashboard"),
    style: {
      cursor: "pointer"
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "neutral",
    size: "sm",
    onClick: () => onAuth(false)
  }, "Sign out")) : /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    onClick: () => onAuth(true)
  }, "Sign in"))));
}
function AppFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "app-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-footer__inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-logo app-logo--footer"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/opticv-logo-icon.svg",
    alt: "",
    width: "28",
    height: "34"
  }), /*#__PURE__*/React.createElement("span", null, "Opti", /*#__PURE__*/React.createElement("em", null, "CV"))), /*#__PURE__*/React.createElement("p", {
    className: "app-footer__copy"
  }, "\xA9 2026 OptiCV. Made for job seekers who deserve better odds.")));
}
Object.assign(window, {
  AppHeader,
  AppFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/DashboardScreen.jsx
try { (() => {
// OptiCV app — Dashboard (My CVs / My Optimizations tabs).
const {
  Button: DashBtn,
  Card: DashCard,
  SeverityBadge: DashSev,
  ScoreRing: DashRing
} = window.OptiCVDesignSystem_167779;
const CVS = [{
  name: "Jane_Doe_CV_2026.pdf",
  size: "248 KB",
  when: "Today"
}, {
  name: "Jane_Doe_CV_design.docx",
  size: "192 KB",
  when: "12 May 2026"
}];
const OPTS = [{
  role: "Senior Product Designer",
  company: "Northwind Studio",
  score: 86,
  when: "Today"
}, {
  role: "Lead UX Designer",
  company: "Helio Labs",
  score: 78,
  when: "9 May 2026"
}, {
  role: "Product Designer",
  company: "Carta",
  score: 64,
  when: "2 May 2026"
}];
function DashboardScreen({
  onNavigate
}) {
  const [tab, setTab] = React.useState("opts");
  return /*#__PURE__*/React.createElement("div", {
    className: "screen-app section-pad"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dash-head"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "page-title",
    style: {
      marginBottom: 0
    }
  }, "Dashboard"), /*#__PURE__*/React.createElement(DashBtn, {
    variant: "primary",
    icon: "pi pi-plus",
    onClick: () => onNavigate("upload")
  }, "New optimization")), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: "tab" + (tab === "cvs" ? " is-active" : ""),
    onClick: () => setTab("cvs")
  }, "My CVs"), /*#__PURE__*/React.createElement("button", {
    className: "tab" + (tab === "opts" ? " is-active" : ""),
    onClick: () => setTab("opts")
  }, "My Optimizations")), tab === "cvs" ? /*#__PURE__*/React.createElement("div", {
    className: "list"
  }, CVS.map(c => /*#__PURE__*/React.createElement(DashCard, {
    key: c.name,
    bordered: true,
    className: "list-row"
  }, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-file-pdf list-row__icon"
  }), /*#__PURE__*/React.createElement("div", {
    className: "list-row__main"
  }, /*#__PURE__*/React.createElement("p", {
    className: "list-row__title"
  }, c.name), /*#__PURE__*/React.createElement("p", {
    className: "list-row__sub"
  }, c.size, " \xB7 Uploaded ", c.when)), /*#__PURE__*/React.createElement(DashBtn, {
    variant: "link",
    iconRight: "pi pi-arrow-right",
    onClick: () => onNavigate("optimize")
  }, "Optimize")))) : /*#__PURE__*/React.createElement("div", {
    className: "list"
  }, OPTS.map(o => /*#__PURE__*/React.createElement(DashCard, {
    key: o.role + o.when,
    bordered: true,
    className: "list-row",
    onClick: () => onNavigate("optimize"),
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(DashRing, {
    value: o.score,
    size: 64
  }), /*#__PURE__*/React.createElement("div", {
    className: "list-row__main"
  }, /*#__PURE__*/React.createElement("p", {
    className: "list-row__title"
  }, o.role), /*#__PURE__*/React.createElement("p", {
    className: "list-row__sub"
  }, o.company, " \xB7 ", o.when)), /*#__PURE__*/React.createElement(DashSev, {
    level: o.score >= 80 ? "success" : o.score >= 60 ? "medium" : "high"
  }, o.score >= 80 ? "Strong" : o.score >= 60 ? "Good" : "Needs work"), /*#__PURE__*/React.createElement("i", {
    className: "pi pi-chevron-right list-row__chev"
  })))));
}
Object.assign(window, {
  DashboardScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/HomeScreen.jsx
try { (() => {
// OptiCV app — Home (hero + features + steps).
const {
  Button: HomeButton,
  FeatureCard,
  StepCard
} = window.OptiCVDesignSystem_167779;
const FEATURES = [{
  icon: "pi pi-chart-bar",
  title: "ATS Score Analysis",
  text: "Find out exactly why your CV gets rejected before a human even reads it."
}, {
  icon: "pi pi-key",
  title: "Keyword Matching",
  text: "Surface missing keywords from the job description and add them in a click."
}, {
  icon: "pi pi-pen-to-square",
  title: "Summary Rewrite",
  text: "Get an AI-rewritten professional summary optimised for the role you want."
}, {
  icon: "pi pi-list-check",
  title: "Bullet Upgrades",
  text: "Turn flat duties into achievement-led bullets, with metrics where they matter."
}, {
  icon: "pi pi-file-edit",
  title: "Cover Letter",
  text: "Generate a tailored, job-specific cover letter alongside your optimized CV."
}, {
  icon: "pi pi-comments",
  title: "Interview Prep",
  text: "Get likely interview questions and model answers based on the role."
}];
const STEPS = [{
  n: 1,
  title: "Upload your CV",
  text: "Import your CV once (PDF or DOCX). We parse it and reuse it across every feature."
}, {
  n: 2,
  title: "Paste the job description",
  text: "Paste the listing and run optimization — scoring, rewriting and flagging gaps for that exact role."
}, {
  n: 3,
  title: "Get your optimized CV",
  text: "Review suggestions, apply or edit inline, then export your tailored CV, cover letter and prep."
}];
function HomeScreen({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-container hero__inner"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "display-1 hero__title"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald"
  }, "Land more interviews,"), /*#__PURE__*/React.createElement("br", null), "one tailored CV at a time."), /*#__PURE__*/React.createElement("p", {
    className: "hero__lead"
  }, /*#__PURE__*/React.createElement("strong", null, "75% of CVs never reach a recruiter"), " \u2014 they're rejected by ATS software first."), /*#__PURE__*/React.createElement("p", {
    className: "hero__sub"
  }, "OptiCV uses AI to optimize your CV for ATS, write your cover letter and prepare you for the interview \u2014 all tailored to the specific job you're applying for."), /*#__PURE__*/React.createElement("div", {
    className: "hero__cta"
  }, /*#__PURE__*/React.createElement(HomeButton, {
    variant: "primary",
    size: "lg",
    elevated: true,
    icon: "pi pi-bolt",
    onClick: () => onNavigate("upload")
  }, "Optimize my CV"), /*#__PURE__*/React.createElement(HomeButton, {
    variant: "outline",
    size: "lg",
    onClick: () => onNavigate("dashboard")
  }, "View dashboard"))), /*#__PURE__*/React.createElement("div", {
    className: "hero__media"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/images/app-hero.jpg",
    alt: "Job seeker celebrating at a laptop"
  }))), /*#__PURE__*/React.createElement("section", {
    className: "band-yellow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-container section-pad"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "display-2 text-center"
  }, "Everything you need ", /*#__PURE__*/React.createElement("br", null), "to ", /*#__PURE__*/React.createElement("span", {
    className: "text-emerald"
  }, "apply with confidence")), /*#__PURE__*/React.createElement("p", {
    className: "section-sub text-center"
  }, "Everything you need to go from application to offer in one place."), /*#__PURE__*/React.createElement("div", {
    className: "features-grid"
  }, FEATURES.map(f => /*#__PURE__*/React.createElement(FeatureCard, {
    key: f.title,
    icon: f.icon,
    title: f.title
  }, f.text))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    className: "app-container section-pad"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "display-2 text-center"
  }, "How to use ", /*#__PURE__*/React.createElement("span", {
    className: "text-emerald"
  }, "OptiCV")), /*#__PURE__*/React.createElement("p", {
    className: "section-sub text-center"
  }, "From upload to optimized CV in three simple steps."), /*#__PURE__*/React.createElement("div", {
    className: "steps-grid"
  }, STEPS.map(s => /*#__PURE__*/React.createElement(StepCard, {
    key: s.n,
    number: s.n,
    title: s.title
  }, s.text))))));
}
Object.assign(window, {
  HomeScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/OptimizationScreen.jsx
try { (() => {
// OptiCV app — CV Optimization results (the signature screen).
const {
  Button: OptBtn,
  Accordion: OptAccordion,
  ScoreRing,
  SeverityBadge,
  Badge: OptBadge,
  Checkbox: OptCheck,
  Callout: OptCallout
} = window.OptiCVDesignSystem_167779;
const ISSUES = [{
  sev: "critical",
  cat: "Formatting",
  title: "No professional summary",
  fix: "Add a 3–4 line summary at the top tuned to the target role.",
  impact: 9
}, {
  sev: "critical",
  cat: "Keywords",
  title: "Missing core skill: 'TypeScript'",
  fix: "Surface TypeScript in your skills and most recent role.",
  impact: 8
}, {
  sev: "high",
  cat: "Structure",
  title: "Dates not machine-readable",
  fix: "Use 'Jan 2023 – Present' format consistently.",
  impact: 6
}, {
  sev: "medium",
  cat: "Bullets",
  title: "Duty-led bullet points",
  fix: "Rewrite 6 bullets as achievement-led with metrics.",
  impact: 5
}];
const MISSING_KW = [{
  kw: "TypeScript",
  imp: "critical",
  required: true,
  place: "skills + experience"
}, {
  kw: "Design systems",
  imp: "high",
  required: true,
  place: "summary"
}, {
  kw: "Accessibility (WCAG)",
  imp: "medium",
  required: false,
  place: "skills"
}, {
  kw: "Figma",
  imp: "low",
  required: false,
  place: "skills"
}];
function StatusPill({
  state
}) {
  if (state === "processing") return /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--medium)",
      fontSize: "var(--text-sm)",
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-spin pi-spinner",
    style: {
      marginRight: 6
    }
  }), "Processing");
  return /*#__PURE__*/React.createElement(SeverityBadge, {
    level: "success"
  }, "Completed");
}
function OptimizationScreen() {
  const [kw, setKw] = React.useState({
    TypeScript: true,
    "Design systems": true
  });
  const toggle = k => setKw(s => ({
    ...s,
    [k]: !s[k]
  }));
  const selectedCount = Object.values(kw).filter(Boolean).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "screen-app section-pad"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "page-title"
  }, "CV Optimization"), /*#__PURE__*/React.createElement("div", {
    className: "job-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: "job-head__file"
  }, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-file"
  }), "Jane_Doe_CV_2026.pdf"), /*#__PURE__*/React.createElement("p", {
    className: "job-head__title"
  }, "Senior Product Designer"), /*#__PURE__*/React.createElement("p", {
    className: "job-head__company"
  }, "Northwind Studio \xB7 Remote (EU)")), /*#__PURE__*/React.createElement("h2", {
    className: "section-heading"
  }, "Resume analysis and improvements"), /*#__PURE__*/React.createElement("p", {
    className: "section-note"
  }, "Based on the job offer your resume is analyzed. You get a detailed analysis and suggestions for specific improvements."), /*#__PURE__*/React.createElement("div", {
    className: "stack"
  }, /*#__PURE__*/React.createElement(OptAccordion, {
    title: "ATS Analysis",
    defaultOpen: true,
    status: /*#__PURE__*/React.createElement(StatusPill, {
      state: "done"
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "rings-row"
  }, /*#__PURE__*/React.createElement(ScoreRing, {
    value: 58,
    size: 120,
    label: "Current ATS Score"
  }), /*#__PURE__*/React.createElement("i", {
    className: "pi pi-arrow-right rings-arrow"
  }), /*#__PURE__*/React.createElement(ScoreRing, {
    value: 86,
    size: 120,
    label: "After Fixes"
  })), /*#__PURE__*/React.createElement(OptCallout, {
    variant: "warning"
  }, /*#__PURE__*/React.createElement("strong", null, "Top Priority: "), "Add a professional summary tailored to this role \u2014 it's the single biggest score lift available."), /*#__PURE__*/React.createElement("h3", {
    className: "sub-heading"
  }, "Issues"), /*#__PURE__*/React.createElement("div", {
    className: "issue-list"
  }, ISSUES.map((is, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "issue"
  }, /*#__PURE__*/React.createElement("div", {
    className: "issue__top"
  }, /*#__PURE__*/React.createElement(SeverityBadge, {
    level: is.sev
  }), /*#__PURE__*/React.createElement("span", {
    className: "issue__cat"
  }, is.cat)), /*#__PURE__*/React.createElement("p", {
    className: "issue__title"
  }, is.title), /*#__PURE__*/React.createElement("p", {
    className: "issue__fix"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "Fix: "), is.fix), /*#__PURE__*/React.createElement("div", {
    className: "issue__impact"
  }, /*#__PURE__*/React.createElement("span", null, "Impact ", is.impact, "/10"), /*#__PURE__*/React.createElement("span", {
    className: "meter"
  }, /*#__PURE__*/React.createElement("span", {
    className: "meter__fill",
    style: {
      width: is.impact * 10 + "%"
    }
  }))))))), /*#__PURE__*/React.createElement(OptAccordion, {
    title: "Keyword Gap Analysis",
    defaultOpen: true,
    status: /*#__PURE__*/React.createElement(OptBadge, {
      variant: "neutral"
    }, MISSING_KW.length, " missing")
  }, /*#__PURE__*/React.createElement("div", {
    className: "rings-row"
  }, /*#__PURE__*/React.createElement(ScoreRing, {
    value: 64,
    suffix: "%",
    size: 120,
    label: "Keyword Match Score"
  }), /*#__PURE__*/React.createElement("div", {
    className: "match-breakdown"
  }, /*#__PURE__*/React.createElement("p", null, "Required: ", /*#__PURE__*/React.createElement("strong", null, "5 / 8"), " matched"), /*#__PURE__*/React.createElement("p", null, "Preferred: ", /*#__PURE__*/React.createElement("strong", null, "9 / 14"), " matched"))), /*#__PURE__*/React.createElement("h3", {
    className: "sub-heading"
  }, "Missing keywords ", /*#__PURE__*/React.createElement(OptBadge, {
    variant: "neutral"
  }, MISSING_KW.length)), /*#__PURE__*/React.createElement("p", {
    className: "section-note",
    style: {
      marginTop: 0
    }
  }, "Select keywords to incorporate into your CV."), /*#__PURE__*/React.createElement("ul", {
    className: "kw-list"
  }, MISSING_KW.map(m => /*#__PURE__*/React.createElement("li", {
    key: m.kw,
    className: "kw" + (kw[m.kw] ? " is-sel" : "")
  }, /*#__PURE__*/React.createElement(OptCheck, {
    checked: !!kw[m.kw],
    onChange: () => toggle(m.kw)
  }), /*#__PURE__*/React.createElement(SeverityBadge, {
    level: m.imp
  }), m.required && /*#__PURE__*/React.createElement(OptBadge, {
    variant: "info"
  }, "Required"), /*#__PURE__*/React.createElement("span", {
    className: "kw__name"
  }, m.kw), /*#__PURE__*/React.createElement("span", {
    className: "kw__place"
  }, m.place)))), selectedCount > 0 && /*#__PURE__*/React.createElement("p", {
    className: "kw-selected"
  }, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check-circle"
  }), " ", selectedCount, " keyword(s) selected \u2014 will be added to your exported CV.")), /*#__PURE__*/React.createElement(OptAccordion, {
    title: "Rewritten Summary",
    status: /*#__PURE__*/React.createElement(StatusPill, {
      state: "done"
    })
  }, "Three AI summaries tuned to different angles of your experience."), /*#__PURE__*/React.createElement(OptAccordion, {
    title: "Bullet Upgrades",
    status: /*#__PURE__*/React.createElement(StatusPill, {
      state: "processing"
    })
  }, "Working\u2026")), /*#__PURE__*/React.createElement("h2", {
    className: "section-heading"
  }, "Additional materials"), /*#__PURE__*/React.createElement("p", {
    className: "section-note"
  }, "A tailored cover letter and a set of interview prep questions, generated for this exact role."), /*#__PURE__*/React.createElement("div", {
    className: "stack"
  }, /*#__PURE__*/React.createElement(OptAccordion, {
    title: "Cover Letter",
    status: /*#__PURE__*/React.createElement(StatusPill, {
      state: "done"
    })
  }, "Tailored cover letter draft, editable inline."), /*#__PURE__*/React.createElement(OptAccordion, {
    title: "Interview Prep (10 Q&A)",
    status: /*#__PURE__*/React.createElement(StatusPill, {
      state: "done"
    })
  }, "10 likely interview questions with model answers.")), /*#__PURE__*/React.createElement("h2", {
    className: "section-heading"
  }, "Export CV"), /*#__PURE__*/React.createElement("p", {
    className: "section-note"
  }, "Choose a template. All templates are ATS optimized."), /*#__PURE__*/React.createElement("div", {
    className: "export-row"
  }, /*#__PURE__*/React.createElement(OptBtn, {
    variant: "primary",
    size: "sm",
    icon: "pi pi-file-pdf"
  }, "Export CV as PDF"), /*#__PURE__*/React.createElement(OptBtn, {
    variant: "primary",
    size: "sm",
    icon: "pi pi-file-word"
  }, "Export CV as DOCX")));
}
Object.assign(window, {
  OptimizationScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/OptimizationScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/UploadScreen.jsx
try { (() => {
// OptiCV app — Upload CV screen with dropzone.
const {
  Button: UploadButton,
  Callout: UploadCallout
} = window.OptiCVDesignSystem_167779;
function UploadScreen({
  onNavigate
}) {
  const [file, setFile] = React.useState(null);
  const [drag, setDrag] = React.useState(false);
  const fakeUpload = () => setFile({
    name: "Jane_Doe_CV_2026.pdf",
    size: "248 KB",
    when: "just now"
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "screen-narrow section-pad"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "page-title"
  }, "Upload your CV"), /*#__PURE__*/React.createElement("p", {
    className: "page-intro"
  }, "Upload your CV to get started with AI-powered optimization."), /*#__PURE__*/React.createElement("p", {
    className: "upload-formats"
  }, "Accepted formats: PDF, DOCX \xA0\xB7\xA0 Max size: 5 MB"), /*#__PURE__*/React.createElement("div", {
    className: "dropzone" + (drag ? " is-drag" : ""),
    onDragOver: e => {
      e.preventDefault();
      setDrag(true);
    },
    onDragLeave: () => setDrag(false),
    onDrop: e => {
      e.preventDefault();
      setDrag(false);
      fakeUpload();
    },
    onClick: fakeUpload,
    role: "button"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dropzone__icon"
  }, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-cloud-upload"
  })), /*#__PURE__*/React.createElement("p", {
    className: "dropzone__title"
  }, "Drag & drop your CV here"), /*#__PURE__*/React.createElement("p", {
    className: "dropzone__hint"
  }, "or ", /*#__PURE__*/React.createElement("span", {
    className: "text-emerald"
  }, "browse files"))), file && /*#__PURE__*/React.createElement("div", {
    className: "upload-result"
  }, /*#__PURE__*/React.createElement("p", {
    className: "upload-result__label"
  }, "Added file:"), /*#__PURE__*/React.createElement("div", {
    className: "filerow"
  }, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-file-pdf filerow__icon"
  }), /*#__PURE__*/React.createElement("div", {
    className: "filerow__meta"
  }, /*#__PURE__*/React.createElement("p", {
    className: "filerow__name"
  }, file.name), /*#__PURE__*/React.createElement("p", {
    className: "filerow__sub"
  }, file.size, " \xB7 Uploaded ", file.when)), /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check-circle filerow__ok"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(UploadCallout, {
    variant: "success"
  }, "CV uploaded and parsed successfully.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(UploadButton, {
    variant: "primary",
    icon: "pi pi-bolt",
    onClick: () => onNavigate("optimize")
  }, "Continue to optimize"), /*#__PURE__*/React.createElement(UploadButton, {
    variant: "link",
    onClick: () => setFile(null)
  }, "Remove"))));
}
Object.assign(window, {
  UploadScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/UploadScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/MarketingPage.jsx
try { (() => {
// OptiCV marketing landing page — composed from DS components.
const {
  Button: MBtn,
  StatTile: MStat,
  FeatureCard: MFeature,
  Badge: MBadge,
  Card: MCard,
  Accordion: MAccordion
} = window.OptiCVDesignSystem_167779;
const M_FEATURES = [{
  icon: "pi pi-search",
  title: "Resume Autopsy",
  text: "See exactly why an ATS might reject your CV — and how to fix every issue, ranked by severity."
}, {
  icon: "pi pi-key",
  title: "Keyword Gap Analysis",
  text: "Get a match score against the job description, with missing keywords highlighted before you apply."
}, {
  icon: "pi pi-pen-to-square",
  title: "Summary Rewrites",
  text: "Pick from three AI-generated summaries, each crafted around a different angle of your experience."
}, {
  icon: "pi pi-list-check",
  title: "Stronger Bullet Points",
  text: "Turn flat duties into achievement-led bullets using the STAR method, with metrics where they matter."
}, {
  icon: "pi pi-file-edit",
  title: "Tailored Cover Letters",
  text: "Generate cover-letter drafts written for the exact role — multiple variants to pick the voice that fits."
}, {
  icon: "pi pi-comments",
  title: "Interview Prep",
  text: "Walk in ready: 10+ likely interview questions for the role, plus pointers on how to answer each."
}];
const M_FAQ = [{
  q: "Is my CV data private?",
  a: "Yes. Your CV stays tied to your account — we don't share it, sell it, or train public AI models on it. Delete your CVs and account whenever you want."
}, {
  q: "What file formats can I upload?",
  a: "PDF and DOCX. Both are parsed automatically — no reformatting needed on your end."
}, {
  q: "How is OptiCV different from just using ChatGPT?",
  a: "OptiCV reads your actual CV, scores it against a specific job, flags ATS issues, and gives you ready-to-export documents — all in one place, no prompt engineering."
}, {
  q: "What's an ATS — and why should I care?",
  a: "An Applicant Tracking System filters CVs before a human sees them. If yours isn't formatted the way an ATS expects, you can be rejected before anyone reads a word."
}];
function MarketingHeader() {
  return /*#__PURE__*/React.createElement("header", {
    className: "m-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-container m-header__inner"
  }, /*#__PURE__*/React.createElement("a", {
    className: "m-logo"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/opticv-logo.svg",
    alt: "OptiCV",
    height: "34"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "m-nav"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#features"
  }, "Features"), /*#__PURE__*/React.createElement("a", {
    href: "#pricing"
  }, "Pricing"), /*#__PURE__*/React.createElement("a", {
    href: "#how"
  }, "How it works"), /*#__PURE__*/React.createElement("a", {
    href: "#faq"
  }, "FAQ")), /*#__PURE__*/React.createElement("div", {
    className: "m-header__cta"
  }, /*#__PURE__*/React.createElement(MBtn, {
    variant: "link"
  }, "Sign in"), /*#__PURE__*/React.createElement(MBtn, {
    variant: "primary"
  }, "Optimize my CV"))));
}
function MarketingPage() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(MarketingHeader, null), /*#__PURE__*/React.createElement("section", {
    className: "m-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-container"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "m-hero__title"
  }, /*#__PURE__*/React.createElement("strong", null, "Land more interviews"), " \u2014 one tailored CV at a time."), /*#__PURE__*/React.createElement("p", {
    className: "m-hero__lead"
  }, "AI rewrites your CV for the exact job you're chasing, so it passes ATS filters and lands on a real recruiter's desk."), /*#__PURE__*/React.createElement("p", {
    className: "m-hero__sub"
  }, "Upload your CV, paste the job ad, and get an optimized version in under 2 minutes."), /*#__PURE__*/React.createElement("div", {
    className: "m-hero__cta"
  }, /*#__PURE__*/React.createElement(MBtn, {
    variant: "primary",
    size: "lg",
    elevated: true,
    icon: "pi pi-bolt"
  }, "Optimize my CV"), /*#__PURE__*/React.createElement(MBtn, {
    variant: "neutral",
    size: "lg"
  }, "Sign in")), /*#__PURE__*/React.createElement("p", {
    className: "m-hero__micro"
  }, "Free to start \xB7 No credit card needed"), /*#__PURE__*/React.createElement("div", {
    className: "m-hero__shot"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/images/homepage-preview.jpg",
    alt: "OptiCV product preview"
  })))), /*#__PURE__*/React.createElement("section", {
    className: "m-band"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-container m-stats"
  }, /*#__PURE__*/React.createElement(MStat, {
    value: "~75%"
  }, "of CVs are rejected by ATS software before a human ever reads them."), /*#__PURE__*/React.createElement(MStat, {
    value: "7 sec"
  }, "is the average time a recruiter spends scanning a CV."), /*#__PURE__*/React.createElement(MStat, {
    value: "2\xD7"
  }, "more interview invites when a CV is tailored to the specific job."))), /*#__PURE__*/React.createElement("section", {
    id: "features",
    className: "m-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-container"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "m-h2 text-center"
  }, "Everything you need to apply with confidence."), /*#__PURE__*/React.createElement("p", {
    className: "m-sub text-center"
  }, "Built around how recruiters and ATS actually read CVs."), /*#__PURE__*/React.createElement("div", {
    className: "m-features"
  }, M_FEATURES.map(f => /*#__PURE__*/React.createElement(MFeature, {
    key: f.title,
    icon: f.icon,
    title: f.title
  }, f.text))))), /*#__PURE__*/React.createElement("section", {
    id: "pricing",
    className: "m-section m-section--alt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-container"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "m-h2 text-center"
  }, "Start free. Upgrade when you're job hunting hard."), /*#__PURE__*/React.createElement("p", {
    className: "m-sub text-center"
  }, "Cancel anytime. No catches."), /*#__PURE__*/React.createElement("div", {
    className: "m-pricing"
  }, /*#__PURE__*/React.createElement(MCard, {
    className: "m-plan"
  }, /*#__PURE__*/React.createElement("p", {
    className: "m-plan__name"
  }, "Free"), /*#__PURE__*/React.createElement("p", {
    className: "m-plan__price"
  }, "$0", /*#__PURE__*/React.createElement("span", null, "/month")), /*#__PURE__*/React.createElement("ul", {
    className: "m-plan__list"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check"
  }), "1 CV optimization per month"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check"
  }), "All core AI features"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check"
  }), "Cover letter + interview prep"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check"
  }), "PDF & DOCX export")), /*#__PURE__*/React.createElement(MBtn, {
    variant: "outline",
    size: "lg"
  }, "Get started \u2014 free")), /*#__PURE__*/React.createElement(MCard, {
    className: "m-plan m-plan--pro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-plan__badge"
  }, /*#__PURE__*/React.createElement(MBadge, {
    variant: "accent"
  }, "Most popular")), /*#__PURE__*/React.createElement("p", {
    className: "m-plan__name"
  }, "Pro"), /*#__PURE__*/React.createElement("p", {
    className: "m-plan__price"
  }, "$9", /*#__PURE__*/React.createElement("span", null, "/month")), /*#__PURE__*/React.createElement("ul", {
    className: "m-plan__list"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check"
  }), /*#__PURE__*/React.createElement("strong", null, "Unlimited"), " optimizations"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check"
  }), "All premium CV templates"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check"
  }), "Priority AI processing"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("i", {
    className: "pi pi-check"
  }), "Everything in Free")), /*#__PURE__*/React.createElement(MBtn, {
    variant: "primary",
    size: "lg",
    elevated: true
  }, "Go Pro"))))), /*#__PURE__*/React.createElement("section", {
    id: "faq",
    className: "m-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-container m-faq"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "m-h2 text-center"
  }, "Questions, answered."), /*#__PURE__*/React.createElement("div", {
    className: "m-faq__list"
  }, M_FAQ.map((f, i) => /*#__PURE__*/React.createElement(MAccordion, {
    key: i,
    title: f.q,
    defaultOpen: i === 0
  }, f.a))))), /*#__PURE__*/React.createElement("section", {
    className: "m-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-container"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "m-cta__title"
  }, "Your next interview is one upload away."), /*#__PURE__*/React.createElement("p", {
    className: "m-cta__sub"
  }, "Give your CV the edge it deserves \u2014 free to try, no credit card."), /*#__PURE__*/React.createElement(MBtn, {
    variant: "accent",
    size: "lg",
    elevated: true,
    icon: "pi pi-bolt"
  }, "Optimize my CV"))), /*#__PURE__*/React.createElement("footer", {
    className: "m-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-container m-footer__inner"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/opticv-logo.svg",
    alt: "OptiCV",
    height: "30",
    style: {
      filter: "brightness(0) invert(1)"
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "m-footer__tag"
  }, "Made for job seekers who deserve better odds.")), /*#__PURE__*/React.createElement("div", {
    className: "m-footer__cols"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Product"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Features"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Pricing"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "How it works")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Company"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "About"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Contact"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Blog")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Legal"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Privacy"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Terms"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Cookies")))), /*#__PURE__*/React.createElement("div", {
    className: "m-footer__bottom"
  }, "\xA9 2026 OptiCV. All rights reserved.")));
}
Object.assign(window, {
  MarketingPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/MarketingPage.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.FeatureCard = __ds_scope.FeatureCard;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.StepCard = __ds_scope.StepCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Callout = __ds_scope.Callout;

__ds_ns.ScoreRing = __ds_scope.ScoreRing;

__ds_ns.SeverityBadge = __ds_scope.SeverityBadge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

})();
