import React, { useState, useEffect } from 'react'
import apiClient from '../api'
import './WorkloadDashboardPage.css'

function WorkloadDashboardPage() {
  const [workloadData, setWorkloadData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWorkload = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get('/api/workload-dashboard/')
        setWorkloadData(response.data)
      } catch (error) {
        console.error('Failed to fetch workload data', error)
      } finally {
        setLoading(false)
      }
    }
    fetchWorkload()
  }, [])

  if (loading) return <div>Loading workload dashboard...</div>

  return (
    <div className='workload-dashboard-container'>
      <h1>Members Workload Dashboard</h1>
      {workloadData.map((team) => (
        <div key={team.id} className='team-workload-card'>
          <h2>{team.name}</h2>
          <div className='workload-table-wrapper'>
            <table className='workload-table'>
              <thead>
                <tr>
                  <th>Member</th>
                  <th style={{ textAlign: 'center' }}>Total Tasks</th>
                  <th style={{ textAlign: 'center' }}>Pending Accept</th>
                  <th style={{ textAlign: 'center' }}>Accepted</th>
                  <th style={{ textAlign: 'center' }}>To Do</th>
                  <th style={{ textAlign: 'center' }}>In Progress</th>
                  <th style={{ textAlign: 'center' }}>Done</th>
                </tr>
              </thead>
              <tbody>
                {team.members_workload.map((member) => (
                  <tr key={member.id}>
                    <td>
                      {member.first_name} {member.last_name} ({member.username})
                    </td>
                    <td className='stat-cell stat-total'>
                      {member.total_tasks}
                    </td>
                    <td className='stat-cell stat-pending'>
                      {member.pending_tasks}
                    </td>
                    <td className='stat-cell stat-accepted'>
                      {member.accepted_tasks}
                    </td>
                    <td className='stat-cell stat-todo'>{member.todo_tasks}</td>
                    <td className='stat-cell stat-inprogress'>
                      {member.inprogress_tasks}
                    </td>
                    <td className='stat-cell stat-done'>{member.done_tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

export default WorkloadDashboardPage
