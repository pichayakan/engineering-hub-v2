// frontend/src/pages/AssignerPerformancePage.jsx
import React, { useState, useEffect } from 'react'
import apiClient from '../api'
import './AssignerPerformancePage.css'

function AssignerPerformancePage() {
  const [performanceData, setPerformanceData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPerformanceData = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get('/api/assigner-performance/')
        setPerformanceData(response.data)
      } catch (error) {
        console.error('Failed to fetch assigner performance data', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPerformanceData()
  }, [])

  if (loading) return <div>Loading performance data...</div>

  return (
    <div className='performance-dashboard-container'>
      <h1>Assigner Performance</h1>
      {performanceData.map((assigner) => (
        <div key={assigner.id} className='assigner-card'>
          <div className='assigner-header'>
            <div className='assigner-avatar'>
              {assigner.first_name.charAt(0).toUpperCase()}
            </div>
            <div className='assigner-info'>
              <h2>
                {assigner.first_name} {assigner.last_name}
              </h2>
              <p>
                @{assigner.username} | {assigner.created_tasks_details.length}{' '}
                tasks created
              </p>
            </div>
          </div>
          <div className='task-table-wrapper'>
            <table className='task-table'>
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Project</th>
                  <th>Assigned To</th>
                  <th>Date Assigned</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assigner.created_tasks_details.length > 0 ? (
                  assigner.created_tasks_details.map((task) => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>{task.project_name}</td>
                      <td className='assigned-to-cell'>
                        <div className='assignee-group'>
                          {task.assignees_details.map((a) => (
                            <span key={a.id} className='assignee-badge'>
                              {a.first_name} {a.last_name}
                            </span>
                          ))}
                        </div>
                        <div className='assignee-group'>
                          {task.assigned_teams_details.map((t) => (
                            <span key={t.id} className='team-badge'>
                              Team: {t.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{new Date(task.created_at).toLocaleDateString()}</td>
                      <td>{task.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='5' className='no-tasks-row'>
                      No tasks created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

export default AssignerPerformancePage
