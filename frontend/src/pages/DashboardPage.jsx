// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useRef } from 'react'
import apiClient from '../api'
import Chart from 'chart.js/auto'
import './DashboardPage.css'

function StatCard({ title, value }) {
  return (
    <div className='stat-card'>
      <p className='stat-card-title'>{title}</p>
      <h2 className='stat-card-value'>{value}</h2>
    </div>
  )
}

function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const statusChartRef = useRef(null)
  const priorityChartRef = useRef(null)
  const assigneeChartRef = useRef(null) // 1. เพิ่ม ref สำหรับกราฟใหม่

  const chartInstances = useRef({})

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get('/api/dashboard-stats/')
        setStats(response.data)
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  useEffect(() => {
    if (stats) {
      const defaultTooltipCallbacks = {
        title: function (tooltipItems) {
          const item = tooltipItems[0]
          let label = item.chart.data.labels[item.dataIndex]
          if (Array.isArray(label)) {
            return label.join(' ')
          }
          return label
        },
      }

      // --- Status Distribution Chart (Donut) ---
      if (statusChartRef.current) {
        if (chartInstances.current.statusChart) {
          chartInstances.current.statusChart.destroy()
        }
        const statusCtx = statusChartRef.current.getContext('2d')
        chartInstances.current.statusChart = new Chart(statusCtx, {
          type: 'doughnut',
          data: {
            labels: Object.keys(stats.status_distribution),
            datasets: [
              {
                label: 'Tasks by Status',
                data: Object.values(stats.status_distribution),
                backgroundColor: ['#5a9eee', '#f0ad4e', '#5cb85c'],
                borderColor: '#1e1e1e',
                borderWidth: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: '#e0e0e0' } },
              tooltip: { callbacks: defaultTooltipCallbacks },
            },
          },
        })
      }

      // --- Priority Distribution Chart (Bar) ---
      if (priorityChartRef.current) {
        if (chartInstances.current.priorityChart) {
          chartInstances.current.priorityChart.destroy()
        }
        const priorityCtx = priorityChartRef.current.getContext('2d')
        chartInstances.current.priorityChart = new Chart(priorityCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(stats.priority_distribution),
            datasets: [
              {
                label: 'Tasks by Priority',
                data: Object.values(stats.priority_distribution),
                backgroundColor: ['#d9534f', '#5cb85c', '#f0ad4e'],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, ticks: { color: '#a0a0a0' } },
              x: { ticks: { color: '#a0a0a0' } },
            },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: defaultTooltipCallbacks },
            },
          },
        })
      }

      // --- 2. เพิ่ม Logic การสร้างกราฟใหม่: Assignee Task Load (Horizontal Bar) ---
      if (assigneeChartRef.current && stats.assignee_task_load) {
        if (chartInstances.current.assigneeChart) {
          chartInstances.current.assigneeChart.destroy()
        }
        const assigneeCtx = assigneeChartRef.current.getContext('2d')
        chartInstances.current.assigneeChart = new Chart(assigneeCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(stats.assignee_task_load),
            datasets: [
              {
                label: 'จำนวนงานที่ได้รับมอบหมาย',
                data: Object.values(stats.assignee_task_load),
                backgroundColor: '#00A6A6',
                borderColor: '#1e1e1e',
                borderWidth: 2,
              },
            ],
          },
          options: {
            indexAxis: 'y', // ทำให้เป็นกราฟแท่งแนวนอน
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                beginAtZero: true,
                ticks: { color: '#a0a0a0', stepSize: 1 },
              },
              y: { ticks: { color: '#a0a0a0' } },
            },
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: defaultTooltipCallbacks },
            },
          },
        })
      }
    }
  }, [stats])

  if (loading) {
    return <div>Loading dashboard...</div>
  }

  if (!stats) {
    return <div>Could not load dashboard data.</div>
  }

  return (
    <div>
      {/* 3. อัปเดต Stat Cards */}
      <div className='dashboard-grid mb-8'>
        <StatCard title='Total Projects' value={stats.total_projects} />
        <StatCard title='Total Tasks' value={stats.total_tasks} />
        <StatCard
          title='Tasks In Progress'
          value={stats.status_distribution['In Progress'] || 0}
        />
        <StatCard title='Tasks Done' value={stats.completed_tasks || 0} />
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <div className='chart-card'>
          <h3>Tasks by Status</h3>
          <div className='chart-container'>
            <canvas ref={statusChartRef}></canvas>
          </div>
        </div>
        <div className='chart-card'>
          <h3>Tasks by Priority</h3>
          <div className='chart-container'>
            <canvas ref={priorityChartRef}></canvas>
          </div>
        </div>
        {/* 4. เพิ่ม Chart Card ใหม่ */}
        <div className='chart-card lg:col-span-2'>
          <h3>Assignee Task Load</h3>
          <div className='chart-container'>
            <canvas ref={assigneeChartRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
