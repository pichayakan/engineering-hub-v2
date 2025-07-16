// frontend/src/components/ProjectList.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import './ProjectList.css'

function ProjectList({ projects }) {
  if (!projects || projects.length === 0) {
    return (
      <div className='project-list-card'>
        <h2>Project List</h2>
        <p>No projects found.</p>
      </div>
    )
  }

  return (
    <div className='project-list-card'>
      <h2>Project List</h2>
      <ul className='project-list'>
        {projects.map((p) => (
          <li key={p.id} className='project-item'>
            <Link to={`/projects/${p.id}`} className='project-link'>
              <div className='project-link-main'>
                <span className='project-name'>{p.name}</span>
                <div className='project-task-summary'>
                  <span>
                    Tasks: {p.completed_tasks} / {p.total_tasks}
                  </span>
                  {p.total_tasks > 0 && (
                    <progress
                      className='task-progress-bar'
                      value={p.completed_tasks}
                      max={p.total_tasks}
                    ></progress>
                  )}
                </div>
              </div>
              <span className='project-owner'>Owner: {p.owner_username}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProjectList
