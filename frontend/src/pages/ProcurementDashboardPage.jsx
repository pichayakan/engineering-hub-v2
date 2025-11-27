// frontend/src/pages/ProcurementDashboardPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiClock, FiFileText, FiCheckCircle, FiInbox } from "react-icons/fi";
import apiClient from "../api";
import SummaryCard from "../components/SummaryCard";
import { useAuth } from "../context/AuthContext";
import "./ProcurementDashboardPage.css";
import "./AllTasksPage.css"; // For table styles
import ViewToggle from "../components/ViewToggle";
import LoadingSpinner from "../components/LoadingSpinner";

// --- ✅ 1. IMPORT RECHARTS ---
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

function ProcurementDashboardPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [yourTasks, setYourTasks] = useState([]);
  const [allOngoingTasks, setAllOngoingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState("my_view");

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const params = { view_mode: viewMode, page_size: 100 };

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
        <h1>แดชบอร์ดงานจัดหา (Procurement)</h1>
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

      {/* --- ✅ 2. ส่วนกราฟสรุปแยกตามแผนก (แสดงเฉพาะถ้ามีข้อมูลจาก Backend) --- */}
      {summaryData?.department_stats?.length > 0 && (
        <div className="dashboard-section">
          <h2>ปริมาณงานค้างดำเนินการ แยกตามแผนกต้นทาง</h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={summaryData.department_stats}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="requesting_department"
                  type="category"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [value, "จำนวนงาน"]}
                  cursor={{ fill: "transparent" }}
                />
                <Bar
                  dataKey="count"
                  name="Ongoing Tasks"
                  barSize={20}
                  radius={[0, 4, 4, 0]}
                >
                  {summaryData.department_stats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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
                {/* --- ✅ 3. ปรับการแสดงผลให้มีชื่อแผนก --- */}
                <div className="actionable-info">
                  <span className="actionable-title">{task.title}</span>
                  <span className="actionable-dept">
                    จาก: {task.requesting_department || "Unknown"}
                  </span>
                </div>
                <span className="task-step">
                  {task.current_step_details?.name || "N/A"}
                </span>
              </Link>
            ))
          ) : (
            <p style={{ padding: "1rem", color: "#6c757d" }}>
              คุณไม่มีรายการที่ต้องอนุมัติในขณะนี้
            </p>
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
                <th>Department</th> {/* ✅ 4. เพิ่มคอลัมน์แผนก */}
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
                    {/* ✅ แสดงชื่อแผนก */}
                    <td>{task.requesting_department || "-"}</td>
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
                    <td>
                      {/* เพิ่ม Badge ให้ดูสวยงามขึ้น */}
                      <span className="status-badge-wf status-IN_PROGRESS">
                        {task.current_step_details?.name || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
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
