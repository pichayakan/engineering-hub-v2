// frontend/src/components/EditDepartmentModal.jsx
import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import './AddProject.css'
import './EditTaskModal.css'
import './MultiSelect.css'

function EditDepartmentModal({
  department,
  allUsers,
  allDepartments,
  onSave,
  onClose,
  isSaving,
  onDelete,
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parent, setParent] = useState(null)
  const [manager, setManager] = useState(null)

  const userOptions = allUsers.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name} (${user.username})`,
  }))

  // กรอง Department ที่กำลังแก้ไขและลูกๆ ของมันออกไป เพื่อป้องกันการสร้าง Loop
  const departmentOptions = allDepartments
    .filter((d) => d.id !== department?.id) // ไม่สามารถเลือกตัวเองเป็น parent ได้
    .map((dept) => ({
      value: dept.id,
      label: dept.name,
    }))

  useEffect(() => {
    if (department) {
      setName(department.name)
      setDescription(department.description || '')
      // หา object ของ parent และ manager ที่ตรงกันเพื่อแสดงผลใน Select
      setParent(
        departmentOptions.find((opt) => opt.value === department.parent) || null
      )
      setManager(
        userOptions.find((opt) => opt.value === department.manager) || null
      )
    }
  }, [department])

  // ถ้าไม่มี department ที่ถูกเลือกให้แก้ไข ก็ไม่ต้องแสดงอะไรเลย
  if (!department) {
    return null
  }

  const handleSave = (e) => {
    e.preventDefault()
    const updatedData = {
      name,
      description,
      parent: parent ? parent.value : null,
      manager: manager ? manager.value : null,
    }
    onSave(department.id, updatedData)
  }

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${department.name}"? This action cannot be undone.`
      )
    ) {
      onDelete(department.id)
    }
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
            <h2>Edit Department: {department.name}</h2>

            {/* --- ส่วนของฟอร์มที่เพิ่มกลับเข้ามา --- */}
            <div className='form-group'>
              <label htmlFor='editDeptName'>Department Name</label>
              <input
                id='editDeptName'
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editDeptDescription'>Description</label>
              <textarea
                id='editDeptDescription'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editDeptParent'>Parent Department</label>
              <Select
                id='editDeptParent'
                options={departmentOptions}
                isClearable
                className='multi-select-container'
                classNamePrefix='multi-select'
                value={parent}
                onChange={setParent}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editDeptManager'>Manager</label>
              <Select
                id='editDeptManager'
                options={userOptions}
                isClearable
                className='multi-select-container'
                classNamePrefix='multi-select'
                value={manager}
                onChange={setManager}
              />
            </div>

            <div className='modal-footer'>
              <button
                type='button'
                className='delete-team-button'
                onClick={handleDelete}
                disabled={isSaving}
              >
                Delete Department
              </button>
              <button
                type='submit'
                className='submit-button'
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditDepartmentModal
