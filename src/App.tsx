import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./App.css";
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

type AnalysisResult = {
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

function normalizeAnalysis(raw: Record<string, unknown>): AnalysisResult {
  return {
    asset_type: String(raw.asset_type ?? "unknown"),
    overview: String(raw.overview ?? ""),
    target_audience: String(raw.target_audience ?? ""),
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    verdicts:
      typeof raw.verdicts === "object" && raw.verdicts !== null
        ? (raw.verdicts as Verdicts)
        : {},
    score:
      typeof raw.score === "object" && raw.score !== null
        ? (raw.score as Score)
        : { value: 0 },
  };
}

function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingSaved, setViewingSaved] = useState(false);
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [promptUrl, setPromptUrl] = useState("");
  const [promptNote, setPromptNote] = useState("");
  const [logoMissing, setLogoMissing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeView, setActiveView] = useState<"home" | "history">("home");
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        showProfileMenu &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showProfileMenu]);

  const saveToHistory = (data: AnalysisResult) => {
    const entry: HistoryAnalysis = {
      ...data,
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };

    const updated = [entry, ...history];
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const deleteHistoryByIds = (ids: string[]) => {
    const updated = history.filter((item) => !ids.includes(item.id));
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const analyzePage = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setViewingSaved(false);

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      setError("No active tab found");
      setLoading(false);
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    chrome.tabs.sendMessage(
      tab.id,
      { type: "EXTRACT_PAGE" },
      async (pageContent) => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message ?? "Extension error");
          setLoading(false);
          return;
        }

        try {
          const response = await fetch(
            "https://rook-lite-backend.onrender.com/analysis/page",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: tab.url,
                page_content: pageContent,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
          }

          const raw = await response.json();
          const safe = normalizeAnalysis(raw);

          setAnalysis(safe);
          saveToHistory(safe);
        } catch {
          setError("Backend error while analyzing page");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handlePromptAnyLink = () => {
    setError(null);

    if (!promptUrl.trim()) {
      setError("Please enter a URL first");
      return;
    }

    try {
      new URL(promptUrl);
      setError("URL + Prompt mode UI is ready. Backend wiring is next.");
      setPromptNote("");
    } catch {
      setError("Enter a valid URL (example: https://example.com)");
    }
  };

  const handleProfileMenuAction = (action: "profile" | "history") => {
    setShowProfileMenu(false);

    if (action === "profile") {
      setError("Profile view will be added next.");
      return;
    }

    setError(null);
    setActiveView("history");
  };

  if (activeView === "history") {
    return (
      <div className="popup-bg">
        <div className="popup-card">
          <HistoryPage
            history={history}
            onGoBack={() => setActiveView("home")}
            onDeleteMany={deleteHistoryByIds}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="popup-bg">
      <div className="popup-card">
        <div className="top-row">
          <h1>Rook Lite</h1>
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button
              className="profile-btn"
              type="button"
              title="Profile"
              onClick={() => setShowProfileMenu((prev) => !prev)}
            >
              <img src="/user.png" alt="User profile" className="profile-image" />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  className="profile-dropdown"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={() => handleProfileMenuAction("profile")}
                  >
                    Profile
                  </button>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={() => handleProfileMenuAction("history")}
                  >
                    History
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="logo-wrap">
          {logoMissing ? (
            <div className="logo-fallback" aria-label="Rook logo fallback">
              ROOK
            </div>
          ) : (
            <img
              src="/rook-lite-logo.png"
              alt="Rook Lite logo"
              className="rook-logo"
              onError={() => setLogoMissing(true)}
            />
          )}
        </div>

        <p className="subtitle">
          Rook Lite is an AI browser extension delivering real-time,
          context-aware marketing strategy insights.
        </p>

        <div className="main-actions">
          <motion.button
            className="action-btn"
            type="button"
            disabled={loading}
            onClick={analyzePage}
            whileHover={{ y: -6, boxShadow: "8px 14px 0 #111" }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            {loading ? "Analyzing..." : "Analyze page"}
          </motion.button>
          <motion.button
            className="action-btn"
            type="button"
            onClick={() => setShowPromptPanel((prev) => !prev)}
            whileHover={{ y: -6, boxShadow: "8px 14px 0 #111" }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            Prompt any link
          </motion.button>
        </div>

        {showPromptPanel && (
          <div className="prompt-panel">
            <input
              type="url"
              placeholder="https://example.com"
              value={promptUrl}
              onChange={(e) => setPromptUrl(e.target.value)}
            />
            <textarea
              placeholder="Optional instruction"
              value={promptNote}
              onChange={(e) => setPromptNote(e.target.value)}
              rows={2}
            />
            <button className="small-btn" type="button" onClick={handlePromptAnyLink}>
              Analyze URL
            </button>
          </div>
        )}

        {error && <p className="status-text">{error}</p>}
        {viewingSaved && <p className="status-text">Viewing saved analysis</p>}

        {analysis && (
          <div className="result-panel">
            {analysis.overview && (
              <>
                <h3>Overview</h3>
                <p>{analysis.overview}</p>
              </>
            )}

            {analysis.target_audience && (
              <>
                <h3>Target Audience</h3>
                <p>{analysis.target_audience}</p>
              </>
            )}

            {analysis.sections?.map((section, idx) => (
              <div key={section.id ?? idx}>
                <h3>{section.title}</h3>
                <ul>
                  {section.insights?.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            {analysis.verdicts?.marketing && (
              <>
                <h3>Marketing Verdict</h3>
                <p>{analysis.verdicts.marketing}</p>
              </>
            )}

            {analysis.verdicts?.strategic && (
              <>
                <h3>Strategic Verdict</h3>
                <p>{analysis.verdicts.strategic}</p>
              </>
            )}

            {analysis.score?.value !== undefined && (
              <>
                <h3>Score</h3>
                <strong>{analysis.score.value.toFixed(1)}/10</strong>
                {analysis.score.reasoning && <p>{analysis.score.reasoning}</p>}
              </>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="history-panel">
            <h3>Recent analyses</h3>
            {history.map((item, i) => (
              <button
                key={item.id ?? i}
                className="history-item"
                type="button"
                onClick={() => {
                  setAnalysis(item);
                  setViewingSaved(true);
                  setError(null);
                }}
              >
                {item.score?.value?.toFixed(1) ?? "0.0"} |{" "}
                {item.target_audience ?? "Analysis"}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
