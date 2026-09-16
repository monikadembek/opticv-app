const { useState } = React;

const NAV_GROUPS = [
{ group: "Resume Analysis", items: [
  { id: "ats", icon: "pi-chart-bar", label: "ATS Analysis" },
  { id: "keywords", icon: "pi-key", label: "Keyword Gap" },
  { id: "summary", icon: "pi-pen-to-square", label: "Summary Rewrite" },
  { id: "bullets", icon: "pi-list-check", label: "Bullet Upgrades" }]
},
{ group: "Additional Materials", items: [
  { id: "cover-letter", icon: "pi-file-edit", label: "Cover Letter" },
  { id: "interview", icon: "pi-comments", label: "Interview Prep" },
  { id: "linkedin", icon: "pi-link", label: "LinkedIn Updates" }]
}];


function MiniScore({ value, label }) {
  const color = value >= 70 ? "var(--success)" : value >= 40 ? "var(--warning)" : "var(--critical)";
  const pct = Math.min(value, 100);
  const r = 18,circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--neutral-200)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ - circ * pct / 100}
        transform="rotate(-90 24 24)" style={{ transition: "stroke-dashoffset 600ms var(--ease-standard)" }} />
        <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
        fontSize="13" fontWeight="700" fill={color} fontFamily="var(--font-heading)">
          {value}{label === "Keywords" ? "%" : ""}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
    </div>);

}

function StatusIcon({ status }) {
  if (status === "completed") return <i className="pi pi-check-circle" style={{ color: "var(--success)", fontSize: 14 }} />;
  if (status === "processing") return <i className="pi pi-spin pi-spinner" style={{ color: "var(--warning)", fontSize: 14 }} />;
  if (status === "error") return <i className="pi pi-times-circle" style={{ color: "var(--critical)", fontSize: 14 }} />;
  if (status === "pending") return <i className="pi pi-circle" style={{ color: "var(--neutral-300)", fontSize: 12 }} />;
  return null;
}

function OptimSidebar({ activeSection, onSectionClick, expanded, onToggle, pageState, statuses, atsScore, keywordScore }) {
  const showScores = pageState !== "initial" && expanded && atsScore != null;
  const isInitial = pageState === "initial";

  return (
    <aside className={`optim-sidebar${expanded ? "" : " collapsed"}`}>
      {showScores &&
      <div className="sidebar-scores">
          <MiniScore value={atsScore} label="ATS" />
          <MiniScore value={keywordScore} label="Keywords" />
        </div>
      }

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group, gi) =>
        <div key={gi}>
            {group.group && expanded && <div className="sidebar-group-label">{group.group}</div>}
            {!expanded && gi > 0 && <div className="sidebar-divider" />}
            {group.items.map((item) =>
          <button
            key={item.id}
            className={`nav-item${activeSection === item.id ? " active" : ""}${isInitial ? " dimmed" : ""}`}
            onClick={() => !isInitial && onSectionClick(item.id)}
            title={!expanded ? item.label : undefined}>
            
                <div className="nav-item__icon">
                  <i className={`pi ${item.icon}`} />
                </div>
                {expanded && <span className="nav-item__label">{item.label}</span>}
                {expanded && statuses[item.id] &&
            <span className="nav-item__status"><StatusIcon status={statuses[item.id]} /></span>
            }
              </button>
          )}
          </div>
        )}
      </nav>

      <div className="sidebar-toggle">
        <button onClick={onToggle} aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}>
          <i className={`pi ${expanded ? "pi-chevron-left" : "pi-chevron-right"}`} />
          {expanded && <span>Collapse</span>}
        </button>
      </div>
    </aside>);

}

Object.assign(window, { OptimSidebar, NAV_GROUPS, MiniScore, StatusIcon });