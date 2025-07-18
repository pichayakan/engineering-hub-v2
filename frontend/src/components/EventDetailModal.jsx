import React from 'react'
// Import CSS files used by other modals

import './EditTaskModal.css'
import './AttachmentSection.css'

import { useAuth } from '../context/AuthContext'

function EventDetailModal({ event, onClose, onEdit, onDelete }) {

  const { user } = useAuth()

 if (!event) return null
 
 const isCreator =
   user && event.created_by_details && user.id === event.created_by_details.id

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-content' onClick={(e) => e.stopPropagation()}>
        <button className='modal-close-button' onClick={onClose}>
          &times;
        </button>

        <div
          className='task-header'
          style={{
            paddingBottom: '1rem',
            borderBottom: '1px solid #363636',
            marginBottom: '1rem',
          }}
        >
          <h2>{event.title}</h2>
          {isCreator && (
            <div className='modal-actions'>
              <button
                className='action-button edit'
                onClick={() => onEdit(event)}
              >
                Edit
              </button>
              <button
                className='action-button delete'
                onClick={() => onDelete(event.id)}
              >
                Delete
              </button>
            </div>
          )}
          <p style={{ margin: 0, color: '#6c757d' }}>
            From: {new Date(event.start_time).toLocaleString()} <br />
            To: {new Date(event.end_time).toLocaleString()}
          </p>
        </div>

        <div className='modal-body-scrollable'>
          <div className='task-body'>
            <p>
              <strong>Description:</strong>{' '}
              {event.description || 'No description.'}
            </p>
            <p>
              <strong>Participants:</strong>{' '}
              {event.participants_details?.map((p) => p.username).join(', ') ||
                'None'}
            </p>
          </div>

          <div className='attachment-section'>
            <h3>Attachments</h3>
            <ul className='attachment-list'>
              {event.attachments?.length > 0 ? (
                event.attachments.map((att) => (
                  <li key={att.id} className='attachment-item'>
                    <a
                      href={att.file}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='attachment-link'
                    >
                      📎 {att.name}
                    </a>
                  </li>
                ))
              ) : (
                <p style={{ color: '#a0a0a0' }}>No files attached.</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventDetailModal
