// frontend/src/pages/workflows/components/EditWorkflowForm.jsx
import React, { useState, useEffect } from "react";
import "./EditWorkflowForm.css";

function EditWorkflowForm({ workflow, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    pr_number: "",
    budget_amount: "",
    fiscal_year: "",
    start_date: "", // ✅ ADDED
  });

  useEffect(() => {
    if (workflow) {
      setFormData({
        title: workflow.title || "",
        pr_number: workflow.pr_number || "",
        budget_amount: workflow.budget_amount || "",
        fiscal_year: workflow.fiscal_year || "",
        // ✅ ADDED: Format date for the input field
        start_date: workflow.start_date
          ? new Date(workflow.start_date).toISOString().split("T")[0]
          : "",
      });
    }
  }, [workflow]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      budget_amount: formData.budget_amount || null,
      fiscal_year: formData.fiscal_year || null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-workflow-form">
      <div className="form-group">
        <label htmlFor="title">Project Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      {/* --- ✅ ADDED: Start Date input --- */}
      <div className="form-group">
        <label htmlFor="start_date">Workflow Start Date</label>
        <input
          type="date"
          name="start_date"
          value={formData.start_date}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="pr_number">PR Number</label>
        <input
          type="text"
          name="pr_number"
          value={formData.pr_number}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="budget_amount">Budget Amount</label>
        <input
          type="number"
          step="0.01"
          name="budget_amount"
          value={formData.budget_amount}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="fiscal_year">Fiscal Year</label>
        <input
          type="number"
          name="fiscal_year"
          value={formData.fiscal_year}
          onChange={handleChange}
        />
      </div>
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

export default EditWorkflowForm;
