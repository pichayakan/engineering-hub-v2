// frontend/src/components/AddProject.jsx
import React, { useState } from 'react'
import './AddProject.css' // 1. Import CSS ใหม่

function AddProject({ onProjectAdded }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onProjectAdded({ name, description })
    setName('')
    setDescription('')
  }

  return (
    // 2. เพิ่ม className ให้กับ element ต่างๆ
    <div className='form-card'>
      <form onSubmit={handleSubmit}>
        <h2>Add New Project</h2>
        <div className='form-group'>
          <label htmlFor='projectName'>Name</label>
          <input
            id='projectName'
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder='e.g., Network Upgrade Q3'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='projectDescription'>Description</label>
          <textarea
            id='projectDescription'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='A brief description of the project...'
          />
        </div>
        <button type='submit' className='submit-button'>
          Add Project
        </button>
      </form>
    </div>
  )
}

export default AddProject
