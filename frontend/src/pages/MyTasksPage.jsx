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

  useEffect(() => {
    const initPage = async () => {
      setLoading(true)
      try {
        // 1. บอก Backend ว่าเราเห็น Task แล้ว และเคลียร์ค่าใน Context ทันที
        await apiClient.post('/api/notifications/mark-as-seen/')
        setUnseenTaskCount(0)

        // 2. ดึงข้อมูล Task ทั้งหมดที่เป็นของเรา
        const response = await apiClient.get('/api/my-tasks/')
        setTasks(response.data)
      } catch (error) {
        console.error('Failed to initialize My Tasks page', error)
      } finally {
        setLoading(false)
      }
    }

    initPage()
  }, [setUnseenTaskCount]) // Dependency array ทำให้ useEffect ทำงานแค่ครั้งเดียว

  const handleTaskStatusChange = async (taskId, newStatus, projectId) => {
    if (!projectId) {
      alert('Cannot update task: Project ID is missing.')
      return
    }

    const originalTasks = [...tasks]

    // อัปเดต UI ทันที (Optimistic Update)
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
      alert('Could not update the task status. Reverting.')
      // ย้อนกลับถ้า API call ล้มเหลว
      setTasks(originalTasks)
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
        <div className='status-column'>
          <h2>To Do ({tasksByStatus['To Do'].length})</h2>
          <div className='task-column-list'>
            <TaskList
              tasks={tasksByStatus['To Do']}
              onStatusChange={handleTaskStatusChange}
              showProjectLink={true}
            />
          </div>
        </div>
        <div className='status-column'>
          <h2>In Progress ({tasksByStatus['In Progress'].length})</h2>
          <div className='task-column-list'>
            <TaskList
              tasks={tasksByStatus['In Progress']}
              onStatusChange={handleTaskStatusChange}
              showProjectLink={true}
            />
          </div>
        </div>
        <div className='status-column'>
          <h2>Done ({tasksByStatus['Done'].length})</h2>
          <div className='task-column-list'>
            <TaskList
              tasks={tasksByStatus['Done']}
              onStatusChange={handleTaskStatusChange}
              showProjectLink={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyTasksPage
