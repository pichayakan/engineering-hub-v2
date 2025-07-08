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
        const isDirectAssignee = task.assignees_details?.some(
          (assignee) => assignee.id === user.id
        )
        const isDepartmentMember =
          user.department &&
          task.assigned_department &&
          user.department === task.assigned_department
        const isRelevantToUser = isDirectAssignee || isDepartmentMember
        const hasUserAccepted = task.accepted_by?.includes(user.id)

        const isTaskAcceptedByAnyone =
          task.accepted_by && task.accepted_by.length > 0

        return (
          <div key={task.id}>
            {/* --- DEBUGGING BLOCK: แสดงข้อมูลดิบ --- */}
            <details
              style={{
                fontSize: '10px',
                background: '#222',
                padding: '5px',
                margin: '10px',
                border: '1px solid #444',
                color: 'lightgreen',
              }}
            >
              <summary>Debug Info for Task: "{task.title}"</summary>
              <pre>
                <strong>Task Data:</strong>
                <br />
                {JSON.stringify(task, null, 2)}
              </pre>
              <pre>
                <strong>Current User Data:</strong>
                <br />
                {JSON.stringify(user, null, 2)}
              </pre>
              <pre>
                <strong>Logic Results:</strong>
                <br />
                isDirectAssignee: {String(isDirectAssignee)}
                <br />
                isDepartmentMember: {String(isDepartmentMember)}
                <br />
                isRelevantToUser: {String(isRelevantToUser)}
                <br />
                hasUserAccepted: {String(hasUserAccepted)}
              </pre>
            </details>
            {/* --- END DEBUGGING BLOCK --- */}

            <div className='task-item-clickable' onClick={() => onView(task)}>
              <div className='task-item'>
                <div className='task-item-content'>
                  <div className='task-main-info'>
                    <h4>{task.title}</h4>
                    <div className='task-meta'>
                      <div>
                        <strong>Assignees:</strong>
                        <div className='assignee-list'>
                          {task.assignees_details?.length > 0 ? (
                            task.assignees_details.map((assignee) => (
                              <div key={assignee.id} className='assignee-item'>
                                <span>
                                  {assignee.first_name} {assignee.last_name}
                                </span>
                                {task.accepted_by?.includes(assignee.id) && (
                                  <span className='accepted-badge'>
                                    ✔ Accepted
                                  </span>
                                )}
                              </div>
                            ))
                          ) : task.assigned_department_details ? (
                            <span className='unclaimed-text'>
                              Unclaimed (Dept:{' '}
                              {task.assigned_department_details.name})
                            </span>
                          ) : (
                            'Unassigned'
                          )}
                        </div>
                      </div>
                      <span>
                        <strong>Due:</strong> {task.due_date || 'N/A'}
                      </span>
                      {showProjectLink && task.project && (
                        <span>
                          <strong>Project:</strong>{' '}
                          <Link
                            to={`/projects/${task.project}`}
                            className='task-project-link'
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.project_name || 'View Project'}
                          </Link>
                        </span>
                      )}
                      {task.comment_count > 0 && (
                        <span
                          className='task-comment-count'
                          title={`${task.comment_count} comments`}
                        >
                          💬 {task.comment_count}
                        </span>
                      )}
                      {task.attachment_count > 0 && (
                        <span
                          className='task-attachment-count'
                          title={`${task.attachment_count} attachments`}
                        >
                          📎 {task.attachment_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className='task-right-section'>
                    {isRelevantToUser && !isTaskAcceptedByAnyone && (
                      <button
                        className='accept-task-button'
                        onClick={(e) => {
                          e.stopPropagation()
                          onAcceptTask(task.id, task.project)
                        }}
                      >
                        Accept Task
                      </button>
                    )}

                    {/* 2. แสดงปุ่ม Un-accept ถ้าเราเป็นคนกดรับงานนั้นไป */}
                    {hasUserAccepted && (
                      <button
                        className='unaccept-task-button'
                        onClick={(e) => {
                          e.stopPropagation()
                          onUnacceptTask(task.id, task.project)
                        }}
                      >
                        Un-accept
                      </button>
                    )}
                    <div className='status-select-wrapper'>
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
                    <span
                      className={`priority-badge priority-${formatClassName(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                    <div className='task-actions'>
                      {onEdit && (
                        <button
                          title='Edit Task'
                          className='action-button edit'
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(task)
                          }}
                        >
                          ✎
                        </button>
                      )}
                      {onDelete && (
                        <button
                          title='Delete Task'
                          className='action-button delete'
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(task.id)
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={`task-status-bar status-${formatClassName(
                    task.status
                  )}`}
                ></div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TaskList
