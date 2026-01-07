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

  const [historyTasks, setHistoryTasks] = useState([]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

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

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const params = {
          is_completed: true, // ดึงเฉพาะงานที่เสร็จแล้ว
          is_cancelled: false,
          created_year: filterYear, // ส่งค่าปีไป Backend
          created_month: filterMonth, // ส่งค่าเดือนไป Backend
          ordering: "-created_at",
        };

        // ถ้าต้องการดูทั้งหมด (ไม่กรองเดือน) ให้ส่ง logic จัดการ params ตรงนี้
        if (filterMonth === "all") delete params.created_month;

        const res = await apiClient.get("/api/procurement/requests/", {
          params,
        });
        setHistoryTasks(res.data.results || []);
      } catch (error) {
        console.error("Failed to fetch history", error);
      }
    };

    fetchHistory();
  }, [user, filterYear, filterMonth]); // ทำงานเมื่อ user, ปี หรือ เดือน เปลี่ยน

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
                <th>Department</th>
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
      <div className="dashboard-section" style={{ marginTop: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2>ประวัติรายการที่ดำเนินการเสร็จสิ้น (History)</h2>

          {/* ตัวเลือก Filter */}
          <div style={{ display: "flex", gap: "10px" }}>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={{
                padding: "5px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <option value="all">ทุกเดือน</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleDateString("th-TH", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{
                padding: "5px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <option key={y} value={y}>
                    {y + 543}
                  </option>
                ); // แสดงเป็น พ.ศ.
              })}
            </select>
          </div>
        </div>

        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Department</th>
                <th>Completed Date</th>
                {/* วันที่เสร็จสิ้น (ใช้วันที่สร้างแทน หรือต้องไปดึงจาก history ตัวสุดท้าย) */}
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {historyTasks.length > 0 ? (
                historyTasks.map((task) => (
                  <tr key={task.id} style={{ opacity: 0.8 }}>
                    <td>{task.title}</td>
                    <td>{task.requesting_department || "-"}</td>
                    <td>
                      {new Date(task.created_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      <span
                        className="status-badge-wf status-COMPLETED"
                        style={{
                          backgroundColor: "#198754",
                          color: "white",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                        }}
                      >
                        Completed
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/procurement/requests/${task.id}`}
                        className="view-btn"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    ไม่พบประวัติในเดือน/ปี ที่เลือก
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
