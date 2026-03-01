import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import "./AnalysisView.css";
import type { AnalysisResult } from "./App";

type AnalysisViewProps = {
  analysis: AnalysisResult;
  onGoBack: () => void;
};

type MetricItem = {
  key: string;
  label: string;
  value: number;
};

type InsightItem = {
  key: string;
  title: string;
  items: string[];
};

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toTitleCase(input: string): string {
  return input
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toOverallScore(analysis: AnalysisResult): number {
  const raw = analysis.score?.value;
  if (typeof raw !== "number") return 0;
  if (raw <= 10) return clampScore(raw * 10);
  return clampScore(raw);
}

function extractMetrics(analysis: AnalysisResult): MetricItem[] {
  const source =
    (analysis.conversion_scores as Record<string, unknown> | undefined) ??
    ((analysis as { conversionScores?: Record<string, unknown> }).conversionScores ?? undefined);

  if (!source) return [];

  const orderedKeys = [
    "clarity",
    "trust",
    "urgency",
    "differentiation",
    "cta_strength",
  ] as const;

  const metrics: MetricItem[] = [];
  orderedKeys.forEach((key) => {
    const value = source[key];
    if (typeof value !== "number") return;
    metrics.push({
      key,
      label: toTitleCase(key),
      value: clampScore(value),
    });
  });
  return metrics;
}

function extractStats(analysis: AnalysisResult): Array<{ key: string; value: string | number }> {
  const sourceCandidates = [
    analysis.pricing_analysis,
    (analysis as { pricingAnalysis?: Record<string, string | number> }).pricingAnalysis,
    (analysis as { analysis_stats?: Record<string, string | number> }).analysis_stats,
    (analysis as { analysisStats?: Record<string, string | number> }).analysisStats,
  ];

  const source = sourceCandidates.find((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    return Object.keys(candidate).length > 0;
  });

  if (!source) return [];

  return Object.entries(source)
    .filter(([, value]) => typeof value === "number" || typeof value === "string")
    .map(([key, value]) => ({ key: toTitleCase(key), value }));
}

function extractInsights(analysis: AnalysisResult): InsightItem[] {
  const source =
    (analysis.insights as Record<string, string[]> | undefined) ??
    ((analysis as { insights_data?: Record<string, string[]> }).insights_data ?? undefined);

  const preferredKeys = [
    "messaging_issues",
    "funnel_gaps",
    "tone_fit",
    "seo_improvements",
    "quick_fixes",
  ] as const;

  if (source && typeof source === "object") {
    const sections: InsightItem[] = [];
    preferredKeys.forEach((key) => {
      const items = source[key];
      if (!Array.isArray(items) || items.length === 0) return;
      sections.push({
        key,
        title: toTitleCase(key),
        items,
      });
    });
    return sections;
  }

  if (!analysis.sections?.length) return [];

  return analysis.sections
    .map((section, index) => {
      const items = section.insights ?? [];
      if (!items.length) return null;
      const title = section.title?.trim() || `Section ${index + 1}`;
      return {
        key: section.id ?? `section-${index}`,
        title,
        items,
      };
    })
    .filter((item): item is InsightItem => item !== null);
}

function extractVerdicts(analysis: AnalysisResult): { marketing?: string; strategic?: string } {
  return {
    marketing: analysis.marketing_verdict ?? analysis.verdicts?.marketing,
    strategic: analysis.strategic_verdict ?? analysis.verdicts?.strategic,
  };
}

function ExecutiveScore({ score, overview }: { score: number; overview?: string }) {
  const circumference = 2 * Math.PI * 32;
  const strokeOffset = circumference - (score / 100) * circumference;

  return (
    <section className="dashboard-card executive-score">
      <div className="executive-left">
        <div className="score-ring-wrap">
          <svg viewBox="0 0 80 80" className="score-ring" aria-hidden>
            <circle cx="40" cy="40" r="32" className="score-ring-track" />
            <motion.circle
              cx="40"
              cy="40"
              r="32"
              className="score-ring-progress"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: strokeOffset }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </svg>
          <div className="score-number">
            <strong>{score}</strong>
            <span>/100</span>
          </div>
        </div>
      </div>
      <div className="executive-right">
        <h3>Executive Summary</h3>
        <p>{overview || "No overview was provided in this analysis."}</p>
      </div>
    </section>
  );
}

function MetricsGraph({ metrics }: { metrics: MetricItem[] }) {
  if (metrics.length === 0) return null;

  return (
    <section className="dashboard-card metrics-section">
      <h3>Conversion Metrics</h3>
      <div className="metric-list">
        {metrics.map((metric) => (
          <div key={metric.key} className="metric-row">
            <div className="metric-label-row">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
            <div className="metric-bar-track">
              <motion.div
                className="metric-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatGrid({ stats }: { stats: Array<{ key: string; value: string | number }> }) {
  if (stats.length === 0) return null;

  return (
    <section className="dashboard-card stats-section">
      <h3>Analysis Stats</h3>
      <div className="stats-grid">
        {stats.map((stat) => (
          <motion.div
            key={stat.key}
            className="stat-card"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <span>{stat.key}</span>
            <strong>{stat.value}</strong>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function InsightSection({ section }: { section: InsightItem }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="dashboard-card insight-section">
      <button type="button" className="insight-toggle" onClick={() => setOpen((prev) => !prev)}>
        <span>{section.title}</span>
        <div className="insight-meta">
          <span className="insight-count">{section.items.length}</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            className="insight-list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {section.items.map((item, idx) => (
              <li key={`${section.key}-${idx}`}>{item}</li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

function VerdictPanel({ marketing, strategic }: { marketing?: string; strategic?: string }) {
  if (!marketing && !strategic) return null;

  return (
    <section className="dashboard-card verdict-panel">
      <h3>Strategic Verdict</h3>
      {marketing && (
        <div className="verdict-row">
          <h4>Marketing Verdict</h4>
          <p>{marketing}</p>
        </div>
      )}
      {strategic && (
        <div className="verdict-row">
          <h4>Strategic Verdict</h4>
          <p>{strategic}</p>
        </div>
      )}
    </section>
  );
}

function AnalysisView({ analysis, onGoBack }: AnalysisViewProps) {
  const overallScore = useMemo(() => toOverallScore(analysis), [analysis]);
  const metrics = useMemo(() => extractMetrics(analysis), [analysis]);
  const stats = useMemo(() => extractStats(analysis), [analysis]);
  const insights = useMemo(() => extractInsights(analysis), [analysis]);
  const verdicts = useMemo(() => extractVerdicts(analysis), [analysis]);

  return (
    <motion.div
      className="analysis-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="analysis-top">
        <h2>Intelligence Dashboard</h2>
        <motion.button
          type="button"
          className="analysis-back-btn"
          onClick={onGoBack}
          whileHover={{ y: -2, boxShadow: "0 12px 24px rgba(0, 0, 0, 0.34)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          Go Back
        </motion.button>
      </div>

      <div className="analysis-dashboard">
        <ExecutiveScore score={overallScore} overview={analysis.overview} />
        <MetricsGraph metrics={metrics} />
        <StatGrid stats={stats} />
        {insights.map((section) => (
          <InsightSection key={section.key} section={section} />
        ))}
        <VerdictPanel marketing={verdicts.marketing} strategic={verdicts.strategic} />
      </div>
    </motion.div>
  );
}

export default AnalysisView;
