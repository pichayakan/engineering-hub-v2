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
      <div className='task-list-container'>
        <h3>Tasks</h3>
        <p style={{ color: '#6c757d', textAlign: 'center', marginTop: '1rem' }}>
          No tasks found.
        </p>
      </div>
    )
  }

  const formatClassName = (text) => (text ? text.replace(/\s+/g, '-') : '')

  return (
    <div className='task-list-container'>
      <h3>Tasks</h3>
      <div className='task-list-wrapper'>
        {tasks.map((task) => {
          const isDirectAssignee = task.assignees_details?.some(
            (assignee) => assignee.id === user.id
          )
          const isDepartmentMember =
            user.department &&
            task.assigned_department &&
            user.department === task.assigned_department
          const isRelevantToUser = isDirectAssignee || isDepartmentMember
          const hasUserAccepted = task.accepted_by?.includes(user.id)

          return (
            <div
              key={task.id}
              className='task-card-clickable'
              onClick={() => onView(task)}
            >
              <div className='task-card'>
                <div
                  className={`priority-indicator priority-${formatClassName(
                    task.priority
                  )}`}
                ></div>
                <div className='task-card-content'>
                  <div className='task-card-header'>
                    <h4 className='task-card-title'>{task.title}</h4>
                    <div className='task-card-status'>
                      <select
                        className='status-select'
                        value={task.status}
                        onChange={(e) =>
                          onStatusChange(task.id, e.target.value, task.project)
                        }
                        onClick={(e) => e.stopPropagation()}
                        disabled={isRelevantToUser && !hasUserAccepted}
                        title={
                          isRelevantToUser && !hasUserAccepted
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
                  </div>
                  <div className='task-card-body'>
                    <div className='task-card-meta'>
                      <div className='meta-item' title='Assignees'>
                        👤{' '}
                        {task.assignees_details
                          ?.map((a) => a.first_name)
                          .join(', ') || 'Unassigned'}
                      </div>
                      {task.due_date && (
                        <div className='meta-item' title='Due Date'>
                          🗓️ {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {task.comment_count > 0 && (
                        <div className='meta-item' title='Comments'>
                          💬 {task.comment_count}
                        </div>
                      )}
                      {task.attachment_count > 0 && (
                        <div className='meta-item' title='Attachments'>
                          📎 {task.attachment_count}
                        </div>
                      )}
                    </div>
                    <div className='task-card-actions'>
                      {isRelevantToUser && !hasUserAccepted && (
                        <button
                          className='accept-task-button'
                          onClick={(e) => {
                            e.stopPropagation()
                            onAcceptTask(task.id, task.project)
                          }}
                        >
                          Accept
                        </button>
                      )}
                      {onEdit && (
                        <button
                          title='Edit Task'
                          className='action-button'
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(task)
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          title='Delete Task'
                          className='action-button'
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(task.id)
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TaskList
