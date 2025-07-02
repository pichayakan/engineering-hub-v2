// frontend/src/pages/KanbanPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import apiClient from '../api.js'
import KanbanColumn from '../components/KanbanColumn.jsx'

function KanbanPage() {
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const { projectId } = useParams()

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const [projectRes, tasksRes] = await Promise.all([
        apiClient.get(`/api/projects/${projectId}/`),
        apiClient.get(`/api/projects/${projectId}/tasks/`),
      ])
      setProject(projectRes.data)
      setTasks(tasksRes.data)
    } catch (error) {
      console.error('Failed to fetch data for Kanban board', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTask = tasks.find((t) => t.id === active.id)
    const newStatus = over.id // over.id คือ id ของคอลัมน์ที่วาง

    if (activeTask.status === newStatus) {
      // Reordering in the same column
      const oldIndex = tasks.findIndex((t) => t.id === active.id)
      const newIndex = tasks.findIndex(
        (t) =>
          t.id ===
          over.data.current?.sortable.items.find((id) => id === active.id)
      )
      if (oldIndex !== -1 && newIndex !== -1) {
        setTasks((tasks) => arrayMove(tasks, oldIndex, newIndex))
      }
      return
    }

    // Moving to a new column
    const originalTasks = [...tasks]
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === active.id ? { ...task, status: newStatus } : task
      )
    )

    try {
      await apiClient.patch(`/api/projects/${projectId}/tasks/${active.id}/`, {
        status: newStatus,
      })
    } catch (error) {
      console.error('Failed to update task status', error)
      const errorMessage =
        error.response?.data?.error || 'Failed to update task. Reverting.'
      alert(errorMessage)
      setTasks(originalTasks) // Revert on error
    }
  }

  const getTasksByStatus = (status) =>
    tasks.filter((task) => task.status === status)

  if (loading) return <div>Loading Kanban Board...</div>
  if (!project) return <div>Project not found.</div>

  const columns = {
    'To Do': getTasksByStatus('To Do'),
    'In Progress': getTasksByStatus('In Progress'),
    Done: getTasksByStatus('Done'),
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h1>Kanban Board: {project.name}</h1>
        <Link to={`/projects/${projectId}`} className='nav-link'>
          Back to Details
        </Link>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className='kanban-board'>
          {Object.entries(columns).map(([title, tasksInColumn]) => (
            <KanbanColumn
              key={title}
              id={title}
              title={title}
              tasks={tasksInColumn}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}

export default KanbanPage
