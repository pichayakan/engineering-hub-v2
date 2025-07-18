// frontend/src/pages/ProjectDetail.jsx
import React, { useState, useEffect, useCallback } from 'react'
// --- ส่วนที่แก้ไข: เพิ่ม Link เข้าไปใน import ---
import { useParams, useNavigate, Link } from 'react-router-dom'
import apiClient from '../api'
import { useAuth } from '../context/AuthContext'
import TaskList from '../components/TaskList.jsx'
import AddTask from '../components/AddTask.jsx'
import EditTaskModal from '../components/EditTaskModal.jsx'
import EditProjectModal from '../components/EditProjectModal.jsx'
import TaskDetailModal from '../components/TaskDetailModal.jsx'
import AttachmentSection from '../components/AttachmentSection.jsx'
import './ProjectDetail.css'

function ProjectDetail() {
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [allDepartments, setAllDepartments] = useState([])
  const [projectAttachments, setProjectAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState(null)
  const [viewingTask, setViewingTask] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { projectId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchProjectData = useCallback(async () => {
    // setLoading(true) is now in useEffect to only run on initial load
    try {
      const [projectRes, tasksRes, usersRes, deptsRes, attachmentsRes] =
        await Promise.all([
          apiClient.get(`/api/projects/${projectId}/`),
          apiClient.get(`/api/projects/${projectId}/tasks/`),
          apiClient.get('/api/auth/users/'),
          apiClient.get('/api/auth/departments/'),
          apiClient.get(`/api/projects/${projectId}/attachments/`),
        ])
      setProject(projectRes.data)
      setTasks(tasksRes.data)
      setUsers(usersRes.data)
      setAllDepartments(deptsRes.data)
      setProjectAttachments(attachmentsRes.data)
    } catch (error) {
      console.error('Failed to fetch page data', error)
      navigate('/') // กลับไปหน้าแรกถ้าหาโปรเจกต์ไม่เจอ
    } finally {
      setLoading(false)
    }
  }, [projectId, navigate])

  useEffect(() => {
    setLoading(true)
    fetchProjectData()
  }, [fetchProjectData])

  // --- เติมโค้ดในฟังก์ชันต่างๆ ให้สมบูรณ์ ---
  const handleTaskAdded = async (newTaskData) => {
    setIsAddingTask(true)
    try {
      await apiClient.post(`/api/projects/${projectId}/tasks/`, newTaskData)
      fetchProjectData()
    } catch (error) {
      console.error('Failed to add task', error)
      alert('Could not add the task.')
    } finally {
      setIsAddingTask(false)
    }
  }

  const handleTaskUpdated = async (taskId, updatedData) => {
    setIsSubmitting(true) // ตั้งสถานะ
    try {
      await apiClient.patch(
        `/api/projects/${projectId}/tasks/${taskId}/`,
        updatedData
      )
      setEditingTask(null)
      fetchProjectData()
    } catch (error) {
      console.error('Failed to update task', error)
      alert('Could not update the task.')
    } finally {
      setIsSubmitting(false) // คืนสถานะ
    }
  }

  const handleTaskDeleted = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await apiClient.delete(`/api/projects/${projectId}/tasks/${taskId}/`)
        fetchProjectData()
      } catch (error) {
        console.error('Failed to delete task', error)
        alert('Could not delete the task.')
      }
    }
  }

  const handleTaskStatusChange = async (taskId, newStatus) => {
    const originalTasks = [...tasks]
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    )
    try {
      await apiClient.patch(`/api/projects/${projectId}/tasks/${taskId}/`, {
        status: newStatus,
      })
    } catch (error) {
      console.error('Failed to update task status', error)
      const errorMessage =
        error.response?.data?.error ||
        'Could not update the task status. Reverting.'
      alert(errorMessage)
      setTasks(originalTasks)
    }
  }

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
        navigate('/')
      } catch (error) {
        console.error('Failed to delete project', error)
        alert('Could not delete project.')
      }
    }
  }

  const handleAcceptTask = async (taskId, projId) => {
    try {
      await apiClient.post(`/api/projects/${projId}/tasks/${taskId}/accept/`)
      fetchProjectData()
    } catch (error) {
      console.error('Failed to accept task', error)
      alert(error.response?.data?.error || 'Could not accept the task.')
    }
  }

  const handleUnacceptTask = async (taskId, projId) => {
    try {
      await apiClient.post(`/api/projects/${projId}/tasks/${taskId}/unaccept/`)
      fetchProjectData()
    } catch (error) {
      console.error('Failed to un-accept task', error)
      alert(error.response?.data?.error || 'Could not un-accept the task.')
    }
  }

  if (loading) return <div>Loading project details...</div>
  if (!project) return <div>Project not found.</div>

  const isOwner = user && user.id === project.owner

  return (
    <>
      <div className='project-detail-layout'>
        <div className='project-main-content'>
          <div className='project-info-card'>
            <div className='project-header'>
              <h1>{project.name}</h1>
              <div className='project-header-actions'>
                <Link
                  to={`/projects/${projectId}/kanban`}
                  className='action-button view-board'
                >
                  View as Board
                </Link>
                {isOwner && (
                  <div className='project-actions'>
                    <button
                      className='action-button edit'
                      onClick={() => setEditingProject(project)}
                    >
                      Edit
                    </button>
                    <button
                      className='action-button delete'
                      onClick={() => handleProjectDelete(project.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
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
            initialAttachments={projectAttachments}
            onUploadSuccess={fetchProjectData}
          />
          <TaskList
            tasks={tasks}
            onEdit={isOwner ? (task) => setEditingTask(task) : null}
            onDelete={isOwner ? handleTaskDeleted : null}
            onStatusChange={handleTaskStatusChange}
            onView={(task) => setViewingTask(task)}
            onAcceptTask={handleAcceptTask}
            onUnacceptTask={handleUnacceptTask}
          />
        </div>
        <div className='project-sidebar'>
          <AddTask
            onTaskAdded={handleTaskAdded}
            users={users}
            isSubmitting={isAddingTask}
            availableTasks={tasks}
            allDepartments={allDepartments}
            project={project} // <-- เพิ่ม prop นี้เข้าไป
          />
        </div>
      </div>

      <EditTaskModal
        task={editingTask}
        users={users}
        onSave={handleTaskUpdated}
        onClose={() => setEditingTask(null)}
        availableTasks={tasks}
        allDepartments={allDepartments}
        isSaving={isSubmitting} // <-- ส่ง prop นี้ไปให้ Modal
      />
      <EditProjectModal
        project={editingProject}
        onSave={handleProjectUpdate}
        onClose={() => setEditingProject(null)}
      />
      <TaskDetailModal
        task={viewingTask}
        project={project}
        onClose={() => setViewingTask(null)}
        onCommentAdded={fetchProjectData}
      />
    </>
  )
}

export default ProjectDetail
