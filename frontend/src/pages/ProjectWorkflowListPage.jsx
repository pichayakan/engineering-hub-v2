// frontend/src/pages/ProjectWorkflowListPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api";
import SummaryCard from "../components/SummaryCard";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import PaginationControls from "../components/PaginationControls";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import { formatDate } from "../utils/formatDate";
import {
  FiActivity,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import "./WorkflowDashboard.css";
import "./AllTasksPage.css";

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
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

  // ✅ State สำหรับซ่อน/แสดง Dashboard
  const [showDashboard, setShowDashboard] = useState(false);

  const [fiscalYear, setFiscalYear] = useState("");
  const [paginationData, setPaginationData] = useState(null);
  const [workflowsUrl, setWorkflowsUrl] = useState("/api/workflows/projects/");

  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");

  const yearOptions = generateYearOptions();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get("/api/workflows/categories/");
        setCategories(res.data.results || res.data);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (fiscalYear) {
          params.append("fiscal_year", fiscalYear);
        }
        if (categoryFilter) {
          params.append("category", categoryFilter);
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
  }, [fiscalYear, workflowsUrl, categoryFilter]);

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
        <div
          className="page-header"
          style={{ marginBottom: showDashboard ? "1rem" : "0" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h1>ระบบติดตามงาน</h1>
            {/* ✅ ปุ่มกด Toggle */}
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.8rem",
                fontSize: "0.85rem",
                borderRadius: "6px",
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                cursor: "pointer",
                color: "#333",
              }}
            >
              {showDashboard ? (
                <>
                  <FiEyeOff /> Hide Dashboard
                </>
              ) : (
                <>
                  <FiEye /> Show Dashboard
                </>
              )}
            </button>
          </div>
          <Link to="/workflows/new" className="create-request-btn">
            + สร้างใหม่
          </Link>
        </div>

        {/* ✅ แสดง Summary Cards เฉพาะเมื่อ showDashboard เป็น true (เหลือ 1 ชุด) */}
        {showDashboard && summary && (
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
              title="ใกล้ครบกำหนด SLA"
              value={summary.nearing_sla_count}
              icon={<FiClock />}
            />
            <SummaryCard
              title="ขั้นตอนที่เกินเวลา"
              value={summary.overdue_count}
              icon={<FiAlertTriangle />}
            />
          </div>
        )}
      </div>

      {/* ✅ ครอบ DashboardCharts ด้วย showDashboard เพื่อให้ซ่อนกราฟได้สมบูรณ์ */}
      {showDashboard && <DashboardCharts fiscalYear={fiscalYear} />}

      <div
        className="filter-controls"
        style={{ marginTop: showDashboard ? "0" : "1rem" }}
      >
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
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setWorkflowsUrl("/api/workflows/projects/");
          }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
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
                <th>Category</th>
                <th>PR Number</th>
                <th>Handlers</th>
                <th>Start Date</th>
                <th>Current Step</th>
                <th>Due Date (SLA)</th>
                <th style={{ width: "18%" }}>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {workflows.length > 0 ? (
                workflows.map((flow) => {
                  const sla = getSlaStatus(flow.current_step?.due_date);
                  const total = flow.total_step_count || 0;
                  const current = flow.completed_step_count || 0;
                  const percentage =
                    total > 0 ? Math.round((current / total) * 100) : 0;
                  return (
                    <tr
                      key={flow.id}
                      className={flow.is_completed ? "is-completed" : ""}
                    >
                      <td data-label="Title">
                        <Link
                          to={`/workflows/${flow.id}`}
                          className="task-title-link"
                        >
                          {flow.title}
                        </Link>
                      </td>
                      <td data-label="Category">
                        {flow.category?.name || "---"}
                      </td>
                      <td data-label="PR Number">{flow.pr_number || "---"}</td>
                      <td data-label="Handlers">
                        {flow.handlers_details &&
                        flow.handlers_details.length > 0 ? (
                          <div className="handlers-badges-wrapper">
                            {flow.handlers_details.map((user) => (
                              <span key={user.id} className="handler-badge">
                                {user.first_name || user.username}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#adb5bd" }}>---</span>
                        )}
                      </td>
                      <td data-label="Start Date">
                        {formatDate(flow.start_date)}
                      </td>
                      <td data-label="Current Step">
                        {flow.is_completed ? (
                          <span style={{ color: "#198754", fontWeight: 500 }}>
                            Completed
                          </span>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                          >
                            {flow.current_step?.status === "IN_PROGRESS" ? (
                              <span
                                style={{ color: "#0d6efd", fontWeight: 500 }}
                              >
                                ▶ {flow.current_step.step.name}
                              </span>
                            ) : (
                              <span style={{ color: "#6c757d" }}>
                                Next: {flow.current_step?.step?.name || "---"}
                              </span>
                            )}

                            {flow.latest_completed_step && (
                              <small
                                style={{ color: "#198754", fontSize: "0.85em" }}
                              >
                                ✓ Done: {flow.latest_completed_step.step.name}
                              </small>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        data-label="Due Date (SLA)"
                        className={`sla-text ${sla.className}`}
                      >
                        {flow.is_completed ? "---" : sla.text}
                      </td>
                      <td data-label="Progress">
                        <div className="progress-cell-wrapper">
                          <ProgressBar current={current} total={total} />
                          <span className="progress-percentage">
                            {percentage}%
                          </span>
                        </div>
                      </td>
                      <td data-label="Status">
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
                  <td colSpan="9">
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
