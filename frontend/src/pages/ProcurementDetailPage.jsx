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
  const [filesToUpload, setFilesToUpload] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { requestId } = useParams()
  const { user } = useAuth()

  const fetchRequestDetails = useCallback(async () => {
    // No setLoading here for smoother background refreshes
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
    setLoading(true)
    fetchRequestDetails()
  }, [fetchRequestDetails])

  const handleApprove = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData()
    formData.append('notes', notes)
    filesToUpload.forEach((file) => {
      formData.append('files', file)
    })

    try {
      await apiClient.post(
        `/api/procurement/requests/${requestId}/advance-step/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      setNotes('')
      setFilesToUpload([])
      fetchRequestDetails()
    } catch (error) {
      console.error('Failed to approve step', error)
      alert(error.response?.data?.error || 'Could not approve step.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFilesToUpload((prevFiles) => [
        ...prevFiles,
        ...Array.from(e.target.files),
      ])
    }
  }

  const handleRemoveFile = (fileNameToRemove) => {
    setFilesToUpload((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileNameToRemove)
    )
  }

  const calculateSLA = (dueDateStr) => {
    if (!dueDateStr) return { text: 'Not set', className: '' }

    const today = new Date()
    const dueDate = new Date(dueDateStr)
    // Reset time to compare dates only
    today.setHours(0, 0, 0, 0)

    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        text: `Overdue by ${Math.abs(diffDays)} days`,
        className: 'overdue',
      }
    }
    if (diffDays === 0) {
      return { text: 'Due today', className: 'due-soon' }
    }
    if (diffDays <= 7) {
      return { text: `${diffDays} days left`, className: 'due-soon' }
    }
    return { text: `${diffDays} days left`, className: 'on-time' }
  }

  if (loading) return <div>Loading details...</div>
  if (!request || !workflow) return <div>Could not load data.</div>

  const canApprove = user?.groups?.includes(
    request.current_step_details?.responsible_group
  )
  const sla = calculateSLA(request.current_step_due_date)

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
                <div className='history-meta'>
                  Approved by
                  <strong>
                    {' '}
                    {h.approved_by_details.first_name}{' '}
                    {h.approved_by_details.last_name}{' '}
                  </strong>
                  on {new Date(h.timestamp).toLocaleString()}
                </div>
                <div className='approver-details'>
                  <span>
                    Dept: {h.approved_by_details.department_name || 'N/A'}
                  </span>
                  {h.approved_by_details.groups.map((g) => (
                    <span key={g.id} className='group-badge'>
                      {g.name}
                    </span>
                  ))}
                </div>
                {h.notes && <p className='history-notes'>{h.notes}</p>}
                <div className='history-attachments'>
                  {h.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='attachment-link'
                    >
                      📎 {att.name}
                    </a>
                  ))}
                </div>
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
            <div>
              <div className='sla-info'>
                <p className='sla-title'>Step Due Date</p>
                <p className='sla-date'>
                  {request.current_step_due_date
                    ? new Date(
                        request.current_step_due_date
                      ).toLocaleDateString('en-GB')
                    : 'N/A'}
                </p>
                <p className={`sla-remaining ${sla.className}`}>{sla.text}</p>
              </div>
              <div className='form-group'>
                <label htmlFor='notes'>Approval Notes (Optional)</label>
                <textarea
                  id='notes'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows='3'
                ></textarea>
              </div>
              <div className='form-group'>
                <label htmlFor='attachments'>Attach Files</label>
                <input
                  type='file'
                  id='attachments'
                  multiple
                  onChange={handleFileChange}
                  className='upload-input'
                />
              </div>

              {filesToUpload.length > 0 && (
                <div className='file-preview-list'>
                  {filesToUpload.map((file, index) => (
                    <div key={index} className='file-preview-item'>
                      <span className='file-preview-name'>{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(file.name)}
                        className='remove-file-btn'
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleApprove}
                className='approve-button'
                disabled={!canApprove || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Approve & Advance'}
              </button>
              {!canApprove &&
                request.current_step_details?.responsible_group_details && (
                  <details className='potential-approvers'>
                    <summary>
                      Requires approval from "
                      {
                        request.current_step_details.responsible_group_details
                          .name
                      }
                      "
                    </summary>
                    <ul>
                      {request.current_step_details.responsible_group_details.members?.map(
                        (member) => (
                          <li key={member.id}>
                            - {member.first_name} {member.last_name} (
                            {member.username})
                          </li>
                        )
                      )}
                    </ul>
                  </details>
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
