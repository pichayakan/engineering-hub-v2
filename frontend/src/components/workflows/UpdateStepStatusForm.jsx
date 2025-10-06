// frontend/src/components/workflows/UpdateStepStatusForm.jsx
import React, { useState, useEffect } from "react";
import "./UpdateStepStatusForm.css";

const STATUS_CHOICES = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"];

const toInputDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toISOString().split("T")[0];
};

function UpdateStepStatusForm({ stepStatus, onSubmit, onCancel }) {
  const [status, setStatus] = useState(stepStatus.status);
  const [notes, setNotes] = useState(stepStatus.notes || "");
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [actualCompletedDate, setActualCompletedDate] = useState(
    toInputDate(stepStatus.actual_completed_date)
  );

  useEffect(() => {
    if (status !== "COMPLETED") {
      setActualCompletedDate("");
    }
  }, [status]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("status", status);
    formData.append("notes", notes);
    if (status === "COMPLETED" && actualCompletedDate) {
      formData.append("actual_completed_date", actualCompletedDate);
    }
    filesToUpload.forEach((file) => {
      formData.append("files", file);
    });
    onSubmit(formData);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFilesToUpload((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveFile = (fileName) => {
    setFilesToUpload((prev) => prev.filter((file) => file.name !== fileName));
  };

  return (
    <form onSubmit={handleSubmit} className="update-status-form">
      {stepStatus.attachments && stepStatus.attachments.length > 0 && (
        <div className="form-group">
          <label>Existing Attachments</label>
          <div className="existing-attachments-list">
            {stepStatus.attachments.map((att) => (
              <a
                key={att.id}
                href={att.file}
                target="_blank"
                rel="noopener noreferrer"
              >
                📎 {att.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {status === "COMPLETED" && (
        <div className="form-group">
          <label htmlFor="actual_completed_date">Actual Completion Date</label>
          <input
            type="date"
            id="actual_completed_date"
            value={actualCompletedDate}
            onChange={(e) => setActualCompletedDate(e.target.value)}
            required
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows="4"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        ></textarea>
      </div>

      <>
        <div className="form-group">
          <label htmlFor="attachments">Add Attachments</label>
          <input
            type="file"
            id="attachments"
            multiple
            onChange={handleFileChange}
          />
        </div>

        {filesToUpload.length > 0 && (
          <div className="file-preview-list">
            {filesToUpload.map((file, index) => (
              <div key={index} className="file-preview-item">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.name)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </div>
    </form>
  );
}

export default UpdateStepStatusForm;
