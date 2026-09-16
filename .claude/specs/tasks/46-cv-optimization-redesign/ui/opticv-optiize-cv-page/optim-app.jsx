const { useState, useEffect, useCallback, useMemo, useRef } = React;
const { TweaksPanel, useTweaks, TweakSection, TweakRadio } = window;
const { Avatar } = window.OptiCVDesignSystem_167779;

/* ─── Section Config ─── */
const SECTIONS = [
{ id: "ats", icon: "pi-chart-bar", title: "ATS Analysis", Component: window.ATSSection },
{ id: "keywords", icon: "pi-key", title: "Keyword Gap Analysis", Component: window.KeywordSection },
{ id: "summary", icon: "pi-pen-to-square", title: "Summary Rewrite", Component: window.SummarySection },
{ id: "bullets", icon: "pi-list-check", title: "Bullet Upgrades", Component: window.BulletSection },
{ id: "cover-letter", icon: "pi-file-edit", title: "Cover Letter", Component: window.CoverLetterSection },
{ id: "interview", icon: "pi-comments", title: "Interview Prep", Component: window.InterviewSection },
{ id: "linkedin", icon: "pi-link", title: "LinkedIn Updates", Component: window.LinkedInSection },
{ id: "export", icon: "pi-download", title: "Export CV", Component: window.ExportSection }];


/* ─── Status maps per state ─── */
const STATUS_MAP = {
  initial: {},
  processing: { ats: "completed", keywords: "completed", summary: "processing", bullets: "processing", "cover-letter": "processing", interview: "processing", linkedin: "pending", export: "pending" },
  completed: { ats: "completed", keywords: "completed", summary: "completed", bullets: "completed", "cover-letter": "completed", interview: "completed", linkedin: "completed", export: "completed" }
};

/* ═══════════ App Header ═══════════ */
function AppHeader() {
  return (
    <header className="app-header">
      <a className="app-header__logo" href="#">
        <img src="assets/opticv-logo-icon.svg" alt="OptiCV" />
        <span>Opti<b>CV</b></span>
      </a>
      <nav className="app-header__nav">
        <span className="app-header__link">Dashboard</span>
        <span className="app-header__link active">Optimization</span>
        <span className="app-header__link">Settings</span>
        <Avatar label="JD" size="sm" />
      </nav>
    </header>);

}

/* ═══════════ Mobile Tabs ═══════════ */
function MobileTabs({ activeSection, onSectionClick, statuses }) {
  const allItems = window.NAV_GROUPS.flatMap((g) => g.items);
  const tabsRef = useRef(null);
  
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeEl = tabsRef.current.querySelector('.mobile-tab.active');
    if (activeEl) {
      const container = tabsRef.current;
      const scrollLeft = activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeSection]);

  return (
    <div className="mobile-tabs" ref={tabsRef}>
      {allItems.map((item) =>
      <button key={item.id} className={`mobile-tab${activeSection === item.id ? " active" : ""}`} onClick={() => onSectionClick(item.id)}>
          <i className={`pi ${item.icon}`} />
          <span>{item.label.split(" ")[0]}</span>
        </button>
      )}
    </div>);
}

/* ═══════════ Main App ═══════════ */
const TWEAK_DEFAULTS = {
  layoutMode: "scroll",
  exportPlacement: "footer",
  pageState: "completed"
};

function OptimApp() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [activeSection, setActiveSection] = useState("ats");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const mainRef = useRef(null);

  const statuses = STATUS_MAP[tweaks.pageState] || {};
  const isInitial = tweaks.pageState === "initial";
  const showExportFooter = tweaks.exportPlacement === "footer" && tweaks.pageState === "completed";

  /* ─── Scrollspy for scroll mode ─── */
  useEffect(() => {
    if (tweaks.layoutMode !== "scroll" || isInitial) return;
    let observer;
    const timer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.dataset.section);
            }
          }
        },
        { rootMargin: "-30% 0px -50% 0px" }
      );
      document.querySelectorAll("[data-section]").forEach((el) => observer.observe(el));
    }, 300);
    return () => {clearTimeout(timer);if (observer) observer.disconnect();};
  }, [tweaks.layoutMode, tweaks.pageState]);

  /* ─── Handle section click ─── */
  const handleSectionClick = useCallback((id) => {
    setActiveSection(id);
    if (tweaks.layoutMode === "scroll") {
      const el = document.getElementById(`section-${id}`);
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  }, [tweaks.layoutMode]);

  /* ─── Sections to show ─── */
  const visibleSections = useMemo(() => {
    let sections = SECTIONS;
    if (tweaks.exportPlacement === "footer") {
      sections = sections.filter((s) => s.id !== "export");
    }
    return sections;
  }, [tweaks.exportPlacement]);

  /* ─── Render sections ─── */
  const renderSections = () => {
    if (tweaks.layoutMode === "tabs") {
      const section = visibleSections.find((s) => s.id === activeSection) || visibleSections[0];
      const status = statuses[section.id];
      return (
        <SectionCard id={section.id} icon={section.icon} title={section.title} status={status}>
          {status !== "pending" && <section.Component />}
          {status === "pending" && <ProcessingPlaceholder />}
        </SectionCard>);

    }
    return visibleSections.map((section) => {
      const status = statuses[section.id];
      return (
        <SectionCard key={section.id} id={section.id} icon={section.icon} title={section.title} status={status}>
          {status !== "pending" && status !== "processing" && <section.Component />}
        </SectionCard>);

    });
  };

  const sidebarWidth = sidebarExpanded ? 280 : 72;

  return (
    <>
      <AppHeader />

      {/* Mobile tabs */}
      {!isInitial &&
      <MobileTabs activeSection={activeSection} onSectionClick={handleSectionClick} statuses={statuses} />
      }

      <div className="optim-layout">
        {/* Sidebar (desktop) */}
        <OptimSidebar
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          pageState={tweaks.pageState}
          statuses={statuses}
          atsScore={tweaks.pageState !== "initial" ? 62 : null}
          keywordScore={tweaks.pageState !== "initial" ? 45 : null} />
        

        {/* Main content */}
        <main className="optim-main" ref={mainRef}>
          <div className="optim-content">
            {isInitial ?
            <InitialUploadForm /> :

            <>
                <JobInfoBanner />
                {renderSections()}
                {showExportFooter && <div style={{ height: 64 }} />}
              </>
            }
          </div>
        </main>
      </div>

      {/* Export footer */}
      {showExportFooter && <ExportFooter sidebarWidth={sidebarWidth} />}

      {/* Tweaks Panel */}
      <TweaksPanel>
        <TweakSection label="Page state" />
        <TweakRadio label="State" value={tweaks.pageState} options={["initial", "processing", "completed"]} onChange={(v) => setTweak("pageState", v)} />
      </TweaksPanel>
    </>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<OptimApp />);