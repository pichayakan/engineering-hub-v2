// frontend/src/pages/ProcurementDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../api'
import { useAuth } from '../context/AuthContext'
import ProcessStepper from '../components/ProcessStepper.jsx'
import './ProcurementDetailPage.css'

function ProcurementDetailPage() {
  const [request, setRequest] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { requestId } = useParams()
  const { user } = useAuth()

  const fetchRequestDetails = useCallback(async () => {
    setLoading(true)
    try {
      const reqRes = await apiClient.get(
        `/api/procurement/requests/${requestId}/`
      )
      setRequest(reqRes.data)

      if (reqRes.data.workflow_template) {
        const wfRes = await apiClient.get(
          `/api/procurement/templates/${reqRes.data.workflow_template}/`
        )
        setWorkflow(wfRes.data)
      }
    } catch (error) {
      console.error('Failed to fetch details', error)
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    fetchRequestDetails()
  }, [fetchRequestDetails])

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      await apiClient.post(
        `/api/procurement/requests/${requestId}/advance-step/`,
        { notes }
      )
      setNotes('')
      fetchRequestDetails() // Refresh data
    } catch (error) {
      console.error('Failed to approve step', error)
      alert(error.response?.data?.error || 'Could not approve step.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div>Loading details...</div>
  if (!request || !workflow) return <div>Could not load data.</div>

  // --- ส่วนที่แก้ไข: เพิ่มการตรวจสอบที่ปลอดภัย ---
  const canApprove = user?.groups?.includes(
    request.current_step_details?.responsible_group
  )

  return (
    <div className='procurement-detail-container'>
      <div className='detail-header'>
        <h1>{request.title}</h1>
        <p>
          Created by: {request.created_by_details.username} on{' '}
          {new Date(request.created_at).toLocaleDateString()}
        </p>
      </div>

      <ProcessStepper
        steps={workflow.steps}
        currentStepId={request.current_step}
        history={request.history}
      />

      <div className='approval-section'>
        <div className='history-card'>
          <h2>Approval History</h2>
          <div className='history-timeline'>
            {request.history.map((h) => (
              <div key={h.id} className='history-item'>
                <p className='history-step-name'>{h.step.name}</p>
                <p className='history-meta'>
                  Approved by {h.approved_by_details.username} on{' '}
                  {new Date(h.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className='action-card'>
          <h2>
            Current Step: {request.current_step_details?.name || 'Completed'}
          </h2>
          {request.is_completed ? (
            <p>This request is fully completed.</p>
          ) : (
            <div className='form-group'>
              <label htmlFor='notes'>Approval Notes (Optional)</label>
              <textarea
                id='notes'
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows='4'
              ></textarea>
              <button
                onClick={handleApprove}
                className='approve-button'
                disabled={!canApprove || isSubmitting}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : 'Approve & Advance to Next Step'}
              </button>
              {!canApprove && (
                <p
                  style={{
                    color: '#dc3545',
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                  }}
                >
                  You do not have permission to approve this step.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link to='/procurement' className='nav-link'>
          ← Back to Procurement List
        </Link>
      </div>
    </div>
  )
}

export default ProcurementDetailPage
