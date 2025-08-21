// frontend/src/pages/ProjectWorkflowListPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api";
import SummaryCard from "../components/SummaryCard";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import PaginationControls from "../components/PaginationControls";
import { formatDate } from "../utils/formatDate";
import {
  FiActivity,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
} from "react-icons/fi";
import "./WorkflowDashboard.css";
import "./AllTasksPage.css";

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  // Generate a list of the current year + 1, and the 4 previous years
  for (let i = 0; i < 5; i++) {
    years.push(currentYear + 1 - i);
  }
  return years;
};

const getSlaStatus = (dueDateStr) => {
  if (!dueDateStr) return { text: "No SLA", className: "sla-pending" };

  const dueDate = new Date(dueDateStr);
  dueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Overdue ${Math.abs(diffDays)}d`, className: "sla-overdue" };
  }
  if (diffDays === 0) {
    return { text: "Due Today", className: "sla-due-soon" };
  }
  return { text: `${diffDays}d left`, className: "sla-on-time" };
};

function ProjectWorkflowListPage() {
  const [workflows, setWorkflows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fiscalYear, setFiscalYear] = useState("");
  const [paginationData, setPaginationData] = useState(null);
  const [workflowsUrl, setWorkflowsUrl] = useState("/api/workflows/projects/");

  const yearOptions = generateYearOptions();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (fiscalYear) {
          params.append("fiscal_year", fiscalYear);
        }
        const queryString = params.toString();

        const summaryUrl = `/api/workflows/summary/?${queryString}`;

        const finalWorkflowsUrl = workflowsUrl.includes("?")
          ? `${workflowsUrl}&${queryString}`
          : `${workflowsUrl}?${queryString}`;

        const [summaryRes, workflowsRes] = await Promise.all([
          apiClient.get(summaryUrl),
          apiClient.get(finalWorkflowsUrl),
        ]);

        setSummary(summaryRes.data);
        setWorkflows(workflowsRes.data.results);
        setPaginationData({
          count: workflowsRes.data.count,
          next: workflowsRes.data.next,
          previous: workflowsRes.data.previous,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [fiscalYear, workflowsUrl]);

  const handlePageChange = (url) => {
    if (url) {
      const relativeUrl = new URL(url).pathname + new URL(url).search;
      setWorkflowsUrl(relativeUrl);
    }
  };

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

      <div className="filter-controls">
        <select
          value={fiscalYear}
          onChange={(e) => {
            setFiscalYear(e.target.value);
            setWorkflowsUrl("/api/workflows/projects/");
          }}
        >
          <option value="">All Fiscal Years</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="list-section" style={{ marginTop: "1rem" }}>
        <h2>All Workflows ({paginationData?.count || 0})</h2>
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>PR Number</th>
                <th>Start Date</th>
                <th>Current Step</th>
                <th>Due Date (SLA)</th> {/* ✅ FIXED a missing bracket here */}
                <th style={{ width: "20%" }}>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {workflows.length > 0 ? (
                workflows.map((flow) => {
                  const sla = getSlaStatus(flow.current_step?.due_date);
                  return (
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
                      <td>{formatDate(flow.start_date)}</td>
                      <td>
                        {flow.is_completed ? (
                          <span style={{ color: "#198754", fontWeight: 500 }}>
                            Completed
                          </span>
                        ) : (
                          flow.current_step?.step?.name || "---"
                        )}
                      </td>
                      <td className={`sla-text ${sla.className}`}>
                        {flow.is_completed ? "---" : sla.text}
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
                  );
                })
              ) : (
                <tr>
                  {/* ✅ Updated colspan to 7 */}
                  <td colSpan="7">
                    <EmptyState message="No workflows found for the selected filter." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          paginationData={paginationData}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
}

export default ProjectWorkflowListPage;
