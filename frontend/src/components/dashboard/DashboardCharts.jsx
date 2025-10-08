import React, { useEffect, useState } from "react";
import apiClient from "../../api";
// ✅ 1. IMPORT components จาก Recharts
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";
import "./DashboardCharts.css"; // ใช้ CSS เดิมได้

const DashboardCharts = ({ fiscalYear }) => {
  const [statusData, setStatusData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const params = {};
        if (fiscalYear) {
          params.fiscal_year = fiscalYear;
        }

        const [statusRes, trendRes] = await Promise.all([
          apiClient.get("/api/workflows/summary/status-breakdown/", { params }),
          apiClient.get("/api/workflows/summary/performance-trend/", {
            params,
          }),
        ]);

        // ✅ 2. แปลงข้อมูล Status ให้ Recharts ใช้งานได้
        const statusChartData = [
          { name: "On Time", value: statusRes.data.on_time },
          { name: "Nearing SLA", value: statusRes.data.nearing_sla },
          { name: "Overdue", value: statusRes.data.overdue },
        ].filter((item) => item.value > 0); // กรองเอาเฉพาะที่มีค่ามากกว่า 0
        setStatusData(statusChartData);

        // ✅ 3. แปลงข้อมูล Trend ให้ Recharts ใช้งานได้
        const trendChartData = trendRes.data.labels.map((label, index) => ({
          month: label.split(" ")[0], // เอาแค่ชื่อเดือนย่อๆ
          Created: trendRes.data.created_data[index],
          Completed: trendRes.data.completed_data[index],
        }));
        setTrendData(trendChartData);
      } catch (err) {
        setError("Failed to load chart data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [fiscalYear]);

  if (loading) return <div>Loading charts...</div>;
  if (error) return <div className="chart-error">{error}</div>;

  const STATUS_COLORS = ["#198754", "#ffc107", "#dc3545"];

  return (
    <div className="dashboard-charts-grid">
      <div className="chart-container">
        <h5 className="chart-title">
          Active Workflow Status ({fiscalYear || "All Years"})
        </h5>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {statusData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-container">
        <h5 className="chart-title">
          Performance Trend ({fiscalYear || "Last 6 Months"})
        </h5>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Created" fill="#0d6efd" />
            <Bar dataKey="Completed" fill="#198754" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardCharts;
