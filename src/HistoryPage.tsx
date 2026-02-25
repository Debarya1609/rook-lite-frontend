import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

function getAnalysisName(item: HistoryAnalysis): string {
  if (item.target_audience && item.target_audience.trim()) {
    return item.target_audience.trim();
  }
  if (item.overview && item.overview.trim()) {
    return item.overview.trim().slice(0, 88);
  }
  return "Untitled analysis";
}

function HistoryPage({ history, onGoBack, onDeleteMany, onOpenAnalysis }: HistoryPageProps) {
  const [search, setSearch] = useState("");
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => getAnalysisName(item).toLowerCase().includes(q));
  }, [history, search]);

  const recentViewed = filteredHistory.slice(0, 3);

  const togglePick = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteCta = () => {
    setLocalNotice(null);
    if (!deleteMode) {
      setDeleteMode(true);
      setSelectedIds([]);
      return;
    }
    if (selectedIds.length === 0) {
      setLocalNotice("Select analyses first.");
      return;
    }
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    onDeleteMany(selectedIds);
    setSelectedIds([]);
    setDeleteMode(false);
    setShowConfirm(false);
    setLocalNotice(null);
  };

  return (
    <div className="history-dark-page">
      <div className="history-dark-header">
        <h2>Strategy Archive</h2>
        <button className="history-dark-pill" type="button" onClick={onGoBack} />
      </div>

      <input
        className="history-dark-search"
        type="text"
        placeholder="Search here..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h3 className="history-dark-title">Recently Viewed</h3>
      <div className="history-recent-grid">
        {[0, 1, 2].map((idx) => {
          const item = recentViewed[idx];
          const colorClass = idx === 0 ? "accent-orange" : idx === 1 ? "accent-green" : "accent-blue";
          return (
            <button
              key={item?.id ?? `placeholder-${idx}`}
              type="button"
              className={`recent-card ${colorClass}`}
              onClick={() => item && onOpenAnalysis(item)}
              disabled={!item}
            >
              {item ? getAnalysisName(item) : ""}
            </button>
          );
        })}
      </div>

      <div className="history-all-header">
        <h3 className="history-dark-title">All Analyses</h3>
        <button
          type="button"
          className={`history-select-toggle ${deleteMode ? "active" : ""}`}
          onClick={() => {
            setDeleteMode((prev) => !prev);
            setSelectedIds([]);
            setLocalNotice(null);
          }}
        />
      </div>

      <div className="history-all-list">
        {filteredHistory.length === 0 && <p className="history-dark-empty">No analyses found.</p>}
        {filteredHistory.map((item) => (
          <button
            key={item.id}
            type="button"
            className="analysis-strip"
            onClick={deleteMode ? () => togglePick(item.id) : () => onOpenAnalysis(item)}
          >
            <span>{getAnalysisName(item)}</span>
            {deleteMode && (
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => togglePick(item.id)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </button>
        ))}
      </div>

      {localNotice && <p className="history-dark-notice">{localNotice}</p>}

      <div className="history-dark-footer">
        <motion.button
          type="button"
          className="history-delete-cta"
          onClick={handleDeleteCta}
          whileHover={{ y: -4, boxShadow: "0 8px 20px rgba(255, 50, 50, 0.35)" }}
          transition={{ type: "spring", stiffness: 250, damping: 16 }}
        >
          Delete
        </motion.button>
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
              <p>Are you sure you want to delete analysis</p>
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
