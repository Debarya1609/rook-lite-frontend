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
    return item.overview.trim().slice(0, 70);
  }

  return "Untitled analysis";
}

function HistoryRow({
  index,
  item,
  deleteMode,
  checked,
  onToggle,
  onOpen,
}: {
  index: number;
  item: HistoryAnalysis;
  deleteMode: boolean;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="history-row">
      <div className="history-index-box">
        {deleteMode ? (
          <input
            type="checkbox"
            className="history-checkbox"
            checked={checked}
            onChange={onToggle}
          />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
      <button
        type="button"
        className="history-text-box history-open-btn"
        onClick={deleteMode ? onToggle : onOpen}
      >
        {getAnalysisName(item)}
      </button>
    </div>
  );
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
  const selectedCount = selectedIds.length;

  const togglePick = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteButton = () => {
    setLocalNotice(null);

    if (!deleteMode) {
      setDeleteMode(true);
      setSelectedIds([]);
      return;
    }

    if (selectedCount === 0) {
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
    <div className="history-page">
      <div className="history-head">
        <img src="/rook-lite-logo.png" alt="Rook Lite logo" className="history-head-logo" />
        <p>
          Rook Lite take notes for your every analysis and saves it for you for future.
        </p>
      </div>

      <input
        className="history-search"
        type="text"
        placeholder="Search here..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <h3 className="history-section-title">Recently Viewd</h3>
      <div className="history-list">
        {recentViewed.length === 0 && <p className="history-empty">No recent analyses.</p>}
        {recentViewed.map((item, index) => (
          <HistoryRow
            key={`recent-${item.id}`}
            index={index}
            item={item}
            deleteMode={deleteMode}
            checked={selectedIds.includes(item.id)}
            onToggle={() => togglePick(item.id)}
            onOpen={() => onOpenAnalysis(item)}
          />
        ))}
      </div>

      <h3 className="history-section-title">All Analysis</h3>
      <div className="history-list">
        {filteredHistory.length === 0 && <p className="history-empty">No analyses found.</p>}
        {filteredHistory.map((item, index) => (
          <HistoryRow
            key={item.id}
            index={index}
            item={item}
            deleteMode={deleteMode}
            checked={selectedIds.includes(item.id)}
            onToggle={() => togglePick(item.id)}
            onOpen={() => onOpenAnalysis(item)}
          />
        ))}
      </div>

      {localNotice && <p className="history-notice">{localNotice}</p>}

      <div className="history-actions">
        <motion.button
          type="button"
          className="history-btn history-btn-back"
          onClick={onGoBack}
          whileHover={{ y: -6, boxShadow: "8px 14px 0 #111" }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          Go Back
        </motion.button>
        <motion.button
          type="button"
          className="history-btn history-btn-delete"
          onClick={handleDeleteButton}
          whileHover={{ y: -6, boxShadow: "8px 14px 0 #b10000" }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
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
                <button
                  type="button"
                  className="confirm-btn confirm-btn-cancel"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-delete"
                  onClick={confirmDelete}
                >
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
