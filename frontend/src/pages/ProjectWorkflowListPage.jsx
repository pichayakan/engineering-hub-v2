// frontend/src/pages/ProjectWorkflowListPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api";
import "./AllTasksPage.css"; // ใช้ CSS เดิมบางส่วน

function ProjectWorkflowListPage() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/api/workflows/projects/");
        setWorkflows(response.data.results || response.data);
      } catch (error) {
        console.error("Failed to fetch project workflows", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, []);

  if (loading) return <div>Loading workflows...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Project Workflows</h1>
        {/* We will create the "New" page later */}
        <Link to="/workflows/new" className="create-request-btn">
          + New Project Workflow
        </Link>
      </div>
      <div className="tasks-table-wrapper">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>PR Number</th>
              <th>Fiscal Year</th>
              <th>Date Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {workflows.length > 0 ? (
              workflows.map((flow) => (
                <tr key={flow.id}>
                  <td>
                    <Link
                      to={`/workflows/${flow.id}`}
                      className="task-title-link"
                    >
                      {flow.title}
                    </Link>
                  </td>
                  <td>{flow.pr_number || "---"}</td>
                  <td>{flow.fiscal_year || "---"}</td>
                  <td>{new Date(flow.created_at).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        flow.is_completed
                          ? "status-completed"
                          : "status-inprogress"
                      }`}
                    >
                      {flow.is_completed ? "Completed" : "In Progress"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="3"
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  No project workflows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectWorkflowListPage;
