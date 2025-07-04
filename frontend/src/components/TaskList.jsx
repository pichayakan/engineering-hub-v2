// frontend/src/components/TaskList.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './TaskList.css'

function TaskList({
  tasks,
  onEdit,
  onDelete,
  onView = () => {},
  onStatusChange = () => {},
  onAcceptTask = () => {},
  onUnacceptTask = () => {},
  showProjectLink = false,
}) {
  const { user } = useAuth()
  const STATUS_OPTIONS = ['To Do', 'In Progress', 'Done']

  if (!tasks || tasks.length === 0) {
    return (
      <p style={{ color: '#a0a0a0', textAlign: 'center', marginTop: '1rem' }}>
        No tasks found.
      </p>
    )
  }

  const formatClassName = (text) => (text ? text.replace(/\s+/g, '-') : '')

  return (
    <div className='task-list-wrapper'>
      {tasks.map((task) => {
        // --- DEBUG LOGGING ---
        // เราจะ log ข้อมูลสำคัญทั้งหมดสำหรับ task นี้
        console.log(`--- DEBUG FOR TASK ID: ${task.id} ---`)
        console.log('Full task object:', task)
        console.log('Current user ID:', user.id)
        console.log("Task's accepted_by array:", task.accepted_by)

        const isCurrentUserAnAssignee = task.assignees_details?.some(
          (assignee) => assignee.id === user.id
        )
        const hasCurrentUserAccepted = task.accepted_by?.includes(user.id)
        const needsToAccept = isCurrentUserAnAssignee && !hasCurrentUserAccepted

        console.log('Has user accepted?', hasCurrentUserAccepted)
        console.log('---------------------------------')

        return (
          <div
            key={task.id}
            className='task-item-clickable'
            onClick={() => onView(task)}
          >
            <div className='task-item'>
              <div className='task-item-content'>
                <div className='task-main-info'>
                  <h4>{task.title}</h4>
                  <div className='task-meta'>
                    <div>
                      <strong>Assignees:</strong>
                      <div className='assignee-list'>
                        {task.assignees_details &&
                        task.assignees_details.length > 0
                          ? task.assignees_details.map((assignee) => (
                              <div key={assignee.id} className='assignee-item'>
                                <span>{assignee.username}</span>
                                {task.accepted_by?.includes(assignee.id) && (
                                  <span className='accepted-badge'>
                                    ✔ Accepted
                                  </span>
                                )}
                              </div>
                            ))
                          : ' Unassigned'}
                      </div>
                    </div>
                    <span>
                      <strong>Due:</strong> {task.due_date || 'N/A'}
                    </span>
                    {/* ... other meta info ... */}
                  </div>
                </div>
                <div className='task-right-section'>
                  {isCurrentUserAnAssignee &&
                    (hasCurrentUserAccepted ? (
                      <button
                        className='unaccept-task-button'
                        onClick={(e) => {
                          e.stopPropagation()
                          onUnacceptTask(task.id, task.project)
                        }}
                      >
                        Un-accept
                      </button>
                    ) : (
                      <button
                        className='accept-task-button'
                        onClick={(e) => {
                          e.stopPropagation()
                          onAcceptTask(task.id, task.project)
                        }}
                      >
                        Accept Task
                      </button>
                    ))}
                  <div className='status-select-wrapper'>
                    <select
                      className='status-select'
                      value={task.status}
                      onChange={(e) =>
                        onStatusChange(task.id, e.target.value, task.project)
                      }
                      onClick={(e) => e.stopPropagation()}
                      disabled={needsToAccept}
                      title={
                        needsToAccept
                          ? 'You must accept the task first'
                          : 'Change status'
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* ... priority badge and action buttons ... */}
                </div>
              </div>
              <div
                className={`task-status-bar status-${formatClassName(
                  task.status
                )}`}
              ></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TaskList
