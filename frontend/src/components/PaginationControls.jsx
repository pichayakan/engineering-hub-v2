// frontend/src/components/PaginationControls.jsx
import React from "react";
import "./PaginationControls.css";

function PaginationControls({ paginationData, onPageChange }) {
  if (!paginationData || (!paginationData.previous && !paginationData.next)) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <button
        onClick={() => onPageChange(paginationData.previous)}
        disabled={!paginationData.previous}
      >
        ‹ Previous
      </button>
      <button
        onClick={() => onPageChange(paginationData.next)}
        disabled={!paginationData.next}
      >
        Next ›
      </button>
    </div>
  );
}

export default PaginationControls;
