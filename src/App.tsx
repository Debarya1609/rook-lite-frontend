import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Clock3,
  GitCompareArrows,
  LogOut,
  Menu,
  Radar,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import "./App.css";
import AnalysisView from "./AnalysisView";
import HistoryPage, { type HistoryAnalysis } from "./HistoryPage";

type AnalysisSection = {
  id?: string;
  title?: string;
  insights?: string[];
};

type Verdicts = {
  marketing?: string;
  strategic?: string;
};

type Score = {
  value?: number;
  reasoning?: string;
};

export type AnalysisResult = {
  id?: string;
  createdAt?: number;
  asset_type?: string;
  overview?: string;
  target_audience?: string;
  sections?: AnalysisSection[];
  verdicts?: Verdicts;
  score?: Score;
};

const HISTORY_KEY = "rook-lite-history-v2";
const SCAN_MODES = [
  "Full Page Scan",
  "SEO Audit",
  "Messaging Audit",
  "Funnel Audit",
  "Tone & Persona Check",
] as const;

const CREATE_OPTIONS = [
  "Generate Campaign Kit",
  "Social Media Posts",
  "Ad Copy Variants",
  "Email Sequence",
  "Repurpose Content",
] as const;

type Mode = "scan" | "create" | "compare" | null;
type GearAction = "history" | "profile" | "settings" | "logout";

