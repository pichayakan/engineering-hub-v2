// frontend/src/components/SummaryCard.jsx
import React from "react";
import "./SummaryCard.css";

function SummaryCard({ title, value, icon }) {
  return (
    <div className="summary-card">
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <div className="card-value">{value}</div>
        <div className="card-title">{title}</div>
      </div>
    </div>
  );
}

export default SummaryCard;
