// frontend/src/pages/ProcurementListPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api";
import "./AllTasksPage.css";
import "./ProcurementListPage.css";

function ProcurementListPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/api/procurement/requests/");
      setRequests(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch procurement requests", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // --- ฟังก์ชัน Helper สำหรับจัดการ SLA ---
  const calculateSLA = (dueDateStr) => {
    if (!dueDateStr) return { text: "-", className: "" };
    const today = new Date();
    const dueDate = new Date(dueDateStr);
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        text: `Overdue ${Math.abs(diffDays)}d`,
        className: "sla-overdue",
      };
    if (diffDays === 0) return { text: "Due Today", className: "sla-due-soon" };
    return { text: `${diffDays}d left`, className: "sla-on-time" };
  };

  if (loading) return <div>Loading procurement requests...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Procurement Requests</h1>
        <Link to="/procurement/new" className="create-request-btn">
          + Create New Request
        </Link>
      </div>
      <div className="tasks-table-wrapper">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Current Step</th>
              <th>SLA</th>
              <th>Created By</th>
              <th>Date Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map((req) => {
                const sla = calculateSLA(req.current_step_due_date);
                return (
                  <tr
                    key={req.id}
                    className={req.is_completed ? "is-completed" : ""}
                  >
                    <td>
                      <Link
                        to={`/procurement/requests/${req.id}`}
                        className="task-title-link"
                      >
                        {req.title}
                      </Link>
                    </td>
                    <td>{req.project_name || "N/A"}</td>
                    <td>
                      <span
                        className={`status-badge status-${
                          req.current_step_details?.name.replace(/\s+/g, "-") ||
                          "N-A"
                        }`}
                      >
                        {req.current_step_details?.name || "N/A"}
                      </span>
                    </td>
                    <td className={`sla-text ${sla.className}`}>{sla.text}</td>
                    <td>{req.created_by_details?.username || "N/A"}</td>
                    <td>{new Date(req.created_at).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          req.is_completed
                            ? "status-completed"
                            : "status-inprogress"
                        }`}
                      >
                        {req.is_completed ? "Completed" : "In Progress"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  No procurement requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProcurementListPage;
