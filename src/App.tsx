import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [promptUrl, setPromptUrl] = useState("");
  const [promptNote, setPromptNote] = useState("");
  const [logoMissing, setLogoMissing] = useState(false);
  const [activeView, setActiveView] = useState<"home" | "history" | "analysis">("home");
  const [analysisBackView, setAnalysisBackView] = useState<"home" | "history">("home");

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
          setAnalysisBackView("home");
          setActiveView("analysis");
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

  const openAnalysisFromHistory = (item: HistoryAnalysis) => {
    setAnalysis(item);
    setAnalysisBackView("history");
    setActiveView("analysis");
    setError(null);
  };

  if (activeView === "history") {
    return (
      <div className="popup-bg">
        <div className="popup-card">
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
      <div className="popup-bg">
        <div className="popup-card">
          <AnalysisView
            analysis={analysis}
            onGoBack={() => setActiveView(analysisBackView)}
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
          <div className="top-icons">
            <button
              className="icon-btn"
              type="button"
              title="History"
              onClick={() => setActiveView("history")}
            >
              <img src="/history.png" alt="History" className="top-icon-image" />
            </button>
            <button
              className="icon-btn"
              type="button"
              title="Profile"
              onClick={() => setError("Profile page will be added next.")}
            >
              <img src="/user.png" alt="User profile" className="top-icon-image" />
            </button>
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
      </div>
    </div>
  );
}

export default App;
