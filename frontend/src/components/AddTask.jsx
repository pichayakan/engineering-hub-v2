// frontend/src/components/AddTask.jsx
import React, { useState } from 'react'
import Select from 'react-select'
import './AddProject.css'
import './MultiSelect.css'

function AddTask({ onTaskAdded, users, isSubmitting, availableTasks }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [selectedPrerequisites, setSelectedPrerequisites] = useState([])

  // --- ส่วนที่แก้ไข: สร้าง label ให้แสดงชื่อเต็ม ---
  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name} (${user.username})`,
  }))

  // 3. สร้าง options สำหรับ prerequisites
  const taskOptions = availableTasks.map((task) => ({
    value: task.id,
    label: task.title,
  }))

  const priorityOptions = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const assigneeIds = selectedAssignees.map((option) => option.value)
    const prerequisiteIds = selectedPrerequisites.map((option) => option.value)

    await onTaskAdded({
      title,
      description,
      assignees: assigneeIds,
      due_date: dueDate || null,
      priority: priority,
      prerequisites: prerequisiteIds,
    })

    setSelectedPrerequisites([])

    setTitle('')
    setDescription('')
    setSelectedAssignees([])
    setDueDate('')
    setPriority('Medium')
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
          <label htmlFor='assignees'>Assign To</label>
          <Select
            id='assignees'
            isMulti
            options={userOptions}
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={selectedAssignees}
            onChange={setSelectedAssignees}
            placeholder='Select assignees...'
          />
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
        <div className='form-group'>
          <label htmlFor='priority'>Priority</label>
          <select
            id='priority'
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label htmlFor='prerequisites'>
            Prerequisites (Tasks to be done before this)
          </label>
          <Select
            id='prerequisites'
            isMulti
            options={taskOptions}
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={selectedPrerequisites}
            onChange={setSelectedPrerequisites}
            placeholder='Select prerequisite tasks...'
          />
        </div>
        <button type='submit' className='submit-button' disabled={isSubmitting}>
          {isSubmitting ? 'Adding Task...' : 'Add Task'}
        </button>
      </form>
    </div>
  )
}

export default AddTask
