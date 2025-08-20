// frontend/src/components/ProgressBar.jsx
import React from "react";
import "./ProgressBar.css";

function ProgressBar({ current, total }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="progress-bar-text">
        {current} / {total} Steps
      </div>
    </div>
  );
}

export default ProgressBar;
