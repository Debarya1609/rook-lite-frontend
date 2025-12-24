import { useEffect, useState } from "react";
import "./App.css";

/* ---------------- TYPES ---------------- */

type AnalysisResult = {
  what_this_site_is: string;
  target_audience: string;

  strengths: string[];
  weaknesses: string[];
  improvements: string[];

  seo_metadata_feedback: string;
  social_presence_analysis: string;

  marketing_verdict: string;
  investor_verdict: string;

  overall_score: number;
};

/* ---------------- HELPERS ---------------- */

function normalizeAnalysis(raw: Record<string, unknown>): AnalysisResult {
  return {
    what_this_site_is: String(raw.what_this_site_is ?? "Not available"),
    target_audience: String(raw.target_audience ?? "Not available"),

    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements : [],

    seo_metadata_feedback: String(raw.seo_metadata_feedback ?? "Not available"),
    social_presence_analysis: String(raw.social_presence_analysis ?? "Not available"),

    marketing_verdict: String(raw.marketing_verdict ?? "Not available"),
    investor_verdict: String(raw.investor_verdict ?? "Not available"),

    overall_score:
      typeof raw.overall_score === "number" ? raw.overall_score : 0,
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
      <p>AI-powered website analysis</p>

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
          <h3>Overview</h3>
          <p>{analysis.what_this_site_is}</p>

          <h3>Target Audience</h3>
          <p>{analysis.target_audience}</p>

          <h3>Strengths</h3>
          <ul>{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>

          <h3>Weaknesses</h3>
          <ul>{analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>

          <h3>Improvements</h3>
          <ul>{analysis.improvements.map((i, k) => <li key={k}>{i}</li>)}</ul>

          <h3>Score</h3>
          <strong>{analysis.overall_score.toFixed(1)}/10</strong>
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
              ⭐ {item.overall_score.toFixed(1)} — {item.target_audience}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default App;
