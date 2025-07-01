// frontend/src/components/EditProjectModal.jsx
import React, { useState, useEffect } from 'react'
import './AddProject.css' // ใช้สไตล์ฟอร์มเดียวกัน
import './EditTaskModal.css' // ใช้สไตล์ Modal เดียวกัน

function EditProjectModal({ project, onSave, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
    }
  }, [project])

  if (!project) return null

  const handleSave = (e) => {
    e.preventDefault()
    onSave(project.id, { name, description })
  }

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-content' onClick={(e) => e.stopPropagation()}>
        <button className='modal-close-button' onClick={onClose}>
          &times;
        </button>
        <div
          className='form-card'
          style={{ margin: 0, padding: 0, border: 'none', boxShadow: 'none' }}
        >
          <form onSubmit={handleSave}>
            <h2>Edit Project</h2>
            <div className='form-group'>
              <label htmlFor='editProjectName'>Project Name</label>
              <input
                id='editProjectName'
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editProjectDescription'>Description</label>
              <textarea
                id='editProjectDescription'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ minHeight: '120px' }}
              />
            </div>
            <button type='submit' className='submit-button'>
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditProjectModal
