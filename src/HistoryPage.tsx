import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  GitCompareArrows,
  Radar,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import "./HistoryPage.css";

type HistoryScore = {
  value?: number;
  reasoning?: string;
};

export type HistoryAnalysis = {
  id: string;
  createdAt: number;
  asset_type?: string;
  target_audience?: string;
  overview?: string;
  url?: string;
  sections?: { id?: string; title?: string; insights?: string[] }[];
  verdicts?: { marketing?: string; strategic?: string };
  score?: HistoryScore;
};

type HistoryPageProps = {
  history: HistoryAnalysis[];
  onGoBack: () => void;
  onDeleteMany: (ids: string[]) => void;
  onOpenAnalysis: (item: HistoryAnalysis) => void;
};

type ModeFilter = "all" | "scan" | "compare" | "create";
type ItemMode = "scan" | "compare" | "create";

function getAnalysisName(item: HistoryAnalysis): string {
  if (item.target_audience && item.target_audience.trim()) return item.target_audience.trim();
  if (item.overview && item.overview.trim()) return item.overview.trim().slice(0, 110);
  return "Untitled analysis";
}

function getItemMode(item: HistoryAnalysis): ItemMode {
  const source = `${item.asset_type ?? ""} ${item.overview ?? ""}`.toLowerCase();
  if (source.includes("compare") || source.includes("competitor") || source.includes("benchmark")) {
    return "compare";
  }
  if (source.includes("create") || source.includes("generate") || source.includes("campaign")) {
    return "create";
  }
  return "scan";
}

function getScoreValue(item: HistoryAnalysis): number {
  const raw = item.score?.value ?? 0;
  if (raw <= 10) return Math.max(0, Math.min(100, Math.round(raw * 10)));
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getModeLabel(mode: ItemMode): string {
  if (mode === "scan") return "SCAN";
  if (mode === "compare") return "COMPARE";
  return "CREATE";
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ModeIcon({ mode }: { mode: ItemMode }) {
  if (mode === "scan") return <Radar size={16} />;
  if (mode === "compare") return <GitCompareArrows size={16} />;
  return <Sparkles size={16} />;
}

function HistoryPage({ history, onGoBack, onDeleteMany, onOpenAnalysis }: HistoryPageProps) {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((item) => {
      const mode = getItemMode(item);
      const filterMatch = modeFilter === "all" || mode === modeFilter;
      const searchSource = `${getAnalysisName(item)} ${item.url ?? ""} ${mode}`.toLowerCase();
      const searchMatch = !q || searchSource.includes(q);
      return filterMatch && searchMatch;
    });
  }, [history, modeFilter, search]);

  const recentViewed = filteredHistory.slice(0, 3);

  const togglePick = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    setLocalNotice(null);
    if (selectedIds.length === 0) {
      setLocalNotice("Select analyses first.");
      return;
    }
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteMany(selectedIds);
    setSelectedIds([]);
    setShowConfirm(false);
    setLocalNotice(null);
    setIsEditMode(false);
  };

  return (
    <div className="history-dark-page">
      <div className="history-hero-bg" aria-hidden>
        <div className="history-wordmark-bg">
          <span className="history-wordmark-rook">RooK</span>
          <span className="history-wordmark-lite">LitE</span>
        </div>
        <img src="/Rook_expload.png" alt="" className="history-rook-bg" />
      </div>

      <div className="history-content">
        <div className="history-dark-header">
          <div className="header-left">
            <div className="header-title-row">
              <h2>Strategy Archive</h2>
              <button className="secondary-btn" type="button" onClick={onGoBack}>
                Home
              </button>
            </div>
            <p>Your saved scans, comparisons, and generated strategies.</p>
          </div>
        </div>

        <div className="history-search-wrap">
          <Search size={16} />
          <input
            className="history-dark-search"
            type="text"
            placeholder="Search by page title, URL, or mode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <h3 className="history-dark-title">Recently Viewed</h3>
        <div className="history-recent-grid">
          {recentViewed.map((item) => {
            const mode = getItemMode(item);
            return (
              <motion.button
                key={item.id}
                type="button"
                className="intel-card"
                onClick={() => onOpenAnalysis(item)}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="intel-top">
                  <span className={`mode-tag mode-${mode}`}>{getModeLabel(mode)}</span>
                  <span className="score-badge">{getScoreValue(item)}</span>
                </div>
                <p className="intel-title">{getAnalysisName(item)}</p>
                <p className="intel-meta">{formatDateTime(item.createdAt)}</p>
              </motion.button>
            );
          })}
        </div>

        <div className="history-all-header">
          <h3 className="history-dark-title">All Analyses</h3>
          <div className="all-actions">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <select
                className="history-filter-select"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
              >
                <option value="all">All</option>
                <option value="scan">Scans</option>
                <option value="compare">Compare</option>
                <option value="create">Create</option>
              </select>
            </motion.div>
            {isEditMode && (
              <button className="inline-delete-btn" type="button" onClick={handleDeleteSelected}>
                Delete Selected
              </button>
            )}
            <motion.button
              className="edit-btn"
              type="button"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: 0.02 }}
              onClick={() => {
                setIsEditMode((prev) => !prev);
                setSelectedIds([]);
                setLocalNotice(null);
              }}
            >
              {isEditMode ? "Done" : "Edit"}
            </motion.button>
          </div>
        </div>

        <div className="history-all-list">
          {filteredHistory.length === 0 && <p className="history-dark-empty">No analyses found.</p>}
          {filteredHistory.map((item) => {
            const mode = getItemMode(item);
            return (
              <motion.button
                key={item.id}
                type="button"
                className={`analysis-row ${isEditMode && selectedIds.includes(item.id) ? "selected" : ""}`}
                onClick={isEditMode ? () => togglePick(item.id) : () => onOpenAnalysis(item)}
                whileHover={{ backgroundColor: "rgba(25, 29, 39, 0.92)" }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="row-left-icon">
                  <ModeIcon mode={mode} />
                </div>

                <div className="row-main">
                  <p className="row-title">{getAnalysisName(item)}</p>
                  <p className="row-url">{item.url || "No URL stored"}</p>
                </div>

                <div className="row-right">
                  <span className="score-badge small">{getScoreValue(item)}</span>
                  <span className="row-date">{formatDateTime(item.createdAt)}</span>
                </div>

                <div className="row-arrow">
                  <ChevronRight size={16} />
                </div>

                {!isEditMode && (
                  <span className="row-trash">
                    <Trash2 size={14} />
                  </span>
                )}

                {isEditMode && (
                  <input
                    className="row-checkbox"
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => togglePick(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {localNotice && <p className="history-dark-notice">{localNotice}</p>}
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="confirm-dialog"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <p>Are you sure you want to delete selected analyses?</p>
              <div className="confirm-actions">
                <button type="button" className="confirm-btn confirm-btn-cancel" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="confirm-btn confirm-btn-delete" onClick={confirmDelete}>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HistoryPage;
