// frontend/src/pages/CreateWorkflowPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../api";
import { toast, ToastContainer } from "react-toastify";
import "./CreateWorkflowPage.css";

function CreateWorkflowPage() {
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");

  const [prNumber, setPrNumber] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear() + 1); // Default to next year
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch all available workflow templates to populate the dropdown
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await apiClient.get("/api/procurement/templates/");
        setTemplates(response.data.results || response.data);
      } catch (error) {
        console.error("Failed to fetch templates", error);
        toast.error("Could not load workflow templates.");
      }
    };
    fetchTemplates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !templateId) {
      toast.warn("Please provide a title and select a template.");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        title: title,
        template: templateId,
        pr_number: prNumber, // ✅ Add to payload
        budget_amount: budgetAmount || null, // ✅ Add to payload, send null if empty
        fiscal_year: fiscalYear || null, // ✅ Add to payload, send null if empty
      };
      const response = await apiClient.post(
        "/api/workflows/projects/",
        payload
      );
      toast.success("Workflow created successfully!");
      // Redirect to the detail page of the newly created workflow
      navigate(`/workflows/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create workflow", error);
      toast.error(error.response?.data?.detail || "Failed to create workflow.");
      setIsLoading(false);
    }
  };

  return (
    <div className="create-workflow-container">
      <div className="page-header">
        <h1>Create New Project Workflow</h1>
      </div>
      <form onSubmit={handleSubmit} className="create-workflow-form">
        <div className="form-card">
          <div className="form-group">
            <label htmlFor="title">Project Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Onboarding for new IT staff"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="template">Workflow Template</label>
            <select
              id="template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              required
            >
              <option value="" disabled>
                -- Select a Template --
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="pr_number">PR Number (Optional)</label>
            <input
              type="text"
              id="pr_number"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="budget_amount">Budget Amount (Optional)</label>
            <input
              type="number"
              step="0.01"
              id="budget_amount"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="fiscal_year">Fiscal Year (Optional)</label>
            <input
              type="number"
              id="fiscal_year"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link to="/workflows" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create and Start Workflow"}
          </button>
        </div>
      </form>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default CreateWorkflowPage;
