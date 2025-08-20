// frontend/src/pages/CreateWorkflowPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api';
import { toast, ToastContainer } from 'react-toastify';
import './CreateWorkflowPage.css';

function CreateWorkflowPage() {
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await apiClient.get('/api/procurement/templates/');
        setTemplates(response.data.results || response.data);
      } catch (error) {
        console.error("Failed to fetch templates", error);
        toast.error("Could not load workflow templates.");
      }
    };
    fetchTemplates();
  }, []);

  // --- ✅ ADDED: Handler to limit budget input to 10 digits ---
  const handleBudgetChange = (e) => {
    const value = e.target.value;
    // Check the length of the integer part only
    const integerPart = value.split('.')[0];
    if (integerPart.length <= 10) {
      setBudgetAmount(value);
    }
  };

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
        pr_number: prNumber,
        budget_amount: budgetAmount || null,
        fiscal_year: fiscalYear || null,
        start_date: startDate,
      };
      const response = await apiClient.post('/api/workflows/projects/', payload);
      toast.success("Workflow created successfully!");
      navigate(`/workflows/${response.data.id}`);
    } catch (error)
    {
      console.error("Failed to create workflow", error);
      const errorMsg = error.response?.data 
        ? Object.values(error.response.data).join(' ') 
        : "Failed to create workflow.";
      toast.error(errorMsg);
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
          {/* ... other form groups for title, template, start_date, pr_number ... */}
          <div className="form-group">
            <label htmlFor="title">Project Title</label>
            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="template">Workflow Template</label>
            <select id="template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
              <option value="" disabled>-- Select a Template --</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="start_date">Workflow Start Date</label>
            <input type="date" id="start_date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="pr_number">PR Number (Optional)</label>
            <input type="text" id="pr_number" value={prNumber} onChange={(e) => setPrNumber(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="budget_amount">Budget Amount (max 10 digits)</label>
            <input 
              type="number" 
              step="0.01" 
              id="budget_amount" 
              value={budgetAmount} 
              // --- ✅ MODIFIED: Use the new handler ---
              onChange={handleBudgetChange} 
            />
          </div>

          <div className="form-group">
            <label htmlFor="fiscal_year">Fiscal Year (Optional)</label>
            <input type="number" id="fiscal_year" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} />
          </div>
        </div>

        <div className="form-actions">
           <Link to="/workflows" className="btn btn-secondary">Cancel</Link>
           <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create and Start Workflow'}
          </button>
        </div>
      </form>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default CreateWorkflowPage;