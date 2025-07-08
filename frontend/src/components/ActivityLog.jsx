// frontend/src/components/ActivityLog.jsx
import React, { useState, useEffect } from 'react'
import apiClient from '../api'
import './ActivityLog.css'

function ActivityLog({ task, project }) {
  const [activities, setActivities] = useState([])
  const [visiblePhoneId, setVisiblePhoneId] = useState(null) // State สำหรับจัดการการแสดงเบอร์โทร

  useEffect(() => {
    const fetchActivities = async () => {
      if (task && project) {
        try {
          const response = await apiClient.get(
            `/api/projects/${project.id}/tasks/${task.id}/activities/`
          )
          setActivities(response.data)
        } catch (error) {
          console.error('Failed to fetch activities', error)
        }
      }
    }
    fetchActivities()
  }, [task, project])

  const togglePhoneVisibility = (actorId) => {
    // ถ้าคลิกที่คนเดิมซ้ำ ให้ซ่อนเบอร์โทร, ถ้าคลิกคนใหม่ ให้แสดงเบอร์ของคนใหม่
    setVisiblePhoneId((prevId) => (prevId === actorId ? null : actorId))
  }

  return (
    <div className='activity-log-section'>
      <h4>Activity Log</h4>
      <ul className='activity-list'>
        {activities.map((activity) => (
          <li key={activity.id} className='activity-item'>
            <div className='activity-icon'>⚙️</div>
            <div className='activity-details'>
              <p className='activity-text'>
                {/* เปลี่ยนมาใช้ชื่อ-นามสกุล และทำให้คลิกได้ */}
                <button
                  className='activity-actor-name'
                  onClick={() =>
                    togglePhoneVisibility(activity.actor_details.id)
                  }
                >
                  {activity.actor_details.first_name}{' '}
                  {activity.actor_details.last_name}
                </button>{' '}
                {activity.verb}
              </p>
              {/* แสดงเบอร์โทรเมื่อ ID ตรงกับที่เก็บใน state */}
              {visiblePhoneId === activity.actor_details.id && (
                <div className='actor-phone'>
                  📞 {activity.actor_details.phone_number || 'No phone number'}
                </div>
              )}
              <span className='activity-timestamp'>
                {new Date(activity.created_at).toLocaleString()}
              </span>
            </div>
          </li>
        ))}
        {activities.length === 0 && (
          <p style={{ color: '#a0a0a0' }}>No activities yet.</p>
        )}
      </ul>
    </div>
  )
}

export default ActivityLog
