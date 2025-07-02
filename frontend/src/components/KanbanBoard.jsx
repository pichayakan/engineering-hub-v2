// frontend/src/components/KanbanBoard.jsx
import React from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import './KanbanBoard.css'

function KanbanBoard({ boardData, onDragEnd }) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className='kanban-board'>
        {Object.entries(boardData.columns).map(([columnId, column]) => (
          <div className='kanban-column' key={columnId}>
            <h2 className='column-title'>
              {column.name} ({column.tasks.length})
            </h2>
            <Droppable droppableId={columnId}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`droppable-area ${
                    snapshot.isDraggingOver ? 'is-dragging-over' : ''
                  }`}
                >
                  {column.tasks.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={String(task.id)}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`task-card ${
                            snapshot.isDragging ? 'is-dragging' : ''
                          }`}
                        >
                          <h4 className='task-card-title'>{task.title}</h4>
                          <p className='task-card-meta'>
                            Assignees:{' '}
                            {task.assignees_details
                              .map((a) => a.username)
                              .join(', ') || 'N/A'}
                          </p>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}

export default KanbanBoard
