// frontend/src/components/EmptyState.jsx
import React from "react";
import { FiInbox } from "react-icons/fi"; // Using a simple inbox icon
import "./EmptyState.css";

function EmptyState({ message, icon }) {
  const IconComponent = icon || FiInbox;

  return (
    <div className="empty-state-container">
      <IconComponent className="empty-state-icon" />
      <p className="empty-state-message">{message}</p>
    </div>
  );
}

export default EmptyState;
