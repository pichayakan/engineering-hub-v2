// frontend/src/pages/procurement/components/SendBackModal.jsx
import React, { useState } from "react";
import Select from "react-select";

// ✅ เปลี่ยน Props: รับ steps (ทั้งหมด) และ currentStep แทน history
function SendBackModal({ steps, currentStep, onSendBack, onCancel }) {
  const [targetStep, setTargetStep] = useState(null);
  const [notes, setNotes] = useState("");

  // --- ✅ LOGIC ใหม่: กรองจาก Steps ทั้งหมด ---
  // 1. กรองเอาเฉพาะ Step ที่ลำดับ (Order) น้อยกว่า Step ปัจจุบัน
  // 2. เรียงลำดับจากน้อยไปมาก
  const availableSteps = steps
    ? steps
        .filter((s) => s.order < currentStep.order)
        .sort((a, b) => a.order - b.order)
    : [];

  const stepOptions = availableSteps.map((s) => ({
    value: s.id,
    label: `${s.order}: ${s.name}`,
  }));
  // ----------------------------------------

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
          placeholder="-- Select Step --"
        />
      </div>
      <div className="form-group">
        <label>Reason for sending back (Required):</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="4"
          required
          placeholder="ระบุเหตุผลที่ส่งกลับแก้ไข..."
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
