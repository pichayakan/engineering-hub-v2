// frontend/src/components/TaskList.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import './TaskList.css'

// กำหนดค่าเริ่มต้นให้ props ที่อาจไม่ถูกส่งมา เพื่อป้องกัน error
function TaskList({
  tasks,
  onEdit,
  onDelete,
  onView = () => {}, // <--- เพิ่มค่าเริ่มต้น
  onStatusChange = () => {},
  showProjectLink = false,
}) {
  const STATUS_OPTIONS = ['To Do', 'In Progress', 'Done']

  if (!tasks || tasks.length === 0) {
    return (
      <p style={{ color: '#a0a0a0', textAlign: 'center', marginTop: '1rem' }}>
        No tasks found.
      </p>
    )
  }

  const formatClassName = (text) => text.replace(/\s+/g, '-')

  return (
    <div className='task-list-wrapper'>
      {tasks.map((task) => (
        // --- ส่วนที่แก้ไข: เพิ่ม div ครอบพร้อม onClick ---
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
                  <span>
                    <strong>Assignees:</strong>
                    {task.assignees_details && task.assignees_details.length > 0
                      ? task.assignees_details.map((a) => a.username).join(', ')
                      : ' Unassigned'}
                  </span>
                  <span>
                    <strong>Due:</strong> {task.due_date || 'N/A'}
                  </span>
                  {showProjectLink && task.project && (
                    <span>
                      <strong>Project:</strong>{' '}
                      <Link
                        to={`/projects/${task.project}`}
                        className='task-project-link'
                        onClick={(e) => e.stopPropagation()} // ป้องกันไม่ให้ Modal เปิดเมื่อคลิกลิงก์
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
                <div className='status-select-wrapper'>
                  <select
                    className='status-select'
                    value={task.status}
                    onChange={(e) =>
                      onStatusChange(task.id, e.target.value, task.project)
                    }
                    onClick={(e) => e.stopPropagation()} // ป้องกันไม่ให้ Modal เปิดเมื่อคลิก dropdown
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
                        e.stopPropagation() // ป้องกันไม่ให้ Modal เปิดเมื่อคลิกปุ่ม
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
                        e.stopPropagation() // ป้องกันไม่ให้ Modal เปิดเมื่อคลิกปุ่ม
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
      ))}
    </div>
  )
}

export default TaskList
