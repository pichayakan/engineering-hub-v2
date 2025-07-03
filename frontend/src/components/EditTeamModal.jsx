// frontend/src/components/EditTeamModal.jsx
import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import './AddProject.css' // ใช้สไตล์ฟอร์มเดียวกัน
import './EditTaskModal.css' // ใช้สไตล์ Modal เดียวกัน
import './MultiSelect.css' // ใช้สไตล์สำหรับ Dropdown

// 1. เพิ่ม prop `onDelete` เข้ามา
function EditTeamModal({
  team,
  allUsers,
  onSave,
  onClose,
  isSaving,
  onDelete,
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])

  const userOptions = allUsers.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name} (${user.username})`,
  }))

  useEffect(() => {
    if (team) {
      setName(team.name)
      setDescription(team.description || '')
      const currentMembers = team.members_details.map((member) => ({
        value: member.id,
        label: `${member.first_name} ${member.last_name} (${member.username})`,
      }))
      setSelectedMembers(currentMembers)
    }
  }, [team])

  if (!team) {
    return null
  }

  const handleSave = (e) => {
    e.preventDefault()
    const memberIds = selectedMembers.map((option) => option.value)
    onSave(team.id, { name, description, members: memberIds })
  }

  // 2. สร้างฟังก์ชันสำหรับยืนยันการลบ
  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete the team "${team.name}"? This action cannot be undone.`
      )
    ) {
      onDelete(team.id)
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
            <h2>Edit Team: {team.name}</h2>
            {/* ... form groups for name, description, members ... */}
            <div className='form-group'>
              <label htmlFor='editTeamName'>Team Name</label>
              <input
                id='editTeamName'
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editTeamDescription'>Description</label>
              <textarea
                id='editTeamDescription'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='teamMembers'>Members</label>
              <Select
                id='teamMembers'
                isMulti
                options={userOptions}
                className='multi-select-container'
                classNamePrefix='multi-select'
                value={selectedMembers}
                onChange={setSelectedMembers}
                placeholder='Select members...'
              />
            </div>

            {/* 3. เพิ่มส่วน footer สำหรับปุ่ม */}
            <div className='modal-footer'>
              <button
                type='button'
                className='delete-team-button'
                onClick={handleDelete}
                disabled={isSaving}
              >
                Delete Team
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

export default EditTeamModal
