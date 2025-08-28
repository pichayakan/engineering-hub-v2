// frontend/src/pages/ProcurementDashboardPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiClock, FiFileText, FiCheckCircle, FiInbox } from "react-icons/fi";
import apiClient from "../api";
import SummaryCard from "../components/SummaryCard";
import { useAuth } from "../context/AuthContext"; // ✅ IMPORT useAuth
import "./ProcurementDashboardPage.css";
import "./AllTasksPage.css"; // For table styles
import ViewToggle from "../components/ViewToggle";
import LoadingSpinner from "../components/LoadingSpinner";

function ProcurementDashboardPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [yourTasks, setYourTasks] = useState([]);
  const [allOngoingTasks, setAllOngoingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // ✅ Get the logged-in user

  const [viewMode, setViewMode] = useState("my_view");

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // --- ✅ MODIFIED: Add view_mode to API calls ---
        const params = { view_mode: viewMode };

        const [summaryRes, tasksRes] = await Promise.all([
          apiClient.get("/api/procurement/summary/", { params }),
          apiClient.get("/api/procurement/requests/?is_completed=false", {
            params,
          }),
        ]);

        setSummaryData(summaryRes.data);
        const allTasks = tasksRes.data.results || [];
        const onGoingTasks = allTasks.filter(
          (task) => !task.is_cancelled && task.current_step_details
        );

        const userGroupIds = user.groups || [];
        const userTasks = allTasks.filter(
          (task) =>
            !task.is_cancelled &&
            task.current_step_details?.responsible_groups?.some((groupId) =>
              userGroupIds.includes(groupId)
            )
        );

        setYourTasks(userTasks);
        setAllOngoingTasks(onGoingTasks);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, viewMode]);

  if (loading) {
    return <LoadingSpinner message="Loading procurement requests..." />;
  }

  return (
    <div className="procurement-dashboard">
      <div className="page-header">
        <h1>แดชบอร์ดส่วนงาน วขตป. </h1>
        <Link to="/procurement/new" className="create-request-btn">
          + Create New Request
        </Link>
      </div>
      {summaryData && (
        <div className="summary-grid">
          <SummaryCard
            title="Ongoing Procurements"
            value={summaryData.ongoing_count}
            icon={<FiFileText />}
          />
          <SummaryCard
            title="Pending Your Approval"
            value={summaryData.pending_your_approval_count}
            icon={<FiInbox />}
          />
          <SummaryCard
            title="Overdue Requests"
            value={summaryData.overdue_count}
            icon={<FiClock />}
          />
          <SummaryCard
            title="Completed This Month"
            value={summaryData.completed_this_month_count}
            icon={<FiCheckCircle />}
          />
        </div>
      )}

      <div className="dashboard-controls">
        <ViewToggle
          viewMode={viewMode}
          setViewMode={setViewMode}
          option1={{ label: "My View", value: "my_view" }}
          option2={{ label: "All Users View", value: "all_view" }}
        />
      </div>

      <div className="dashboard-section">
        <h2>รอการอนุมัติจากคุณ</h2>
        <div className="actionable-list">
          {yourTasks.length > 0 ? (
            yourTasks.map((task) => (
              <Link
                to={`/procurement/requests/${task.id}`}
                key={task.id}
                className="actionable-item"
              >
                <span>{task.title}</span>
                <span className="task-step">
                  {task.current_step_details?.name || "N/A"}
                </span>
              </Link>
            ))
          ) : (
            <p>You have no tasks waiting for your approval.</p>
          )}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>อยู่ระหว่างดำเนินการ</h2>
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Budget</th>
                <th>Current Step</th>
              </tr>
            </thead>
            <tbody>
              {allOngoingTasks.length > 0 ? (
                allOngoingTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <Link
                        to={`/procurement/requests/${task.id}`}
                        className="task-title-link"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td>{task.category_details?.name || "N/A"}</td>
                    <td>
                      {task.budget_amount
                        ? parseFloat(task.budget_amount).toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )
                        : "N/A"}
                    </td>
                    <td>{task.current_step_details?.name || "N/A"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    No ongoing procurements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProcurementDashboardPage;
