// frontend/src/components/EditTaskModal.jsx
import React, { useState, useEffect } from 'react'
import './AddProject.css'
import './EditTaskModal.css'

// รับ prop `users` เข้ามา
function EditTaskModal({ task, users, onSave, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setAssignee(task.assignee || '')
      // 2. ตั้งค่า due_date (ต้องเช็คค่า null และแปลง format)
      setDueDate(task.due_date ? task.due_date : '')
    }
  }, [task])

  if (!task) return null

  const handleSave = (e) => {
    e.preventDefault()
    // ส่งข้อมูล assignee ไปด้วย
    onSave(task.id, {
      title,
      description,
      assignee: assignee || null,
      due_date: dueDate || null,
    })
  }

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-content' onClick={(e) => e.stopPropagation()}>
        {/* ... */}
        <div
          className='form-card'
          style={
            {
              /*...*/
            }
          }
        >
          <form onSubmit={handleSave}>
            <h2>Edit Task</h2>
            {/* ... form group สำหรับ title และ description ... */}

            {/* --- เพิ่ม Form Group นี้เข้าไป --- */}
            <div className='form-group'>
              <label htmlFor='editAssignee'>Assign To</label>
              <select
                id='editAssignee'
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value=''>Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
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
            <button type='submit' className='submit-button'>
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditTaskModal
