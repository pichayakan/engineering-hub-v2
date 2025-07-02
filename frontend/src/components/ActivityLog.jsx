// frontend/src/components/ActivityLog.jsx
import React, { useState, useEffect } from 'react'
import apiClient from '../api'
import './ActivityLog.css'

function ActivityLog({ task, project }) {
  const [activities, setActivities] = useState([])

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

  return (
    <div className='activity-log-section'>
      <h4>Activity Log</h4>
      <ul className='activity-list'>
        {activities.map((activity) => (
          <li key={activity.id} className='activity-item'>
            <div className='activity-icon'>⚙️</div>
            <div className='activity-details'>
              <p className='activity-text'>
                <strong>{activity.actor_details.username}</strong>{' '}
                {activity.verb}
              </p>
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
