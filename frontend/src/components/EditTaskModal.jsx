// frontend/src/components/EditTaskModal.jsx
import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import './AddProject.css'
import './EditTaskModal.css'
import './MultiSelect.css'

function EditTaskModal({
  task,
  users,
  onSave,
  onClose,
  availableTasks = [],
  allDepartments = [],
  isSaving, // รับ prop isSaving เข้ามา
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [selectedPrerequisites, setSelectedPrerequisites] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)

  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name} (${user.username})`,
  }))

  const departmentOptions = allDepartments.map((dept) => ({
    value: dept.id,
    label: dept.name,
  }))

  const priorityOptions = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
  ]

  const taskOptions = availableTasks
    .filter((t) => t.id !== task?.id)
    .map((t) => ({
      value: t.id,
      label: t.title,
    }))

  useEffect(() => {
    // ใช้ 'task' prop ที่ได้รับมา ไม่ใช่ 'department'
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setDueDate(task.due_date || '')
      setPriority(task.priority || 'Medium')

      const currentAssignees = task.assignees_details
        ? task.assignees_details.map((user) => ({
            value: user.id,
            label: `${user.first_name} ${user.last_name} (${user.username})`,
          }))
        : []
      setSelectedAssignees(currentAssignees)

      const currentPrerequisites = task.prerequisites_details
        ? task.prerequisites_details.map((t) => ({
            value: t.id,
            label: t.title,
          }))
        : []
      setSelectedPrerequisites(currentPrerequisites)

      setSelectedDepartment(
        departmentOptions.find(
          (opt) => opt.value === task.assigned_department
        ) || null
      )
    }
  }, [task, allDepartments]) // เพิ่ม allDepartments ใน dependency array

  if (!task) return null

  const handleSave = (e) => {
    e.preventDefault()
    const assigneeIds = selectedAssignees.map((option) => option.value)
    const prerequisiteIds = selectedPrerequisites.map((option) => option.value)

    onSave(task.id, {
      title,
      description,
      assignees: assigneeIds,
      assigned_department: selectedDepartment ? selectedDepartment.value : null,
      due_date: dueDate || null,
      priority: priority,
      prerequisites: prerequisiteIds,
    })
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
            <h2>Edit Task</h2>
            <div className='form-group'>
              <label htmlFor='editTaskTitle'>Task Title</label>
              <input
                id='editTaskTitle'
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editTaskDescription'>Description</label>
              <textarea
                id='editTaskDescription'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editAssignDept'>Assign to Department</label>
              <Select
                id='editAssignDept'
                options={departmentOptions}
                isClearable
                className='multi-select-container'
                classNamePrefix='multi-select'
                value={selectedDepartment}
                onChange={setSelectedDepartment}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editAssignees'>Assign to Specific Members</label>
              <Select
                id='editAssignees'
                isMulti
                options={userOptions}
                className='multi-select-container'
                classNamePrefix='multi-select'
                value={selectedAssignees}
                onChange={setSelectedAssignees}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editDueDate'>Due Date</label>
              <input
                id='editDueDate'
                type='date'
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editPriority'>Priority</label>
              <select
                id='editPriority'
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
            <div className='form-group'>
              <label htmlFor='editPrerequisites'>Prerequisites</label>
              <Select
                id='editPrerequisites'
                isMulti
                options={taskOptions}
                className='multi-select-container'
                classNamePrefix='multi-select'
                value={selectedPrerequisites}
                onChange={setSelectedPrerequisites}
              />
            </div>
            <button type='submit' className='submit-button' disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditTaskModal
