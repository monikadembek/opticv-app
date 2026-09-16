const { useState } = React;
const _DS = window.OptiCVDesignSystem_167779;

/* ─── Shared styles ─── */
const analysisStyles = {
  sub: { fontFamily: "var(--font-heading)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-strong)", margin: "0 0 12px" },
  body: { fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: "var(--leading-relaxed)", margin: 0 },
  issueRow: { border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "12px 16px" },
};

/* ═══════════ ATS Section ═══════════ */
const atsIssues = [
  { id: 1, severity: "critical", category: "Missing Section", title: "No professional summary", fix: "Add a 3-4 sentence professional summary highlighting React and TypeScript expertise.", impact: 9 },
  { id: 2, severity: "high", category: "Keywords", title: "Missing critical keyword: TypeScript", fix: "Add TypeScript to skills and mention it in relevant experience bullets.", impact: 7 },
  { id: 3, severity: "high", category: "Formatting", title: "Inconsistent date format", fix: "Use consistent MM/YYYY format throughout.", impact: 5 },
  { id: 4, severity: "medium", category: "Content", title: "Weak action verbs in 3 bullets", fix: "Replace 'worked on', 'helped with' with strong action verbs.", impact: 4 },
  { id: 5, severity: "low", category: "Formatting", title: "Multi-column skills section", fix: "Linearize skills into a single-column list for ATS compatibility.", impact: 3 },
];
const atsStrengths = [
  { title: "Strong technical skills", detail: "Your skills section covers 12+ relevant technologies." },
  { title: "Consistent employment history", detail: "No unexplained gaps in your work history." },
  { title: "Education well-formatted", detail: "Degree, institution, and dates are clearly presented." },
];

