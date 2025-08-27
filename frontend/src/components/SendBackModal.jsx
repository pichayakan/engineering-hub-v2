// frontend/src/pages/procurement/components/SendBackModal.jsx
import React, { useState } from "react";
import Select from "react-select";

function SendBackModal({ history, onSendBack, onCancel }) {
  const [targetStep, setTargetStep] = useState(null);
  const [notes, setNotes] = useState("");

  // Create options from the approval history, excluding the very first step
  const stepOptions = history.slice(0, -1).map((h) => ({
    value: h.step.id,
    label: `${h.step.order}: ${h.step.name}`,
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetStep || !notes) {
      alert("Please select a step to send back to and provide notes.");
      return;
    }
    onSendBack({
      target_step_id: targetStep.value,
      notes: notes,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Send back to step:</label>
        <Select
          options={stepOptions}
          value={targetStep}
          onChange={setTargetStep}
          required
        />
      </div>
      <div className="form-group">
        <label>Reason for sending back (Required):</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="4"
          required
        ></textarea>
      </div>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-danger">
          Send Back
        </button>
      </div>
    </form>
  );
}

export default SendBackModal;
