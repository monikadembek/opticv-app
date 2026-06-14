const { useState } = React;
const _DS2 = window.OptiCVDesignSystem_167779;

/* ═══════════ Section Card Wrapper ═══════════ */
function SectionCard({ id, icon, title, status, children }) {
  return (
    <div id={`section-${id}`} className="section-card" data-section={id}>
      <div className="section-card__header">
        <div className="section-card__icon"><i className={`pi ${icon}`} /></div>
        <h2 className="section-card__title">{title}</h2>
        {status === "completed" && <span className="ocv-pill ocv-pill--success" style={{ fontSize: 11 }}>Completed</span>}
        {status === "processing" &&
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--warning)", fontSize: 13, fontWeight: 600 }}>
            <i className="pi pi-spin pi-spinner" />Processing
          </span>
        }
      </div>
      <div className="section-card__body">
        {status === "processing" ? <ProcessingPlaceholder /> : children}
      </div>
    </div>);

}

/* ═══════════ Processing Placeholder ═══════════ */
function ProcessingPlaceholder() {
  return (
    <div className="processing-state">
      <i className="pi pi-spin pi-spinner" />
      <p>Analyzing your resume...</p>
      <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        <div className="skeleton" style={{ width: "100%", height: 12 }} />
        <div className="skeleton" style={{ width: "75%", height: 12 }} />
        <div className="skeleton" style={{ width: "90%", height: 12 }} />
      </div>
    </div>);

}

/* ═══════════ Job Info Banner ═══════════ */
function JobInfoBanner() {
  const [showDesc, setShowDesc] = useState(false);
  return (
    <div className="job-banner">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="pi pi-folder" style={{ color: "var(--primary-600)", fontSize: 18 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-strong)", margin: 0 }}>Senior Frontend Developer</h3>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>at TechCorp Solutions</span>
          </div>
          <button onClick={() => setShowDesc(!showDesc)} style={{ background: "none", border: "none", padding: 0, marginTop: 6, cursor: "pointer", fontSize: 13, color: "var(--primary-600)", fontFamily: "var(--font-body)" }}>
            <i className="pi pi-file" style={{ marginRight: 4, fontSize: 12 }} />JaneDoe_CV_2024.pdf &middot; <span style={{ textDecoration: "underline" }}>{showDesc ? "Hide" : "View"} job description</span>
          </button>
          {showDesc &&
          <p style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.6, marginTop: 10, padding: 12, background: "var(--neutral-50)", borderRadius: "var(--radius-md)" }}>
              We are looking for a Senior Frontend Developer to join our team. You will be responsible for building and maintaining web applications using React, TypeScript, and modern CSS. The ideal candidate has 5+ years of experience with frontend technologies, strong understanding of web performance optimization, and experience with design systems.
            </p>
          }
        </div>
      </div>
    </div>);

}

/* ═══════════ Cover Letter Section ═══════════ */
const clVariants = [
{ hook: "Story", angle: "Opens with a compelling project narrative", bestFor: "Culture-fit roles", words: 285, keywords: ["React", "TypeScript", "design systems"] },
{ hook: "Direct", angle: "Gets straight to qualifications", bestFor: "Large structured companies", words: 260, keywords: ["React", "JavaScript", "CI/CD"] }];


