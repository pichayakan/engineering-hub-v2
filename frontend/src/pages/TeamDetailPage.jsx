// frontend/src/pages/TeamDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../api'
import './TeamDetailPage.css'

function TeamDetailPage() {
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const { teamId } = useParams() // ดึง teamId มาจาก URL

  const fetchTeamDetails = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get(`/api/auth/teams/${teamId}/`)
      setTeam(response.data)
    } catch (error) {
      console.error('Failed to fetch team details', error)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchTeamDetails()
  }, [fetchTeamDetails])

  if (loading) return <div>Loading team details...</div>
  if (!team) return <div>Team not found.</div>

  return (
    <div className='team-detail-container'>
      <div className='team-detail-header'>
        <h1>{team.name}</h1>
        <p>{team.description || 'No description for this team.'}</p>
      </div>

      <div className='members-section'>
        <h2>Members ({team.members_details.length})</h2>
        <div className='members-table-wrapper'>
          <table className='members-table'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {team.members_details.length > 0 ? (
                team.members_details.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className='member-name'>
                        {member.first_name} {member.last_name}
                      </div>
                    </td>
                    <td>{member.username}</td>
                    <td>
                      <a
                        href={`mailto:${member.email}`}
                        className='member-email'
                      >
                        {member.email}
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan='3'
                    style={{ textAlign: 'center', color: '#a0a0a0' }}
                  >
                    This team has no members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link to='/admin/teams' className='nav-link'>
          ← Back to Team Management
        </Link>
      </div>
    </div>
  )
}

export default TeamDetailPage
