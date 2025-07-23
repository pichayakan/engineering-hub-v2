// frontend/src/pages/ProcurementListPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api'
import './AllTasksPage.css'
import './ProcurementListPage.css'

function ProcurementListPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/procurement/requests/')
      setRequests(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to fetch procurement requests', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  if (loading) return <div>Loading procurement requests...</div>

  return (
    <div>
      <div className='page-header'>
        <h1>Procurement Requests</h1>
        {/* --- ส่วนที่แก้ไข --- */}
        <Link to='/procurement/new' className='create-request-btn'>
          + Create New Request
        </Link>
      </div>
      <div className='tasks-table-wrapper'>
        <table className='tasks-table'>
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Current Step</th>
              <th>Created By</th>
              <th>Date Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <Link
                      to={`/procurement/requests/${req.id}`}
                      className='task-title-link'
                    >
                      {req.title}
                    </Link>
                  </td>
                  <td>{req.project?.name || 'N/A'}</td>
                  <td>{req.current_step_details?.name || 'N/A'}</td>
                  <td>{req.created_by_details?.username || 'N/A'}</td>
                  <td>{new Date(req.created_at).toLocaleDateString()}</td>
                  <td>{req.is_completed ? 'Completed' : 'In Progress'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan='6'
                  style={{ textAlign: 'center', padding: '2rem' }}
                >
                  No procurement requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProcurementListPage
