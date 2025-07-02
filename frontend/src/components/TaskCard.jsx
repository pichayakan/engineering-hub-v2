// frontend/src/components/TaskCard.jsx
import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './KanbanBoard.css' // เราจะใช้ CSS เดิม แต่จะมีการปรับปรุง

function TaskCard({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className='task-card'
    >
      <h4 className='task-card-title'>{task.title}</h4>
      <p className='task-card-meta'>
        Assignees:{' '}
        {task.assignees_details?.map((a) => a.username).join(', ') || 'N/A'}
      </p>
    </div>
  )
}

export default TaskCard
