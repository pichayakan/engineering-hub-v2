// frontend/src/components/workflows/UpdateStepStatusForm.jsx
import React, { useState } from "react";
import "./UpdateStepStatusForm.css";

const STATUS_CHOICES = ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"];

function UpdateStepStatusForm({ stepStatus, onSubmit, onCancel, readOnly }) {
  const [status, setStatus] = useState(stepStatus.status);
  const [notes, setNotes] = useState(stepStatus.notes || "");
  const [filesToUpload, setFilesToUpload] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("status", status);
    formData.append("notes", notes);
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
          disabled={readOnly}
        >
          {STATUS_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows="4"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
        ></textarea>
      </div>

      {!readOnly && (
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
      )}

      <div className="form-actions">
        {readOnly ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Close
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </>
        )}
      </div>
    </form>
  );
}

export default UpdateStepStatusForm;
