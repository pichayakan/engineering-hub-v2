// frontend/src/components/LoadingSpinner.jsx
import React from "react";
import "./LoadingSpinner.css";

function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="spinner-container">
      <div className="spinner"></div>
      <p className="spinner-message">{message}</p>
    </div>
  );
}

export default LoadingSpinner;