function CoverLetterSection() {
  const { Badge, Button } = _DS2;
  const [sel, setSel] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h4 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 4px" }}>Recommendation</h4>
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>The story-driven approach works best for senior roles where culture fit matters alongside technical skills.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {clVariants.map((v, i) =>
        <div key={i} style={{ border: sel === i ? "2px solid var(--primary-500)" : "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", transition: "all var(--duration-fast)" }} onClick={() => setSel(i)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingBottom: 8, borderBottom: "1px solid var(--border-subtle)" }}>
              <Badge variant="neutral">{v.hook}</Badge>
              {i === 0 && <Badge variant="soft">Recommended</Badge>}
              <span style={{ fontSize: 12, color: "var(--text-subtle)", marginLeft: "auto" }}>{v.words} words</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>{v.angle}</p>
            <p style={{ fontSize: 12, color: "var(--text-body)", margin: 0 }}><strong>Best for:</strong> {v.bestFor}</p>
            <div style={{ marginTop: "auto", paddingTop: 8 }}>
              <Button variant={sel === i ? "primary" : "outline"} style={{ width: "100%" }}>{sel === i ? "Selected" : "Use this version"}</Button>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button variant="primary" icon="pi pi-file-pdf">Export to PDF</Button>
        <Button variant="outline" icon="pi pi-file">Export to DOCX</Button>
      </div>
    </div>);

}

/* ═══════════ Interview Section ═══════════ */
const interviewQs = [
{ q: "Tell me about a time you had to optimize a slow React application.", cat: "Technical", likelihood: "Very Likely", assessing: "Deep React performance knowledge", answer: "At WebDev Inc., our dashboard loaded in 4.2s. I profiled with React DevTools, identified unnecessary re-renders, implemented React.memo and virtualization, bringing load time to 1.8s — a 57% improvement.", traps: ["Don't say 'I used React.memo everywhere'", "Avoid vague answers without metrics"] },
{ q: "How do you approach building a design system from scratch?", cat: "System Design", likelihood: "Likely", assessing: "Architecture thinking", answer: "Start with an audit of existing UI patterns, define design tokens as a shared contract, build atomic components, use Storybook for documentation, and establish semantic versioning.", traps: ["Don't jump to implementation without mentioning design collaboration"] },
{ q: "Why are you leaving your current position?", cat: "Behavioral", likelihood: "Very Likely", assessing: "Motivation and fit", answer: "I've grown significantly and I'm looking for a role where I can have larger impact on architecture decisions and mentor a growing team — exactly what this role offers.", traps: ["Never speak negatively about current employer"] }];


function InterviewSection() {
  const { Badge } = _DS2;
  const [expanded, setExpanded] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <_DS2.Button variant="outline" icon="pi pi-file-pdf">Export to PDF</_DS2.Button>
        <_DS2.Button variant="outline" icon="pi pi-file">Export to DOCX</_DS2.Button>
      </div>
      {interviewQs.map((q, i) =>
      <div key={i} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <div onClick={() => setExpanded(expanded === i ? -1 : i)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "var(--text-subtle)", fontSize: 13 }}>Q{i + 1}</span>
              <Badge variant="neutral">{q.cat}</Badge>
              <Badge variant="soft">{q.likelihood}</Badge>
              <i className={`pi pi-chevron-${expanded === i ? "up" : "down"}`} style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-subtle)" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-strong)", margin: 0 }}>{q.q}</p>
          </div>
          {expanded === i &&
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border-subtle)" }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "12px 0 8px" }}><strong>Assessing:</strong> <em>{q.assessing}</em></p>
              <div style={{ background: "var(--neutral-50)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 12 }}>
                <p style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.6, margin: 0 }}>{q.answer}</p>
              </div>
              {q.traps.length > 0 &&
          <div style={{ background: "var(--critical-bg)", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", padding: 12, marginTop: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--critical)", margin: "0 0 4px" }}>Traps to avoid</p>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#dc2626" }}>
                    {q.traps.map((t, ti) => <li key={ti}>{t}</li>)}
                  </ul>
                </div>
          }
            </div>
        }
        </div>
      )}
      <div>
        <h4 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 8px" }}>Preparation Tips</h4>
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {["Review TechCorp's recent blog posts and open-source contributions", "Prepare 2-3 examples of performance optimizations with metrics", "Be ready to discuss TypeScript in production", "Practice explaining technical concepts to non-technical stakeholders"].map((tip, i) =>
          <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-body)" }}>
              <i className="pi pi-check" style={{ color: "var(--success)", marginTop: 2, flexShrink: 0 }} /><span>{tip}</span>
            </li>
          )}
        </ul>
      </div>
    </div>);

}