function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryAnalysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logoMissing, setLogoMissing] = useState(false);

  const [activeMode, setActiveMode] = useState<Mode>(null);
  const [hoveredMode, setHoveredMode] = useState<Mode | null>(null);
  const [scanSubMode, setScanSubMode] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isGearOpen, setIsGearOpen] = useState(false);
  const [isScanMenuOpen, setIsScanMenuOpen] = useState(false);

  const [activeView, setActiveView] = useState<"home" | "history" | "analysis">("home");
  const [analysisBackView, setAnalysisBackView] = useState<"home" | "history">("home");
  const [homeResult, setHomeResult] = useState<string | null>(null);
  const [currentPageUrl, setCurrentPageUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [hoveredGearItem, setHoveredGearItem] = useState<GearAction | null>(null);

  const gearRef = useRef<HTMLDivElement | null>(null);
  const scanHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storedV2 = localStorage.getItem(HISTORY_KEY);
    if (storedV2) {
      setHistory(JSON.parse(storedV2));
      return;
    }

    const oldStored = localStorage.getItem("rook-lite-history");
    if (oldStored) {
      const parsed = JSON.parse(oldStored) as AnalysisResult[];
      const migrated = parsed.map((item, index) => ({
        ...item,
        id: `migrated-${Date.now()}-${index}`,
        createdAt: Date.now() - index,
      }));
      setHistory(migrated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(migrated));
    }
  }, []);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (
        isGearOpen &&
        gearRef.current &&
        !gearRef.current.contains(event.target as Node)
      ) {
        setIsGearOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [isGearOpen]);

  useEffect(() => {
    return () => {
      if (scanHoverTimerRef.current) {
        clearTimeout(scanHoverTimerRef.current);
      }
    };
  }, []);

  const deleteHistoryByIds = (ids: string[]) => {
    const updated = history.filter((item) => !ids.includes(item.id));
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const openAnalysisFromHistory = (item: HistoryAnalysis) => {
    setAnalysis(item);
    setAnalysisBackView("history");
    setActiveView("analysis");
    setError(null);
  };

  const handleScanEnter = () => {
    if (scanHoverTimerRef.current) {
      clearTimeout(scanHoverTimerRef.current);
    }
    setIsScanMenuOpen(true);
  };

  const handleScanLeave = () => {
    scanHoverTimerRef.current = setTimeout(() => {
      setIsScanMenuOpen(false);
    }, 120);
  };

  const handleScanModeSelect = (mode: string) => {
    setActiveMode("scan");
    setScanSubMode(mode);
    setHomeResult(`Running: ${mode}`);
    setIsScanMenuOpen(false);
    setError(null);
  };

  const openCreateModal = () => {
    setActiveMode("create");
    setIsCreateModalOpen(true);
    setError(null);
  };

  const openCompareModal = async () => {
    setActiveMode("compare");
    setIsCompareModalOpen(true);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setCurrentPageUrl(tab?.url ?? "");
    } catch {
      setCurrentPageUrl("");
    }
  };

  const runCreateOption = (option: string) => {
    setHomeResult(`Create action: ${option}`);
    setIsCreateModalOpen(false);
  };

  const runComparison = () => {
    setHomeResult(
      `Comparison requested${currentPageUrl ? ` for ${currentPageUrl}` : ""}${
        competitorUrl ? ` vs ${competitorUrl}` : ""
      }.`
    );
    setIsCompareModalOpen(false);
  };

  const handleGearAction = (action: GearAction) => {
    setIsGearOpen(false);

    if (action === "history") {
      setActiveView("history");
      return;
    }
    if (action === "profile") {
      setError("Profile page will be added next.");
      return;
    }
    if (action === "settings") {
      setError("Settings page will be added next.");
      return;
    }
    setError("Logout action will be connected with auth.");
  };

  if (activeView === "history") {
    return (
      <div className="home-bg">
        <div className="home-card">
          <HistoryPage
            history={history}
            onGoBack={() => setActiveView("home")}
            onDeleteMany={deleteHistoryByIds}
            onOpenAnalysis={openAnalysisFromHistory}
          />
        </div>
      </div>
    );
  }

  if (activeView === "analysis" && analysis) {
    return (
      <div className="panel-bg">
        <div className="panel-card">
          <AnalysisView analysis={analysis} onGoBack={() => setActiveView(analysisBackView)} />
        </div>
      </div>
    );
  }

  return (
    <div className="home-bg">
      <div className="home-card">
        <div className="home-top-row">
          <button
            className="home-logo-icon-btn"
            type="button"
            title="Rook Lite"
            onClick={() => {
              setActiveMode(null);
              setScanSubMode("");
              setError(null);
              setHomeResult(null);
            }}
          >
            <img src="/Rook-Lite_logo.png" alt="Rook Lite" className="home-logo-icon-image" />
          </button>

          <div className="home-icon-tabs">
            <div className="scan-menu-wrap" onMouseEnter={handleScanEnter} onMouseLeave={handleScanLeave}>
              <motion.button
                type="button"
                className={`nav-icon-btn ${activeMode === "scan" ? "active" : ""}`}
                onHoverStart={() => setHoveredMode("scan")}
                onHoverEnd={() => setHoveredMode((prev) => (prev === "scan" ? null : prev))}
                whileHover={{ scale: 1.08 }}
                animate={{ scale: activeMode === "scan" ? 1.05 : 1 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <motion.span
                  className="nav-icon-glow"
                  animate={{
                    opacity: activeMode === "scan" ? 1 : hoveredMode === "scan" ? 0.82 : 0,
                    scale: activeMode === "scan" ? 1.08 : hoveredMode === "scan" ? 1.03 : 0.92,
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                />
                <span className="nav-icon-circle">
                  <Radar size={16} />
                </span>
              </motion.button>

              <AnimatePresence>
                {isScanMenuOpen && (
                  <motion.div
                    className="scan-dropdown"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {SCAN_MODES.map((mode, index) => (
                      <motion.button
                        key={mode}
                        type="button"
                        onClick={() => handleScanModeSelect(mode)}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ delay: index * 0.05, duration: 0.15 }}
                      >
                        {mode}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="button"
              className={`nav-icon-btn ${activeMode === "create" ? "active" : ""}`}
              onClick={openCreateModal}
              onHoverStart={() => setHoveredMode("create")}
              onHoverEnd={() => setHoveredMode((prev) => (prev === "create" ? null : prev))}
              whileHover={{ scale: 1.08 }}
              animate={{ scale: activeMode === "create" ? 1.05 : 1 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <motion.span
                className="nav-icon-glow"
                animate={{
                  opacity: activeMode === "create" ? 1 : hoveredMode === "create" ? 0.82 : 0,
                  scale: activeMode === "create" ? 1.08 : hoveredMode === "create" ? 1.03 : 0.92,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              />
              <span className="nav-icon-circle">
                <Sparkles size={16} />
              </span>
            </motion.button>

            <motion.button
              type="button"
              className={`nav-icon-btn ${activeMode === "compare" ? "active" : ""}`}
              onClick={openCompareModal}
              onHoverStart={() => setHoveredMode("compare")}
              onHoverEnd={() => setHoveredMode((prev) => (prev === "compare" ? null : prev))}
              whileHover={{ scale: 1.08 }}
              animate={{ scale: activeMode === "compare" ? 1.05 : 1 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <motion.span
                className="nav-icon-glow"
                animate={{
                  opacity: activeMode === "compare" ? 1 : hoveredMode === "compare" ? 0.82 : 0,
                  scale: activeMode === "compare" ? 1.08 : hoveredMode === "compare" ? 1.03 : 0.92,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              />
              <span className="nav-icon-circle">
                <GitCompareArrows size={16} />
              </span>
            </motion.button>
          </div>

          <div className="home-top-icons">
            <div className="gear-wrap" ref={gearRef}>
              <motion.button
                className="home-circle-btn"
                type="button"
                title="Menu"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsGearOpen((prev) => !prev)}
              >
                <Menu size={18} />
              </motion.button>

              <AnimatePresence>
                {isGearOpen && (
                  <motion.div
                    className="gear-dropdown"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {[
                      { key: "history" as const, icon: Clock3, label: "History" },
                      { key: "profile" as const, icon: User, label: "Profile" },
                      { key: "settings" as const, icon: Settings, label: "Settings" },
                      { key: "logout" as const, icon: LogOut, label: "Logout" },
                    ].map((item, index) => {
                      const Icon = item.icon;
                      const expanded = hoveredGearItem === item.key;
                      return (
                        <motion.button
                          key={item.key}
                          type="button"
                          className="gear-item"
                          onClick={() => handleGearAction(item.key)}
                          onHoverStart={() => setHoveredGearItem(item.key)}
                          onHoverEnd={() => setHoveredGearItem(null)}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            width: expanded ? 154 : 34,
                            backgroundColor: expanded
                              ? "rgba(255, 255, 255, 0.2)"
                              : "rgba(255, 255, 255, 0.06)",
                            boxShadow: expanded
                              ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                              : "0 0 0 rgba(0, 0, 0, 0)",
                          }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.07, duration: 0.2, ease: "easeOut" }}
                        >
                          <Icon size={16} />
                          <AnimatePresence>
                            {expanded && (
                              <motion.span
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -6 }}
                                transition={{ duration: 0.2 }}
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="home-hero">
          <div className="home-wordmark" aria-hidden>
            <span className="wordmark-rook">RooK</span>
            <span className="wordmark-lite">LitE</span>
          </div>
          {logoMissing ? (
            <div className="home-logo-fallback" aria-label="Rook logo fallback">
              ROOK
            </div>
          ) : (
            <img
              src="/Rook_expload.png"
              alt="Rook Lite logo"
              className="home-rook-logo"
              onError={() => setLogoMissing(true)}
            />
          )}
        </div>

        <p className="home-subtitle">
          ROOK LITE IS AN AI BROWSER EXTENSION DELIVERING REAL-TIME, CONTEXT-AWARE MARKETING
          STRATEGY INSIGHTS.
        </p>

        {scanSubMode && <p className="home-mode-chip">{scanSubMode}</p>}
        {homeResult && <p className="home-result-panel">{homeResult}</p>}
        <div className="home-actions-spacer" />
        {error && <p className="home-status-text">{error}</p>}

        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div
              className="home-modal-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsCreateModalOpen(false);
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                className="home-modal"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                <h3>Create Strategy Assets</h3>
                <div className="home-modal-options">
                  {CREATE_OPTIONS.map((option) => (
                    <button key={option} type="button" onClick={() => runCreateOption(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCompareModalOpen && (
            <motion.div
              className="home-modal-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsCompareModalOpen(false);
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                className="home-modal"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                <h3>Compare With Competitor</h3>
                <div className="home-compare-fields">
                  <label>
                    Current Page
                    <input
                      type="text"
                      value={currentPageUrl}
                      onChange={(e) => setCurrentPageUrl(e.target.value)}
                    />
                  </label>
                  <label>
                    Competitor URL
                    <input
                      type="text"
                      value={competitorUrl}
                      onChange={(e) => setCompetitorUrl(e.target.value)}
                      placeholder="https://competitor.com"
                    />
                  </label>
                  <button type="button" onClick={runComparison}>
                    Run Comparison
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
