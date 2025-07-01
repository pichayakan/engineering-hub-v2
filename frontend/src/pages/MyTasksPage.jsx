// frontend/src/pages/MyTasksPage.jsx
import React, { useState, useEffect } from 'react'
import apiClient from '../api'
import TaskList from '../components/TaskList.jsx' // เราจะใช้ TaskList component เดิม
import './MyTasksPage.css' // Import CSS ใหม่

function MyTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

    fetchMyTasks()
  }, [])

  // จัดกลุ่ม Task ตามสถานะ
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
            <TaskList tasks={tasksByStatus['To Do']} />
          </div>
        </div>
        <div className='status-column'>
          <h2>In Progress ({tasksByStatus['In Progress'].length})</h2>
          <div className='task-column-list'>
            <TaskList tasks={tasksByStatus['In Progress']} />
          </div>
        </div>
        <div className='status-column'>
          <h2>Done ({tasksByStatus['Done'].length})</h2>
          <div className='task-column-list'>
            <TaskList tasks={tasksByStatus['Done']} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyTasksPage
