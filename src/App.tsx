import { useEffect, useState } from "react";
import "./App.css";

/* ---------------- TYPES ---------------- */

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
  asset_type?: string;
  overview?: string;
  target_audience?: string;
  sections?: AnalysisSection[];
  verdicts?: Verdicts;
  score?: Score;
};

/* ---------------- HELPERS ---------------- */

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

/* ---------------- APP ---------------- */

function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingSaved, setViewingSaved] = useState(false);

  /* ---- Load history ---- */
  useEffect(() => {
    const stored = localStorage.getItem("rook-lite-history");
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  const saveToHistory = (data: AnalysisResult) => {
    const updated = [data, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("rook-lite-history", JSON.stringify(updated));
  };

  /* ---- Analyze page ---- */
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

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: 16, width: 360 }}>
      <h2>Rook Lite</h2>
      <p>AI-powered page analysis</p>

      <button
        onClick={analyzePage}
        disabled={loading}
        style={{ width: "100%", padding: 10 }}
      >
        {loading ? "Analyzing..." : "Analyze Page"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {viewingSaved && (
        <p style={{ fontSize: 12, color: "#666" }}>
          Viewing saved analysis
        </p>
      )}

      {analysis && (
        <>
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
              {analysis.score.reasoning && (
                <p>{analysis.score.reasoning}</p>
              )}
            </>
          )}
        </>
      )}

      {history.length > 0 && (
        <>
          <hr />
          <h3>Recent Analyses</h3>

          {history.map((item, i) => (
            <div
              key={i}
              onClick={() => {
                setAnalysis(item);
                setViewingSaved(true);
                setError(null);
              }}
              style={{
                cursor: "pointer",
                fontSize: 12,
                padding: 6,
                borderRadius: 4,
                background: "#f6f6f6",
                marginBottom: 6,
              }}
            >
              ⭐ {item.score?.value?.toFixed(1) ?? "0.0"} —{" "}
              {item.target_audience ?? "Analysis"}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default App;
