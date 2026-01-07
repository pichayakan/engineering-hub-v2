// frontend/src/pages/ProcurementAnalyticsPage.jsx
import React, { useState, useEffect } from "react";
import apiClient from "../api";
import "./ProcurementAnalyticsPage.css";
// import LoadingSpinner from "../components/LoadingSpinner";

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

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

function ProcurementAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State สำหรับ Filter
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState("all");
  const [templates, setTemplates] = useState([]);

  // 1. useEffect แรก: ดึงรายชื่อ Workflow Templates มาใส่ Dropdown
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await apiClient.get("/api/procurement/templates/");
        setTemplates(res.data);
      } catch (err) {
        console.error("Failed to fetch templates", err);
      }
    };
    fetchTemplates();
  }, []);

  // 2. useEffect สอง: ดึงข้อมูล Analytics เมื่อ year, month หรือ selectedTemplate เปลี่ยน
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // ส่ง query param ทั้ง year, month และ template_id
        const res = await apiClient.get(
          `/api/procurement/analytics/?year=${year}&month=${month}&template_id=${selectedTemplate}`
        );
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
        setError("ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, month, selectedTemplate]);

  if (loading) {
    return (
      <div
        className="analytics-dashboard"
        style={{
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <p>กำลังประมวลผลข้อมูล...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="analytics-dashboard">
      {/* --- Header --- */}
      <div className="analytics-header">
        <div>
          <h1>Executive Dashboard</h1>
          <p style={{ color: "#6c757d", margin: 0 }}>
            ภาพรวมประสิทธิภาพงานวิศวกรรมฯ
          </p>
        </div>

        {/* ส่วนเลือก Filter (ขวาบน) */}
        <div style={{ display: "flex", gap: "10px" }}>
          {/* Dropdown เลือก Template */}
          <select
            className="year-selector"
            style={{ minWidth: "200px" }}
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            <option value="all">-- ทุกประเภทงาน (All Workflows) --</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>

          {/* Dropdown เลือกเดือน */}
          <select
            className="year-selector"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="all">ทุกเดือน</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleDateString("th-TH", { month: "long" })}
              </option>
            ))}
          </select>

          {/* Dropdown เลือกปี */}
          <select
            className="year-selector"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - i;
              return (
                <option key={y} value={y}>
                  ปีงบประมาณ {y + 543}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* --- Section A: KPI Cards --- */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-title">Total Requests</span>
          <span className="kpi-value">{data.kpi.total}</span>
          <span className="kpi-trend">
            คำขอทั้งหมด (
            {selectedTemplate === "all" ? "รวมทุกประเภท" : "ประเภทนี้"})
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Completion Rate</span>
          <span className="kpi-value">{data.kpi.rate}%</span>
          <span
            className={`kpi-trend ${
              data.kpi.rate >= 80 ? "positive" : "negative"
            }`}
          >
            {data.kpi.completed} รายการเสร็จสิ้น
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Total Budget</span>
          <span className="kpi-value">
            {data.kpi.budget !== null && data.kpi.budget !== undefined
              ? `฿${parseFloat(data.kpi.budget).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}`
              : "-"}
          </span>
          <span className="kpi-trend">งบประมาณรวม</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Avg. Cycle Time</span>
          <span className="kpi-value">{data.kpi.avg_cycle_time || "-"}</span>
          <span className="kpi-trend">วัน/งาน (โดยเฉลี่ย)</span>
        </div>
      </div>

      {/* --- Section B: Main Charts --- */}
      <div className="charts-grid">
        {/* กราฟ 1: Workload รายเดือน */}
        <div className="chart-box">
          <h3>Monthly Workload (ปริมาณงานรายเดือน)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.monthly_chart}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={(val) =>
                  new Date(val).toLocaleDateString("th-TH", { month: "short" })
                }
              />
              <YAxis />
              <Tooltip
                labelFormatter={(val) =>
                  new Date(val).toLocaleDateString("th-TH", {
                    month: "long",
                    year: "numeric",
                  })
                }
                formatter={(value) => [value, "รายการ"]}
              />
              <Legend />
              <Bar
                dataKey="created_count"
                name="งานเข้าใหม่"
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="completed_count"
                name="งานเสร็จสิ้น"
                fill="#82ca9d"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* กราฟ 2: Top Requesters */}
        <div className="chart-box">
          <h3>Top Requesters (ผู้สร้างคำขอสูงสุด 10 อันดับ)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              layout="vertical"
              data={data.user_chart}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
              />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                formatter={(value) => [value, "รายการ"]}
              />
              <Bar
                dataKey="count"
                name="จำนวนงาน"
                barSize={20}
                radius={[0, 4, 4, 0]}
                fill="#FF8042"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* กราฟ 3: แยกตามแผนก */}
        <div className="chart-box">
          <h3>Requests by Department (สัดส่วนงานตามแผนก)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              layout="vertical"
              data={data.dept_chart}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
              <Tooltip cursor={{ fill: "transparent" }} />
              <Bar
                dataKey="count"
                name="จำนวนงาน"
                barSize={20}
                radius={[0, 4, 4, 0]}
              >
                {data.dept_chart &&
                  data.dept_chart.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* กราฟ 4: Bottleneck Analysis */}
        {data.step_chart && data.step_chart.length > 0 && (
          <div className="chart-box" style={{ gridColumn: "1 / -1" }}>
            <h3>Avg. Time per Process Step (ระยะเวลาเฉลี่ยแต่ละขั้นตอน)</h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6c757d",
                marginBottom: "1rem",
              }}
            >
              {selectedTemplate === "all"
                ? "⚠️ ข้อมูลนี้เป็นการเฉลี่ยรวมทุก Workflow อาจทำให้ค่าคลาดเคลื่อน แนะนำให้เลือกประเภทงานเจาะจง"
                : "ข้อมูลระยะเวลาเฉลี่ยของขั้นตอนใน Workflow นี้"}
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.step_chart}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis
                  label={{
                    value: "วัน (Days)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value) => [`${value} วัน`, "เวลาเฉลี่ย"]}
                />
                <Bar
                  dataKey="avg_days"
                  name="เวลาเฉลี่ย (วัน)"
                  fill="#ffc658"
                  radius={[4, 4, 0, 0]}
                >
                  {data.step_chart.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.avg_days > 7 ? "#ff8042" : "#ffc658"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProcurementAnalyticsPage;
