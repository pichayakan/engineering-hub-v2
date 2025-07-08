// frontend/src/components/AddDepartmentForm.jsx
import React, { useState } from 'react'
import Select from 'react-select'
import './AddProject.css' // ใช้สไตล์ฟอร์มเดียวกัน
import './MultiSelect.css'

function AddDepartmentForm({
  onDepartmentAdded,
  isSubmitting,
  allUsers,
  allDepartments,
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parent, setParent] = useState(null)
  const [manager, setManager] = useState(null)

  const userOptions = allUsers.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name} (${user.username})`,
  }))

  const departmentOptions = allDepartments.map((dept) => ({
    value: dept.id,
    label: dept.name,
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const newDeptData = {
      name,
      description,
      parent: parent ? parent.value : null,
      manager: manager ? manager.value : null,
    }

    await onDepartmentAdded(newDeptData)

    // เคลียร์ฟอร์ม
    setName('')
    setDescription('')
    setParent(null)
    setManager(null)
  }

  return (
    <div className='form-card'>
      <form onSubmit={handleSubmit}>
        <h2>Create New Department</h2>
        <div className='form-group'>
          <label htmlFor='deptName'>Department Name</label>
          <input
            id='deptName'
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className='form-group'>
          <label htmlFor='deptDescription'>Description</label>
          <textarea
            id='deptDescription'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='deptParent'>Parent Department</label>
          <Select
            id='deptParent'
            options={departmentOptions}
            isClearable
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={parent}
            onChange={setParent}
            placeholder='Select a parent (optional)'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='deptManager'>Manager</label>
          <Select
            id='deptManager'
            options={userOptions}
            isClearable
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={manager}
            onChange={setManager}
            placeholder='Select a manager (optional)'
          />
        </div>
        <button type='submit' className='submit-button' disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Department'}
        </button>
      </form>
    </div>
  )
}

export default AddDepartmentForm
