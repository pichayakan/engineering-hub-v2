// frontend/src/components/TaskDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'
import apiClient from '../api'
import CommentSection from './CommentSection.jsx'
import AttachmentSection from './AttachmentSection.jsx'
import ActivityLog from './ActivityLog.jsx' // 1. Import ActivityLog
import './EditTaskModal.css'
import './TaskList.css'

// onCommentAdded จะถูกเรียกเพื่อบอกให้หน้าหลัก (ProjectDetail) โหลดข้อมูลใหม่ทั้งหมด
function TaskDetailModal({ task, project, onClose, onCommentAdded }) {
  const [attachments, setAttachments] = useState([])

  // --- ส่วนที่แก้ไข: สร้างฟังก์ชันสำหรับดึงข้อมูลไฟล์แนบโดยเฉพาะ ---
  const fetchAttachments = useCallback(async () => {
    if (task && project) {
      try {
        const response = await apiClient.get(
          `/api/projects/${project.id}/tasks/${task.id}/attachments/`
        )
        setAttachments(response.data)
      } catch (error) {
        console.error('Failed to fetch task attachments', error)
      }
    }
  }, [task, project])

  // เรียกใช้ฟังก์ชันนี้เมื่อ task เปลี่ยนไป
  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  if (!task || !project) return null

  const formatClassName = (text) => (text ? text.replace(/\s+/g, '-') : '')

  const handleContentChange = () => {
    // เมื่อมีคอมเมนต์ใหม่ หรือไฟล์ใหม่ เราจะเรียก 2 ฟังก์ชัน
    // 1. ดึงไฟล์แนบของ Modal นี้ใหม่
    fetchAttachments()
    // 2. บอกให้หน้าหลัก (ProjectDetail) ดึงข้อมูลทั้งหมดใหม่ (เพื่ออัปเดต comment_count)
    if (onCommentAdded) {
      onCommentAdded()
    }
  }

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
        <div className='modal-body-scrollable'>
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

          {/* ส่งฟังก์ชัน handleContentChange ไปให้ทั้งสองส่วน */}
          <AttachmentSection
            entityType='task'
            entityId={task.id}
            projectId={project.id}
            initialAttachments={attachments}
            onUploadSuccess={handleContentChange}
          />

          <CommentSection
            task={task}
            project={project}
            onCommentAdded={handleContentChange}
          />
          <ActivityLog task={task} project={project} />
        </div>
      </div>
    </div>
  )
}

export default TaskDetailModal
