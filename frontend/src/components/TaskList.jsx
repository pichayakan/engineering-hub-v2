// frontend/src/components/TaskList.jsx
import React from 'react'
import './TaskList.css'

// เพิ่ม props onStatusChange
function TaskList({ tasks, onEdit, onDelete, onStatusChange }) {
  const STATUS_OPTIONS = ['To Do', 'In Progress', 'Done']

  if (!tasks || tasks.length === 0) {
    return (
      <div className='task-list-container'>
        <h3>Tasks</h3>
        <p>This project has no tasks yet.</p>
      </div>
    )
  }

  const formatClassName = (text) => text.replace(/\s+/g, '-')

  return (
    <div className='task-list-container'>
      <h3>Tasks</h3>
      {tasks.map((task) => (
        <div key={task.id} className='task-item'>
          <div className='task-item-content'>
            <div className='task-main-info'>
              <h4>{task.title}</h4>
              <div className='task-meta'>
                <span>
                  <strong>Assignee:</strong>{' '}
                  {task.assignee_username || 'Unassigned'}
                </span>
                <span>
                  <strong>Due:</strong> {task.due_date || 'N/A'}
                </span>
              </div>
            </div>
            <div className='task-right-section'>
              <span
                className={`priority-badge priority-${formatClassName(
                  task.priority
                )}`}
              >
                {task.priority}
              </span>

              {/* --- เพิ่มส่วนนี้เข้ามา --- */}
              <div className='status-select-wrapper'>
                <select
                  className='status-select'
                  value={task.status}
                  onChange={(e) => onStatusChange(task.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className='task-actions'>
                <button
                  title='Edit Task'
                  className='action-button edit'
                  onClick={() => onEdit(task)}
                >
                  ✎
                </button>
                <button
                  title='Delete Task'
                  className='action-button delete'
                  onClick={() => onDelete(task.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
          <div
            className={`task-status-bar status-${formatClassName(task.status)}`}
          ></div>
        </div>
      ))}
    </div>
  )
}

export default TaskList
