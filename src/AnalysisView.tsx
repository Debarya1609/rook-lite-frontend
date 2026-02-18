import { motion } from "framer-motion";
import "./AnalysisView.css";
import type { AnalysisResult } from "./App";

type AnalysisViewProps = {
  analysis: AnalysisResult;
  onGoBack: () => void;
};

function AnalysisView({ analysis, onGoBack }: AnalysisViewProps) {
  return (
    <div className="analysis-view">
      <div className="analysis-top">
        <h2>Analysis</h2>
        <motion.button
          type="button"
          className="analysis-back-btn"
          onClick={onGoBack}
          whileHover={{ y: -6, boxShadow: "8px 14px 0 #111" }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          Go Back
        </motion.button>
      </div>

      <div className="analysis-card">
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
    </div>
  );
}

export default AnalysisView;
