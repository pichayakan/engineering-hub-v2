// frontend/src/pages/DashboardPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react' // เพิ่ม useCallback
import apiClient from '../api'
import Chart from 'chart.js/auto'
import './DashboardPage.css'

function StatCard({ title, value, icon }) {
  return (
    <div className='stat-card'>
      <div className='stat-card-icon'>{icon}</div>
      <div>
        <p className='stat-card-title'>{title}</p>
        <h2 className='stat-card-value'>{value}</h2>
      </div>
    </div>
  )
}

function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const statusChartRef = useRef(null)
  const departmentChartRef = useRef(null)
  const chartInstances = useRef({})

  // --- ส่วนที่แก้ไข: สร้างฟังก์ชัน fetchStats ---
  const fetchStats = useCallback(async () => {
    // ไม่ต้อง setLoading ที่นี่ เพื่อการ refresh ที่ลื่นไหล
    try {
      const response = await apiClient.get('/api/dashboard-stats/')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error)
    } finally {
      setLoading(false) // จะทำงานแค่ครั้งแรก
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchStats() // เรียกครั้งแรกตอนโหลด

    // --- เพิ่ม Logic การ refetch เมื่อผู้ใช้กลับมาที่หน้านี้ ---
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab is visible, refetching dashboard data...')
        fetchStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchStats])

  useEffect(() => {
    // --- DEBUG LOG: เราจะ log ดูข้อมูล stats ทั้งหมดที่ได้รับมา ---
    console.log('Dashboard stats received:', stats)

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
      if (statusChartRef.current && stats.status_distribution) {
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
                backgroundColor: ['#5cb85c', '#f0ad4e', '#5a9eee'], // Done, In Progress, To Do
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

      // --- Department Task Load Chart (Bar) ---
      if (departmentChartRef.current && stats.department_task_load) {
        if (chartInstances.current.departmentChart) {
          chartInstances.current.departmentChart.destroy()
        }
        const deptCtx = departmentChartRef.current.getContext('2d')
        chartInstances.current.departmentChart = new Chart(deptCtx, {
          type: 'bar',
          data: {
            labels: Object.keys(stats.department_task_load),
            datasets: [
              {
                label: 'Tasks Assigned',
                data: Object.values(stats.department_task_load),
                backgroundColor: '#00A6A6',
                borderRadius: 4,
              },
            ],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                beginAtZero: true,
                ticks: { color: '#a0a0a0', stepSize: 1 },
              },
              y: { ticks: { color: '#e0e0e0' } },
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
      <h1>Overall Dashboard</h1>
      <div className='dashboard-grid mb-8'>
        <StatCard
          title='Total Projects'
          value={stats.total_projects}
          icon='📂'
        />
        <StatCard title='Total Tasks' value={stats.total_tasks} icon='📝' />
        <StatCard
          title='Unclaimed Tasks'
          value={stats.unclaimed_tasks}
          icon='❓'
        />
        <StatCard
          title='Total Departments'
          value={stats.total_departments}
          icon='🏢'
        />
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <div className='chart-card'>
          <h3>Tasks by Status</h3>
          <div className='chart-container'>
            <canvas ref={statusChartRef}></canvas>
          </div>
        </div>
        <div className='chart-card'>
          <h3>Tasks per Department</h3>
          <div className='chart-container'>
            <canvas ref={departmentChartRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
