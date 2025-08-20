// frontend/src/pages/ProjectWorkflowListPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api";
import SummaryCard from "../components/SummaryCard";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import {
  FiActivity,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
} from "react-icons/fi";
import "./WorkflowDashboard.css";
import "./AllTasksPage.css";

function ProjectWorkflowListPage() {
  const [workflows, setWorkflows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [summaryRes, workflowsRes] = await Promise.all([
          apiClient.get("/api/workflows/summary/"),
          apiClient.get("/api/workflows/projects/"),
        ]);
        setSummary(summaryRes.data);
        setWorkflows(workflowsRes.data.results || workflowsRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <div>Loading Dashboard...</div>;

  return (
    <>
      <div className="dashboard-grid">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Workflow Command Center</h1>
          <Link to="/workflows/new" className="create-request-btn">
            + New Project Workflow
          </Link>
        </div>

        {summary && (
          <div className="summary-grid">
            <SummaryCard
              title="In Progress"
              value={summary.in_progress_count}
              icon={<FiActivity />}
            />
            <SummaryCard
              title="Completed"
              value={summary.completed_this_month_count}
              icon={<FiCheckCircle />}
            />
            <SummaryCard
              title="Nearing SLA"
              value={summary.nearing_sla_count}
              icon={<FiClock />}
            />
            <SummaryCard
              title="Overdue"
              value={summary.overdue_count}
              icon={<FiAlertTriangle />}
            />
          </div>
        )}
      </div>

      <div className="list-section" style={{ marginTop: "3rem" }}>
        <h2>All Workflows</h2>
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>PR Number</th>
                <th>Current Step</th>
                <th style={{ width: "20%" }}>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {workflows.length > 0 ? (
                workflows.map((flow) => (
                  <tr
                    key={flow.id}
                    className={flow.is_completed ? "is-completed" : ""}
                  >
                    <td>
                      <Link
                        to={`/workflows/${flow.id}`}
                        className="task-title-link"
                      >
                        {flow.title}
                      </Link>
                    </td>
                    <td>{flow.pr_number || "---"}</td>
                    <td>
                      {flow.is_completed ? (
                        <span style={{ color: "#198754", fontWeight: 500 }}>
                          Completed
                        </span>
                      ) : (
                        flow.current_step?.step?.name || "---"
                      )}
                    </td>
                    <td>
                      <ProgressBar
                        current={flow.completed_step_count}
                        total={flow.total_step_count}
                      />
                    </td>
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
                  <td colSpan="5">
                    <EmptyState message="No workflows found. Create a new one to get started!" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default ProjectWorkflowListPage;
