// frontend/src/components/AddTask.jsx
import React, { useState, useEffect, useCallback } from 'react'
import Select from 'react-select'
import apiClient from '../api'
import TaskTemplateSelector from './TaskTemplateSelector.jsx'
import './AddProject.css'
import './MultiSelect.css'

function AddTask({
  onTaskAdded,
  users = [],
  isSubmitting,
  availableTasks = [],
  project,
  allDepartments = [],
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [prerequisites, setPrerequisites] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)

  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name} (${user.username})`,
  }))

  const departmentOptions = allDepartments.map((dept) => ({
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

  // ฟังก์ชันสำหรับ Render Template
  const renderTemplate = useCallback(async () => {
    if (!selectedTemplateId) return

    const assigneeIds = selectedAssignees.map((opt) => opt.value)
    const departmentId = selectedDepartment ? selectedDepartment.value : null

    try {
      const response = await apiClient.post(
        `/api/task-templates/${selectedTemplateId}/render/`,
        {
          project_id: project?.id,
          assignee_ids: assigneeIds,
          department_id: departmentId,
        }
      )
      setTitle(response.data.subject)
      setDescription(response.data.body)
    } catch (error) {
      console.error('Failed to render template', error)
    }
  }, [selectedTemplateId, selectedAssignees, selectedDepartment, project])

  // Re-render Template ทุกครั้งที่ข้อมูลที่เกี่ยวข้องเปลี่ยนแปลง
  useEffect(() => {
    renderTemplate()
  }, [renderTemplate])

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

    // เคลียร์ฟอร์ม
    setTitle('')
    setDescription('')
    setSelectedAssignees([])
    setSelectedDepartment(null)
    setDueDate('')
    setPriority('Medium')
    setPrerequisites([])
    // เราไม่เคลียร์ selectedTemplateId เพื่อให้ผู้ใช้สามารถสร้างงานจาก template เดิมซ้ำได้ง่ายๆ
  }

  return (
    <div className='form-card'>
      <form onSubmit={handleSubmit}>
        <h2>Add New Task</h2>

        <TaskTemplateSelector onTemplateChange={setSelectedTemplateId} />

        <div className='form-group'>
          <label htmlFor='taskTitle'>Task Title (เรื่อง)</label>
          <input
            id='taskTitle'
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className='form-group'>
          <label htmlFor='taskDescription'>Description (รายละเอียด)</label>
          <textarea
            id='taskDescription'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ minHeight: '150px' }}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='assignDept'>
            Assign to Department (for Task Pool)
          </label>
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
          <label htmlFor='assignees'>Assign to Specific Members</label>
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
        <div className='form-group'>
          <label htmlFor='prerequisites'>Prerequisites</label>
          <Select
            id='prerequisites'
            isMulti
            options={taskOptions}
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={prerequisites}
            onChange={setPrerequisites}
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