function ATSSection() {
  const { ScoreRing, Callout, SeverityBadge } = _DS;
  const [expandedIssue, setExpanded] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 40, justifyContent: "center", padding: "8px 0", flexWrap: "wrap" }}>
        <ScoreRing value={62} label="Current ATS Score" />
        <ScoreRing value={88} label="After Fixes" />
      </div>

      <Callout variant="warning">
        <strong>Top Priority: </strong>Add a professional summary that highlights your frontend expertise and aligns with the role requirements.
      </Callout>

      <div>
        <h4 style={analysisStyles.sub}>Summary</h4>
        <p style={analysisStyles.body}>Your CV has a solid technical foundation but lacks keyword optimization for this specific role. The absence of a professional summary is the biggest missed opportunity. Several experience bullets use passive voice and lack quantifiable achievements.</p>
      </div>

      <div>
        <h4 style={analysisStyles.sub}>Issues <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-subtle)", marginLeft: 6 }}>{atsIssues.length} found</span></h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {atsIssues.map((issue) => (
            <div key={issue.id} style={{ ...analysisStyles.issueRow, cursor: "pointer", transition: "border-color var(--duration-fast)" }}
              onClick={() => setExpanded(expandedIssue === issue.id ? null : issue.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <SeverityBadge level={issue.severity} />
                <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{issue.category}</span>
                <i className={`pi pi-chevron-${expandedIssue === issue.id ? "up" : "down"}`} style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-subtle)" }} />
              </div>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-strong)", margin: 0 }}>{issue.title}</p>
              {expandedIssue === issue.id && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 8px" }}><strong>Fix: </strong>{issue.fix}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>Impact: {issue.impact}/10</span>
                    <div style={{ flex: 1, maxWidth: 120, height: 4, borderRadius: 2, background: "var(--neutral-200)" }}>
                      <div style={{ width: `${issue.impact * 10}%`, height: "100%", borderRadius: 2, background: "var(--warning)" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 style={analysisStyles.sub}>Strengths</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {atsStrengths.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <i className="pi pi-check-circle" style={{ color: "var(--success)", marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 14, color: "var(--text-strong)" }}>{s.title}</strong>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Keyword Section ═══════════ */
const missingKw = [
  { keyword: "TypeScript", importance: "critical", required: true, placement: "Skills", rec: "Add to skills and mention in recent position bullets.", evidence: null },
  { keyword: "Design Systems", importance: "high", required: true, placement: "Experience", rec: "Describe your design system contributions.", evidence: "Built component library (related)" },
  { keyword: "Performance Optimization", importance: "high", required: false, placement: "Experience", rec: "Add specific metrics around load time improvements.", evidence: null },
  { keyword: "CI/CD", importance: "medium", required: false, placement: "Skills", rec: "Mention pipeline tools you've used.", evidence: "GitHub Actions mentioned" },
];
const matchedKw = [
  { keyword: "React", required: true, type: "exact", count: 6 },
  { keyword: "JavaScript", required: true, type: "exact", count: 4 },
  { keyword: "CSS", required: true, type: "exact", count: 3 },
  { keyword: "Git", required: false, type: "exact", count: 2 },
];

function KeywordSection() {
  const { ScoreRing, SeverityBadge, Badge, Checkbox } = _DS;
  const [selected, setSelected] = useState(["Design Systems"]);
  const toggle = (kw) => setSelected((s) => s.includes(kw) ? s.filter((k) => k !== kw) : [...s, kw]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <ScoreRing value={45} label="Keyword Match Score" />
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--text-muted)" }}>
          <span>Required: <strong style={{ color: "var(--text-strong)" }}>4/8</strong></span>
          <span>Preferred: <strong style={{ color: "var(--text-strong)" }}>3/6</strong></span>
        </div>
      </div>

      <div>
        <h4 style={analysisStyles.sub}>Missing Keywords <Badge variant="neutral">{missingKw.length}</Badge></h4>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px" }}>Select keywords to incorporate into your CV.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {missingKw.map((kw) => (
            <div key={kw.keyword} style={{ ...analysisStyles.issueRow, borderColor: selected.includes(kw.keyword) ? "var(--primary-400)" : "var(--border-subtle)", background: selected.includes(kw.keyword) ? "var(--primary-50)" : "transparent", transition: "all var(--duration-fast)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Checkbox label="" checked={selected.includes(kw.keyword)} onChange={() => toggle(kw.keyword)} />
                <SeverityBadge level={kw.importance} />
                {kw.required && <Badge variant="info">Required</Badge>}
                <strong style={{ fontSize: 14, color: "var(--text-strong)" }}>{kw.keyword}</strong>
                <span style={{ fontSize: 11, color: "var(--text-subtle)", marginLeft: "auto", background: "var(--neutral-100)", padding: "2px 8px", borderRadius: 4 }}>{kw.placement}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0" }}>{kw.rec}</p>
              {kw.evidence && <p style={{ fontSize: 12, color: "var(--text-subtle)", margin: "4px 0 0", fontStyle: "italic", borderLeft: "2px solid var(--border-subtle)", paddingLeft: 8 }}>{kw.evidence}</p>}
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="pi pi-check-circle" /> {selected.length} keyword(s) selected — will be added to your exported CV.
          </p>
        )}
      </div>

      <div>
        <h4 style={analysisStyles.sub}>Matched Keywords <Badge variant="neutral">{matchedKw.length}</Badge></h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {matchedKw.map((kw) => (
            <div key={kw.keyword} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
              <i className="pi pi-check-circle" style={{ color: "var(--success)", fontSize: 14 }} />
              {kw.required && <Badge variant="info">Required</Badge>}
              <span style={{ fontSize: 14, color: "var(--text-strong)" }}>{kw.keyword}</span>
              <span style={{ fontSize: 12, color: "var(--text-subtle)", marginLeft: "auto" }}>x{kw.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Summary Section ═══════════ */
const summaryVariants = [
  { angle: "results_driven", label: "Results-Driven", text: "Senior Frontend Developer with 6+ years building high-performance web apps using React and modern JavaScript. Led development of a component library serving 40+ developers, reducing UI development time by 35%. Passionate about clean architecture, accessibility, and delivering measurable business impact.", note: "Leads with impact metrics — ideal for senior roles.", keywords: ["React", "JavaScript", "component library", "accessibility"], wordCount: 42 },
  { angle: "technical_depth", label: "Technical Depth", text: "Frontend engineer specializing in React ecosystem architecture, state management, and design system development. 6 years of hands-on experience with TypeScript, CSS-in-JS, and performance optimization across enterprise-scale applications.", note: "Emphasizes technical expertise — good for engineering-heavy teams.", keywords: ["React", "TypeScript", "design system", "performance optimization"], wordCount: 38 },
];

function SummarySection() {
  const { Badge } = _DS;
  const [selectedAngle, setAngle] = useState("results_driven");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h4 style={analysisStyles.sub}>Your Original Summary</h4>
        <p style={{ fontSize: 13, color: "var(--text-subtle)", fontStyle: "italic", margin: 0 }}>Your CV had no summary — here are two options to add one.</p>
      </div>

      <div style={{ borderRadius: "var(--radius-md)", background: "var(--neutral-50)", border: "1px solid var(--border-subtle)", padding: "12px 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", letterSpacing: "0.05em", margin: "0 0 4px" }}>Why the recommended variant?</p>
        <p style={{ fontSize: 13, color: "var(--text-body)", margin: 0 }}>The results-driven variant best matches this role's emphasis on measurable impact and technical leadership.</p>
      </div>

      <div>
        <h4 style={analysisStyles.sub}>Rewritten Variants</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {summaryVariants.map((v) => (
            <div key={v.angle} onClick={() => setAngle(v.angle)} style={{ border: selectedAngle === v.angle ? "2px solid var(--primary-500)" : "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 20, cursor: "pointer", transition: "all var(--duration-fast)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)", marginBottom: 12 }}>
                <input type="radio" name="summary" checked={selectedAngle === v.angle} readOnly style={{ accentColor: "var(--primary-600)" }} />
                <Badge variant="neutral">{v.label}</Badge>
                {v.angle === "results_driven" && <Badge variant="soft">Recommended</Badge>}
                <span style={{ fontSize: 12, color: "var(--text-subtle)", marginLeft: "auto" }}>{v.wordCount} words</span>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-strong)", lineHeight: 1.6, margin: "0 0 10px" }}>{v.text}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: "0 0 10px" }}>{v.note}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {v.keywords.map((k) => <span key={k} style={{ fontSize: 12, background: "var(--primary-50)", color: "var(--primary-700)", padding: "2px 8px", borderRadius: 4 }}>{k}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Bullet Section ═══════════ */
const bulletData = [
  { orig: "Worked on the main product dashboard using React", rewritten: "Architected and delivered a real-time analytics dashboard in React, serving 15K+ daily active users and reducing page load time by 40%", weakness: "Vague — 'worked on' lacks ownership and impact", keywords: ["React", "analytics"] },
  { orig: "Helped with the migration from Angular to React", rewritten: "Led a 6-month migration of 120+ components from Angular to React, mentoring 4 junior developers and maintaining 99.9% uptime", weakness: "'Helped with' diminishes your contribution", keywords: ["React", "Angular"] },
  { orig: "Built unit tests for components", rewritten: "Established a comprehensive testing strategy achieving 85% code coverage across 200+ React components using Jest and RTL", weakness: "Too brief — no scale or methodology", keywords: ["React", "testing"] },
];

function BulletSection() {
  const { Checkbox } = _DS;
  const [selected, setSelected] = useState([0]);
  const toggle = (i) => setSelected((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ ...analysisStyles.sub, margin: 0 }}>Frontend Developer at WebDev Inc.</h4>
        <span style={{ fontSize: 13, color: "var(--text-subtle)" }}>Jan 2021 — Present</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {bulletData.map((b, i) => (
          <div key={i} style={{ border: `1px solid ${selected.includes(i) ? "var(--primary-400)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-md)", padding: 16, transition: "border-color var(--duration-fast)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Checkbox label="" checked={selected.includes(i)} onChange={() => toggle(i)} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Rewritten version:</span>
                </div>
                <p style={{ fontSize: 14, color: "var(--text-strong)", lineHeight: 1.5, margin: "0 0 8px" }}>{b.rewritten}</p>
                <p style={{ fontSize: 13, color: "var(--text-subtle)", margin: "0 0 6px" }}><strong>Original: </strong>{b.orig}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 6px" }}><strong>Weakness: </strong>{b.weakness}</p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Keywords:</span>
                  {b.keywords.map((k) => <span key={k} style={{ fontSize: 11, background: "var(--neutral-100)", color: "var(--text-muted)", padding: "2px 6px", borderRadius: 4 }}>{k}</span>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border-subtle)", fontSize: 13 }}>
        <i className="pi pi-check-circle" style={{ color: "var(--success)" }} />
        <span style={{ color: "var(--text-body)" }}>Good verb variety — 8 unique verbs across 6 bullets</span>
      </div>
    </div>
  );
}

Object.assign(window, { ATSSection, KeywordSection, SummarySection, BulletSection });