/* ═══════════ LinkedIn Section ═══════════ */
function LinkedInSection() {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-subtle)" }}>
      <i className="pi pi-link" style={{ fontSize: 32, marginBottom: 12, display: "block" }} />
      <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Coming soon</p>
      <p style={{ fontSize: 13, margin: 0 }}>LinkedIn profile optimization is being developed.</p>
    </div>);

}

/* ═══════════ Export Section ═══════════ */
const templates = [
{ id: "ats", name: "ATS Classic", desc: "Clean and ATS-friendly", color: "var(--primary-600)" },
{ id: "modern", name: "Modern", desc: "Contemporary with sidebar", color: "#6366f1" },
{ id: "executive", name: "Executive", desc: "Polished and minimal", color: "var(--neutral-700)" }];


function CvPreviewModal({ open, onClose, templateId }) {
  if (!open) return null;
  const tpl = templates.find((t) => t.id === templateId) || templates[0];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)" }} />
      <div style={{ position: "relative", background: "white", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", width: "90%", maxWidth: 680, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, color: "var(--text-strong)", margin: 0 }}>{tpl.name} — Preview</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <i className="pi pi-times" style={{ fontSize: 16, color: "var(--text-muted)" }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--neutral-50)" }}>
          <div style={{ background: "white", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)", padding: "40px 48px", maxWidth: 595, margin: "0 auto", minHeight: 500 }}>
            <div style={{ height: 4, background: tpl.color, borderRadius: 2, marginBottom: 24 }} />
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 4px" }}>Jane Doe</h2>
            <p style={{ fontSize: 13, color: tpl.color, fontWeight: 600, margin: "0 0 16px" }}>Senior Frontend Developer</p>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", marginBottom: 20, flexWrap: "wrap" }}>
              <span><i className="pi pi-envelope" style={{ marginRight: 4, fontSize: 11 }} />jane.doe@email.com</span>
              <span><i className="pi pi-phone" style={{ marginRight: 4, fontSize: 11 }} />+1 555-0123</span>
              <span><i className="pi pi-map-marker" style={{ marginRight: 4, fontSize: 11 }} />San Francisco, CA</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: tpl.color, margin: "0 0 8px" }}>Professional Summary</h4>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-body)", margin: 0 }}>Senior Frontend Developer with 6+ years building high-performance web apps using React and modern JavaScript. Led development of a component library serving 40+ developers, reducing UI development time by 35%.</p>
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: tpl.color, margin: "0 0 8px" }}>Experience</h4>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: "var(--text-strong)" }}>Frontend Developer — WebDev Inc.</strong>
                  <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>Jan 2021 — Present</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.8, color: "var(--text-body)" }}>
                  <li>Architected and delivered a real-time analytics dashboard in React, serving 15K+ daily active users</li>
                  <li>Led a 6-month migration of 120+ components from Angular to React</li>
                  <li>Established testing strategy achieving 85% coverage across 200+ components</li>
                </ul>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: tpl.color, margin: "0 0 8px" }}>Skills</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["React", "TypeScript", "JavaScript", "CSS", "Design Systems", "Performance Optimization", "Git", "CI/CD"].map((s) => <span key={s} style={{ fontSize: 11, background: "var(--neutral-100)", color: "var(--text-body)", padding: "3px 8px", borderRadius: 4 }}>{s}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}

