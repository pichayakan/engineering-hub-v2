// frontend/src/components/AddTask.jsx
import React, { useState } from 'react'
import './AddProject.css' // ใช้สไตล์เดียวกัน

function AddTask({ onTaskAdded, users }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onTaskAdded({
      title,
      description,
      assignee: assignee || null,
      due_date: dueDate || null,
    })
    setTitle('')
    setDescription('')
    setAssignee('')
    setDueDate('') // 3. เคลียร์ค่าหลัง submit
  }

  return (
    <div className='form-card'>
      <form onSubmit={handleSubmit}>
        <h2>Add New Task</h2>
        <div className='form-group'>
          <label htmlFor='taskTitle'>Task Title</label>
          <input
            id='taskTitle'
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder='e.g., Configure new firewall'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='taskDescription'>Description (Optional)</label>
          <textarea
            id='taskDescription'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Details about the task...'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='assignee'>Assign To</label>
          <select
            id='assignee'
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value=''>Unassigned</option>
            {users &&
              users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
          </select>
        </div>
        <div className='form-group'>
          <label htmlFor='dueDate'>Due Date</label>
          <input
            id='dueDate'
            type='date'
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <button type='submit' className='submit-button'>
          Add Task
        </button>
      </form>
    </div>
  )
}

export default AddTask
