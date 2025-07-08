// frontend/src/components/AddTask.jsx
import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import apiClient from '../api'
import './AddProject.css'
import './MultiSelect.css'

function AddTask({
  onTaskAdded,
  users,
  isSubmitting,
  availableTasks,
  project,
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [prerequisites, setPrerequisites] = useState([]) // State สำหรับเก็บ Prerequisites
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await apiClient.get('/api/auth/departments/')
        setDepartments(response.data)
      } catch (error) {
        console.error('Failed to fetch departments', error)
      }
    }
    fetchDepartments()
  }, [])

  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name} (${user.username})`,
  }))
  const departmentOptions = departments.map((dept) => ({
    value: dept.id,
    label: `${dept.name} (${dept.member_count} members)`,
  }))
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
    const prerequisiteIds = prerequisites.map((option) => option.value)

    await onTaskAdded({
      title,
      description,
      assignees: assigneeIds,
      assigned_department: selectedDepartment ? selectedDepartment.value : null,
      due_date: dueDate || null,
      priority: priority,
      prerequisites: prerequisiteIds,
    })

    setTitle('')
    setDescription('')
    setSelectedAssignees([])
    setSelectedDepartment(null)
    setDueDate('')
    setPriority('Medium')
    setPrerequisites([])
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
          <label htmlFor='assignDept'>Assign to Department (Optional)</label>
          <Select
            id='assignDept'
            options={departmentOptions}
            isClearable
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            placeholder='Assign to a whole department...'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='assignees'>
            Assign to Specific Members (Optional)
          </label>
          <Select
            id='assignees'
            isMulti
            options={userOptions}
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={selectedAssignees}
            onChange={setSelectedAssignees}
            placeholder='Select specific members...'
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
        </div>
        {/* --- ส่วนที่แก้ไข: แยก Prerequisites ออกมาเป็น form-group ของตัวเอง --- */}
        <div className='form-group'>
          <label htmlFor='prerequisites'>
            Prerequisites (Tasks to be done before this)
          </label>
          <Select
            id='prerequisites'
            isMulti
            options={taskOptions}
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={prerequisites} // แก้ไขให้ใช้ state ที่ถูกต้อง
            onChange={setPrerequisites} // แก้ไขให้ใช้ state ที่ถูกต้อง
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