function ExportSection() {
  const { Button } = _DS2;
  const [selTpl, setSelTpl] = useState("ats");
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h4 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 4px" }}>Choose template</h4>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px" }}>All templates are ATS optimized.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {templates.map((t) =>
          <div key={t.id} style={{ width: 150, border: selTpl === t.id ? "2px solid var(--primary-500)" : "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 12, cursor: "pointer", transition: "all var(--duration-fast)", background: selTpl === t.id ? "var(--primary-50)" : "white", position: "relative" }}>
              <div onClick={() => setSelTpl(t.id)}>
                <div style={{ width: "100%", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: 6, background: t.color }} />
                  <div style={{ height: 28, background: "var(--neutral-50)", padding: "4px 6px" }}>
                    <div style={{ height: 3, width: "60%", borderRadius: 2, background: t.color + "33", marginBottom: 3 }} />
                    <div style={{ height: 2, width: "80%", borderRadius: 2, background: "var(--neutral-200)", marginBottom: 2 }} />
                    <div style={{ height: 2, width: "65%", borderRadius: 2, background: "var(--neutral-200)" }} />
                  </div>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)", margin: "0 0 2px" }}>{t.name}</p>
                <p style={{ fontSize: 11, color: "var(--text-subtle)", margin: 0 }}>{t.desc}</p>
              </div>
              {selTpl === t.id && <i className="pi pi-check-circle" style={{ position: "absolute", top: 8, right: 8, color: "var(--primary-600)", fontSize: 14 }} />}
              <Button variant="outline" icon="pi pi-eye" style={{ width: "100%", marginTop: 10 }} onClick={(e) => {e.stopPropagation();setSelTpl(t.id);setPreviewOpen(true);}}>Preview</Button>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Button variant="primary" icon="pi pi-file-pdf">Export CV as PDF</Button>
        <Button variant="outline" icon="pi pi-file">Export CV as DOCX</Button>
      </div>
      <CvPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} templateId={selTpl} />
    </div>);

}

/* ═══════════ Export Footer ═══════════ */
function ExportFooter({ sidebarWidth }) {
  const { Button } = _DS2;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selTpl, setSelTpl] = useState("ats");
  return (
    <>
      <div className="export-footer" style={{ left: sidebarWidth }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: 0 }}>
          <i className="pi pi-palette" style={{ color: "var(--primary-600)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-strong)" }}>Template:</span>
          <select value={selTpl} onChange={(e) => setSelTpl(e.target.value)} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "4px 8px", fontSize: 13, fontFamily: "var(--font-body)" }}>
            <option value="ats">ATS Classic</option><option value="modern">Modern</option><option value="executive">Executive</option>
          </select>
        </div>
        <Button variant="outline" icon="pi pi-eye" onClick={() => setPreviewOpen(true)}>Preview</Button>
        <Button variant="primary" icon="pi pi-file-pdf">Export PDF</Button>
        <Button variant="outline" icon="pi pi-file">Export DOCX</Button>
      </div>
      <CvPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} templateId={selTpl} />
    </>);

}

/* ═══════════ Initial Upload Form ═══════════ */
function InitialUploadForm() {
  const { Button, Input } = _DS2;
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-3xl)", fontWeight: 700, color: "var(--text-strong)", margin: "0 0 8px" }}>CV Optimization</h2>
        <p style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", margin: 0 }}>Select your CV and paste the job description to start.</p>
      </div>
      <div className="job-banner" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="ocv-field">
          <label className="ocv-label">Select CV</label>
          <select className="ocv-input" style={{ height: 40 }}>
            <option>JaneDoe_CV_2024.pdf</option>
            <option>JaneDoe_CV_v2.docx</option>
          </select>
        </div>
        <Input label="Company name" placeholder="Enter company name" />
        <Input label="Job title" placeholder="Enter job title" />
        <Input label="Job description" multiline rows={6} placeholder="Paste the job description here..." />
        <Input label="Notes (optional)" multiline rows={3} placeholder="Any additional notes" />
        <Button variant="primary" icon="pi pi-bolt" style={{ alignSelf: "flex-start" }}>Start optimization process</Button>
      </div>
    </div>);

}

Object.assign(window, { SectionCard, ProcessingPlaceholder, JobInfoBanner, CoverLetterSection, InterviewSection, LinkedInSection, ExportSection, ExportFooter, InitialUploadForm });