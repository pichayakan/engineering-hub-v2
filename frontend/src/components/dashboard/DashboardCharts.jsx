// frontend/src/components/dashboard/DashboardCharts.jsx

import React, { useEffect, useRef, useState } from "react";
import apiClient from "../../api";
import Chart from "chart.js/auto";
import "./DashboardCharts.css";

// ✅ 1. รับ fiscalYear เป็น prop
const DashboardCharts = ({ fiscalYear }) => {
  const statusChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ 2. เพิ่ม fiscalYear ใน dependency array ของ useEffect
  useEffect(() => {
    let statusChartInstance = null;
    let trendChartInstance = null;

    const fetchChartData = async () => {
      try {
        setLoading(true);

        // ✅ 3. สร้าง object สำหรับ params ที่จะส่งไปกับ API
        const params = {};
        if (fiscalYear) {
          params.fiscal_year = fiscalYear;
        }

        // ✅ 4. ส่ง params ไปกับ API call
        const [statusRes, trendRes] = await Promise.all([
          apiClient.get("/api/workflows/summary/status-breakdown/", { params }),
          apiClient.get("/api/workflows/summary/performance-trend/", {
            params,
          }),
        ]);

        // --- Create/Update Status Breakdown Chart (Donut) ---
        if (statusChartRef.current && statusRes.data) {
          // ถ้ามีกราฟอยู่แล้วให้ทำลายทิ้งก่อนสร้างใหม่
          if (Chart.getChart(statusChartRef.current)) {
            Chart.getChart(statusChartRef.current).destroy();
          }
          const statusCtx = statusChartRef.current.getContext("2d");
          statusChartInstance = new Chart(statusCtx, {
            type: "doughnut",
            data: {
              labels: ["On Time", "Nearing SLA", "Overdue"],
              datasets: [
                {
                  data: [
                    statusRes.data.on_time,
                    statusRes.data.nearing_sla,
                    statusRes.data.overdue,
                  ],
                  backgroundColor: ["#198754", "#ffc107", "#dc3545"],
                  hoverOffset: 4,
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: "top" },
                title: {
                  display: true,
                  text: `Active Status (${fiscalYear || "All Years"})`,
                },
              },
            },
          });
        }

        // --- Create/Update Performance Trend Chart (Bar) ---
        if (trendChartRef.current && trendRes.data) {
          // ถ้ามีกราฟอยู่แล้วให้ทำลายทิ้งก่อนสร้างใหม่
          if (Chart.getChart(trendChartRef.current)) {
            Chart.getChart(trendChartRef.current).destroy();
          }
          const trendCtx = trendChartRef.current.getContext("2d");
          trendChartInstance = new Chart(trendCtx, {
            type: "bar",
            data: {
              labels: trendRes.data.labels,
              datasets: [
                {
                  label: "Created",
                  data: trendRes.data.created_data,
                  backgroundColor: "#0d6efd",
                },
                {
                  label: "Completed",
                  data: trendRes.data.completed_data,
                  backgroundColor: "#198754",
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: "top" },
                title: {
                  display: true,
                  text: `Performance Trend (${fiscalYear || "Last 6 Months"})`,
                },
              },
              scales: { y: { beginAtZero: true } },
            },
          });
        }
      } catch (err) {
        setError("Failed to load chart data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();

    // ไม่ต้องมี cleanup function แล้ว เพราะเราจัดการ instance ของ chart ก่อนสร้างใหม่
    // return () => { ... };
  }, [fiscalYear]); // <-- ✅ 2. ใส่ fiscalYear ที่นี่

  if (loading) return <div>Loading charts...</div>;
  if (error) return <div className="chart-error">{error}</div>;

  return (
    <div className="dashboard-charts-grid">
      <div className="chart-container">
        <canvas ref={statusChartRef}></canvas>
      </div>
      <div className="chart-container">
        <canvas ref={trendChartRef}></canvas>
      </div>
    </div>
  );
};

export default DashboardCharts;
