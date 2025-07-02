// frontend/src/components/KanbanColumn.jsx
import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard.jsx'
import './KanbanBoard.css'

function KanbanColumn({ id, title, tasks }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className='kanban-column'>
      <h2 className='column-title'>
        {title} ({tasks.length})
      </h2>
      <SortableContext
        id={id}
        items={tasks}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`droppable-area ${isOver ? 'is-dragging-over' : ''}`}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export default KanbanColumn
