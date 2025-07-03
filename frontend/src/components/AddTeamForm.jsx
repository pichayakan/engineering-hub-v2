// frontend/src/components/AddTeamForm.jsx
import React, { useState } from 'react'
import './AddProject.css' // เราจะใช้สไตล์ฟอร์มเดียวกัน

function AddTeamForm({ onTeamAdded, isSubmitting }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    await onTeamAdded({ name, description })
    setName('')
    setDescription('')
  }

  return (
    <div className='form-card'>
      <form onSubmit={handleSubmit}>
        <h2>Create New Team</h2>
        <div className='form-group'>
          <label htmlFor='teamName'>Team Name</label>
          <input
            id='teamName'
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder='e.g., Network Engineers'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='teamDescription'>Description</label>
          <textarea
            id='teamDescription'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of the team's purpose..."
          />
        </div>
        <button type='submit' className='submit-button' disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Team'}
        </button>
      </form>
    </div>
  )
}

export default AddTeamForm
