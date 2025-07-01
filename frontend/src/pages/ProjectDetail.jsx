// frontend/src/pages/ProjectDetail.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import apiClient from '../api'
import TaskList from '../components/TaskList.jsx'
import AddTask from '../components/AddTask.jsx'
import EditTaskModal from '../components/EditTaskModal.jsx'
import './ProjectDetail.css'

function ProjectDetail() {
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState(null)
  const { projectId } = useParams()

  const fetchProjectData = useCallback(async () => {
    setLoading(true)
    try {
      // ดึงข้อมูล 3 ส่วนพร้อมกัน
      const [projectRes, tasksRes, usersRes] = await Promise.all([
        apiClient.get(`/api/projects/${projectId}/`),
        apiClient.get(`/api/projects/${projectId}/tasks/`),
        apiClient.get('/api/auth/users/'), // <-- 2. เรียก API ดึงรายชื่อ user
      ])
      setProject(projectRes.data)
      setTasks(tasksRes.data)
      setUsers(usersRes.data) // <-- 3. เก็บข้อมูล user ใน state
    } catch (error) {
      console.error('Failed to fetch project data', error)
      setProject(null)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProjectData()
  }, [fetchProjectData])

  const handleTaskAdded = async (newTaskData) => {
    try {
      await apiClient.post(`/api/projects/${projectId}/tasks/`, newTaskData)
      fetchProjectData() // ดึงข้อมูลทั้งหมดใหม่เพื่อให้เห็น Task ล่าสุด
    } catch (error) {
      console.error('Failed to add task', error)
      alert('Could not add the task.')
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
    try {
      // เราใช้ apiClient.patch เพราะเป็นการอัปเดตข้อมูลแค่บางส่วน (partial update)
      await apiClient.patch(`/api/projects/${projectId}/tasks/${taskId}/`, {
        status: newStatus,
      })
      // โหลดข้อมูลทั้งหมดใหม่เพื่อให้เห็นการเปลี่ยนแปลง
      fetchProjectData()
    } catch (error) {
      console.error('Failed to update task status', error)
      alert('Could not update the task status.')
    }
  }

  if (loading) return <div>Loading project details...</div>
  if (!project) return <div>Project not found.</div>

  return (
    <>
      <div className='project-detail-layout'>
        <div className='project-main-content'>
          <div className='project-info-card'>
            <div className='project-header'>
              <h1>{project.name}</h1>
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
          <TaskList
            tasks={tasks}
            onEdit={(task) => setEditingTask(task)}
            onDelete={handleTaskDeleted}
            onStatusChange={handleTaskStatusChange}
          />
        </div>
        <div className='project-sidebar'>
          <AddTask onTaskAdded={handleTaskAdded} users={users} />
        </div>
      </div>

      <EditTaskModal
        task={editingTask}
        users={users}
        onSave={handleTaskUpdated}
        onClose={() => setEditingTask(null)}
      />
    </>
  )
}

export default ProjectDetail

