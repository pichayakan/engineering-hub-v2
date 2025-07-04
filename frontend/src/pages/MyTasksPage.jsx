// frontend/src/pages/MyTasksPage.jsx
import React, { useState, useEffect } from 'react'
import apiClient from '../api'
import TaskList from '../components/TaskList.jsx'
import { useAuth } from '../context/AuthContext'
import './MyTasksPage.css'

function MyTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const { setUnseenTaskCount } = useAuth()

  const fetchMyTasks = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/my-tasks/')
      setTasks(response.data)
    } catch (error) {
      console.error('Failed to fetch assigned tasks', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const markTasksAsSeen = async () => {
      try {
        await apiClient.post('/api/notifications/mark-as-seen/')
        setUnseenTaskCount(0)
      } catch (error) {
        console.error('Failed to mark tasks as seen', error)
      }
    }

    fetchMyTasks()
    markTasksAsSeen()
  }, [setUnseenTaskCount])

  const handleTaskStatusChange = async (taskId, newStatus, projectId) => {
    if (!projectId) {
      alert('Cannot update task: Project ID is missing.')
      return
    }
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
      alert(
        error.response?.data?.error ||
          'Could not update the task status. Reverting.'
      )
      setTasks(originalTasks)
    }
  }

  const handleAcceptTask = async (taskId, projectId) => {
    try {
      await apiClient.post(`/api/projects/${projectId}/tasks/${taskId}/accept/`)
      fetchMyTasks()
    } catch (error) {
      console.error('Failed to accept task', error)
      alert(error.response?.data?.error || 'Could not accept the task.')
    }
  }

  // --- เพิ่มฟังก์ชันสำหรับยกเลิกการรับงาน ---
  const handleUnacceptTask = async (taskId, projectId) => {
    try {
      await apiClient.post(
        `/api/projects/${projectId}/tasks/${taskId}/unaccept/`
      )
      fetchMyTasks()
    } catch (error) {
      console.error('Failed to un-accept task', error)
      alert(error.response?.data?.error || 'Could not un-accept the task.')
    }
  }

  const tasksByStatus = {
    'To Do': tasks.filter((t) => t.status === 'To Do'),
    'In Progress': tasks.filter((t) => t.status === 'In Progress'),
    Done: tasks.filter((t) => t.status === 'Done'),
  }

  if (loading) {
    return <div>Loading your tasks...</div>
  }

  return (
    <div>
      <div className='dashboard-header'>
        <h1>My Tasks</h1>
        <p>Here are all the tasks currently assigned to you.</p>
      </div>
      <div className='task-board'>
        {Object.entries(tasksByStatus).map(([status, tasksInColumn]) => (
          <div key={status} className='status-column'>
            <h2>
              {status} ({tasksInColumn.length})
            </h2>
            <div className='task-column-list'>
              <TaskList
                tasks={tasksInColumn}
                onStatusChange={handleTaskStatusChange}
                onAcceptTask={handleAcceptTask}
                onUnacceptTask={handleUnacceptTask} // <-- ส่งฟังก์ชันไปให้ TaskList
                showProjectLink={true}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyTasksPage
