// frontend/src/components/TaskDetailModal.jsx
import React from 'react'
import CommentSection from './CommentSection.jsx'
import './EditTaskModal.css' // ใช้สไตล์ Modal เดียวกัน
import './TaskList.css' // ใช้สไตล์ Badge จาก TaskList

function TaskDetailModal({ task, project, onClose, onCommentAdded }) {
  if (!task || !project) return null

  const formatClassName = (text) => (text ? text.replace(/\s+/g, '-') : '')

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-content' onClick={(e) => e.stopPropagation()}>
        <button className='modal-close-button' onClick={onClose}>
          &times;
        </button>

        <div
          className='task-header'
          style={{
            paddingBottom: '1rem',
            borderBottom: '1px solid #363636',
            marginBottom: '1rem',
          }}
        >
          <h2>{task.title}</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span
              className={`status-badge status-${formatClassName(task.status)}`}
            >
              {task.status}
            </span>
            <span
              className={`priority-badge priority-${formatClassName(
                task.priority
              )}`}
            >
              {task.priority}
            </span>
          </div>
        </div>

        <div className='task-body'>
          <p>
            <strong>Description:</strong>{' '}
            {task.description || 'No description.'}
          </p>
          <p>
            <strong>Assignees:</strong>{' '}
            {task.assignees_details && task.assignees_details.length > 0
              ? task.assignees_details.map((a) => a.username).join(', ')
              : 'Unassigned'}
          </p>
          <p>
            <strong>Due Date:</strong> {task.due_date || 'Not set'}
          </p>
        </div>

        <CommentSection
          task={task}
          project={project}
          onCommentAdded={onCommentAdded}
        />
      </div>
    </div>
  )
}

export default TaskDetailModal
