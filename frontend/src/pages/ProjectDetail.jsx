// frontend/src/pages/ProjectDetail.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../api'
import { useAuth } from '../context/AuthContext'
import TaskList from '../components/TaskList.jsx'
import AddTask from '../components/AddTask.jsx'
import EditTaskModal from '../components/EditTaskModal.jsx'
import EditProjectModal from '../components/EditProjectModal.jsx'
import TaskDetailModal from '../components/TaskDetailModal.jsx'
import './ProjectDetail.css'
import AttachmentSection from '../components/AttachmentSection.jsx'

function ProjectDetail() {
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [viewingTask, setViewingTask] = useState(null)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [attachments, setAttachments] = useState([]) // 2. state ใหม่สำหรับไฟล์แนบ

  const { projectId } = useParams()
  const navigate = useNavigate() // 5. Hook สำหรับ redirect
  const { user } = useAuth() // 6. ดึงข้อมูล user ที่ login อยู่

  const fetchProjectData = useCallback(async () => {
    setLoading(true)
    try {
      // ดึงข้อมูล 4 ส่วนพร้อมกัน
      const [projectRes, tasksRes, usersRes, attachmentsRes] =
        await Promise.all([
          apiClient.get(`/api/projects/${projectId}/`),
          apiClient.get(`/api/projects/${projectId}/tasks/`),
          apiClient.get('/api/auth/users/'),
          apiClient.get(`/api/projects/${projectId}/attachments/`), // 3. เรียก API ดึงไฟล์แนบ
        ])
      setProject(projectRes.data)
      setTasks(tasksRes.data)
      setUsers(usersRes.data)
      setAttachments(attachmentsRes.data) // 4. เก็บข้อมูลไฟล์แนบ
    } catch (error) {
      console.error('Failed to fetch page data', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProjectData()
  }, [fetchProjectData])

  const handleTaskAdded = async (newTaskData) => {
    setIsAddingTask(true) // 2. ตั้งสถานะเป็น "กำลังเพิ่ม" เพื่อล็อคปุ่ม
    try {
      await apiClient.post(`/api/projects/${projectId}/tasks/`, newTaskData)
      fetchProjectData() // ดึงข้อมูลทั้งหมดใหม่เพื่อให้เห็น Task ล่าสุด
    } catch (error) {
      console.error('Failed to add task', error)
      alert('Could not add the task.')
    } finally {
      setIsAddingTask(false) // 3. คืนสถานะเดิมเมื่อเสร็จสิ้น ไม่ว่าจะสำเร็จหรือล้มเหลว
    }
  }

  const handleTaskUpdated = async (taskId, updatedData) => {
    try {
      await apiClient.patch(
        `/api/projects/${projectId}/tasks/${taskId}/`,
        updatedData
      )
      setEditingTask(null) // ปิด Modal
      fetchProjectData() // โหลดข้อมูลใหม่
    } catch (error) {
      console.error('Failed to update task', error)
      alert('Could not update the task.')
    }
  }

  const handleTaskDeleted = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await apiClient.delete(`/api/projects/${projectId}/tasks/${taskId}/`)
        fetchProjectData() // โหลดข้อมูลใหม่
      } catch (error) {
        console.error('Failed to delete task', error)
        alert('Could not delete the task.')
      }
    }
  }

  const handleTaskStatusChange = async (taskId, newStatus) => {
    // เก็บสถานะของ tasks เดิมไว้ก่อน เผื่อการอัปเดตล้มเหลว
    const originalTasks = [...tasks]

    // อัปเดต UI ทันทีเพื่อให้ผู้ใช้เห็นการเปลี่ยนแปลง (Optimistic Update)
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    )

    try {
      // ส่ง request ไปอัปเดตที่ backend
      await apiClient.patch(`/api/projects/${projectId}/tasks/${taskId}/`, {
        status: newStatus,
      })
      // ถ้าสำเร็จ ก็ไม่ต้องทำอะไร เพราะ UI อัปเดตไปแล้ว
      fetchProjectData() // โหลดข้อมูลใหม่ทั้งหมดเพื่อให้เห็นการเปลี่ยนแปลง
    } catch (error) {
      console.error('Failed to update task status', error)
      const errorMessage =
        error.response?.data?.error ||
        'Could not update the task status. Reverting.'
      alert(errorMessage)
      setTasks(originalTasks)
    }
  }

  // --- 7. เพิ่มฟังก์ชันสำหรับจัดการ Project ---
  const handleProjectUpdate = async (id, updatedData) => {
    try {
      await apiClient.patch(`/api/projects/${id}/`, updatedData)
      setEditingProject(null)
      fetchProjectData()
    } catch (error) {
      console.error('Failed to update project', error)
      alert('Could not update project.')
    }
  }

  const handleProjectDelete = async (id) => {
    if (
      window.confirm(
        'Are you sure? This will delete the project and all its tasks permanently.'
      )
    ) {
      try {
        await apiClient.delete(`/api/projects/${id}/`)
        alert('Project deleted successfully.')
        navigate('/') // กลับไปหน้าแรกหลังลบสำเร็จ
      } catch (error) {
        console.error('Failed to delete project', error)
        alert('Could not delete project.')
      }
    }
  }

  const handleCommentAdded = (taskId) => {
    // อัปเดต state ของ tasks โดยตรง
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, comment_count: task.comment_count + 1 }
          : task
      )
    )
  }

  if (loading) return <div>Loading project details...</div>
  if (!project) return <div>Project not found.</div>

  // 8. ตรวจสอบว่าเป็นเจ้าของโปรเจกต์หรือไม่
  const isOwner = user && user.id === project.owner

  return (
    <>
      <div className='project-detail-layout'>
        <div className='project-main-content'>
          <div className='project-info-card'>
            <div className='project-header'>
              <h1>{project.name}</h1>
              {/* 9. แสดงปุ่ม Edit/Delete เฉพาะเจ้าของ */}
              {isOwner && (
                <div className='project-actions'>
                  <button
                    className='action-button edit'
                    onClick={() => setEditingProject(project)}
                  >
                    Edit Project
                  </button>
                  <button
                    className='action-button delete'
                    onClick={() => handleProjectDelete(project.id)}
                  >
                    Delete Project
                  </button>
                </div>
              )}
              <div className='project-meta-info'>
                <span>
                  <strong>Owner:</strong> {project.owner_username}
                </span>
                <span>
                  <strong>Created:</strong>{' '}
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className='project-description-section'>
              <h3>Description</h3>
              <p>{project.description || 'No description provided.'}</p>
            </div>
          </div>
          <AttachmentSection
            entityType='project'
            entityId={projectId}
            initialAttachments={attachments}
          />
          <TaskList
            tasks={tasks}
            onEdit={isOwner ? (task) => setEditingTask(task) : null} // แสดงปุ่ม Edit เฉพาะเจ้าของ
            onDelete={isOwner ? handleTaskDeleted : null}
            onStatusChange={handleTaskStatusChange}
            onView={(task) => setViewingTask(task)} // 3. ส่งฟังก์ชันเปิด Modal
          />
        </div>
        <div className='project-sidebar'>
          <AddTask
            onTaskAdded={handleTaskAdded}
            users={users}
            isSubmitting={isAddingTask}
            availableTasks={tasks}
          />
        </div>
      </div>

      <EditTaskModal
        task={editingTask}
        users={users}
        onSave={handleTaskUpdated}
        onClose={() => setEditingTask(null)}
      />
      <EditProjectModal
        project={editingProject}
        onSave={handleProjectUpdate}
        onClose={() => setEditingProject(null)}
        // 2. ส่งรายการ tasks ทั้งหมดไปให้ EditTaskModal
        availableTasks={tasks}
      />
      <TaskDetailModal
        task={viewingTask}
        project={project}
        onClose={() => setViewingTask(null)}
        // 2. ส่งฟังก์ชันใหม่ไปให้ Modal
        onCommentAdded={() => handleCommentAdded(viewingTask.id)}
      />
    </>
  )
}

export default ProjectDetail

