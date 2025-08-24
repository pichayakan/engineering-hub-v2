// frontend/src/components/ViewToggle.jsx
import React from 'react';
import './ViewToggle.css';

function ViewToggle({ viewMode, setViewMode, option1, option2 }) {
  return (
    <div className="view-toggle">
      <button
        className={`toggle-btn ${viewMode === option1.value ? 'active' : ''}`}
        onClick={() => setViewMode(option1.value)}
      >
        {option1.label}
      </button>
      <button
        className={`toggle-btn ${viewMode === option2.value ? 'active' : ''}`}
        onClick={() => setViewMode(option2.value)}
      >
        {option2.label}
      </button>
    </div>
  );
}

export default ViewToggle;