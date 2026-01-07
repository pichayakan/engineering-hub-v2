// frontend/src/pages/CreateProcurementPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import apiClient from "../api";
import "../components/AddProject.css"; // ใช้สไตล์ฟอร์มร่วมกัน
import "../components/MultiSelect.css";
import "./CreateProcurementPage.css";

function CreateProcurementPage() {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(null);
  const [workflowTemplate, setWorkflowTemplate] = useState(null);

  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);

  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, templatesRes, categoriesRes] = await Promise.all([
          apiClient.get("/api/projects/"),
          apiClient.get("/api/procurement/templates/"),
          apiClient.get("/api/procurement/categories/"), // Fetch categories
        ]);

        // --- ส่วนที่แก้ไข ---
        // ทำให้รองรับข้อมูลทั้งแบบแบ่งหน้าและไม่แบ่งหน้า
        setProjects(projectsRes.data.results || projectsRes.data);
        setTemplates(templatesRes.data.results || templatesRes.data);

        setCategories(categoriesRes.data.results || categoriesRes.data);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
  }, []);

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const templateOptions = templates.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workflowTemplate || !category) {
      // ✅ Added check for category
      alert("Please select a workflow template and a category.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await apiClient.post("/api/procurement/requests/", {
        title,
        project: project ? project.value : null,
        workflow_template: workflowTemplate.value,
        category: category.value,
      });
      // ไปยังหน้ารายละเอียดของเรื่องที่เพิ่งสร้าง
      navigate(`/procurement/requests/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create procurement request", error);
      alert("Could not create the request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-procurement-container">
      <div className="form-card">
        <h1>สร้างคำร้องถึง - ส่วนวิศวะกรรมฯ(วขตป.)</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reqTitle">Title</label>
            <input
              id="reqTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reqCategory">Category</label>
            <Select
              id="reqCategory"
              options={categoryOptions}
              className="multi-select-container"
              classNamePrefix="multi-select"
              value={category}
              onChange={setCategory}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reqProject">Link to Project (Optional)</label>
            <Select
              id="reqProject"
              options={projectOptions}
              isClearable
              className="multi-select-container"
              classNamePrefix="multi-select"
              value={project}
              onChange={setProject}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reqTemplate">Workflow Template</label>
            <Select
              id="reqTemplate"
              options={templateOptions}
              className="multi-select-container"
              classNamePrefix="multi-select"
              value={workflowTemplate}
              onChange={setWorkflowTemplate}
              required
            />
          </div>
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateProcurementPage;
