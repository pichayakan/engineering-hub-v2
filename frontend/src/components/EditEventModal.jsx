// frontend/src/components/EditEventModal.jsx
import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import apiClient from '../api'
import './AddProject.css'
import './EditTaskModal.css'
import './MultiSelect.css'

function EditEventModal({
  event,
  isOpen,
  onClose,
  onEventUpdated,
  onDeleteEvent,
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [participants, setParticipants] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ดึงรายชื่อผู้ใช้ทั้งหมดเมื่อ Modal ถูกเปิด
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const response = await apiClient.get('/api/auth/users/')
          setAllUsers(response.data)
        } catch (error) {
          console.error('Failed to fetch users', error)
        }
      }
      fetchUsers()
    }
  }, [isOpen])

  const userOptions = allUsers.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name}`,
  }))

  // ตั้งค่าข้อมูลเริ่มต้นในฟอร์มเมื่อ prop 'event' เปลี่ยนไป
  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      const toLocalISOString = (dateStr) =>
        new Date(
          new Date(dateStr).getTime() - new Date().getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16)
      setStartTime(toLocalISOString(event.start_time))
      setEndTime(toLocalISOString(event.end_time))

      const currentParticipants = event.participants_details.map((p) => ({
        value: p.id,
        label: `${p.first_name} ${p.last_name}`,
      }))
      setParticipants(currentParticipants)
    }
  }, [event])

  if (!isOpen || !event) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const participantIds = participants.map((p) => p.value)
    try {
      // ส่งข้อมูลไปให้ฟังก์ชันแม่จัดการ
      await onEventUpdated({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        participants: participantIds,
      })
      onClose() // ปิด Modal เมื่อสำเร็จ
    } catch (error) {
      console.error('Failed to update event', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = () => {
    // เรียกใช้ฟังก์ชันลบที่ได้รับมาจากแม่
    onDeleteEvent(event.id)
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
          <form onSubmit={handleSubmit}>
            <h2>Edit Event: {event.title}</h2>

            {/* --- ส่วนของฟอร์มที่เพิ่มกลับเข้ามา --- */}
            <div className='form-group'>
              <label htmlFor='editEventTitle'>Event Title</label>
              <input
                id='editEventTitle'
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editEventDescription'>Description</label>
              <textarea
                id='editEventDescription'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editStartTime'>Start Time</label>
              <input
                id='editStartTime'
                type='datetime-local'
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editEndTime'>End Time</label>
              <input
                id='editEndTime'
                type='datetime-local'
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='editParticipants'>Participants</label>
              <Select
                id='editParticipants'
                isMulti
                options={userOptions}
                className='multi-select-container'
                classNamePrefix='multi-select'
                value={participants}
                onChange={setParticipants}
              />
            </div>

            <div className='modal-footer'>
              <button
                type='button'
                className='delete-team-button'
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Delete Event
              </button>
              <button
                type='submit'
                className='submit-button'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditEventModal
