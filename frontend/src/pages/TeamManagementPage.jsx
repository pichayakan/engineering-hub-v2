// frontend/src/pages/TeamManagementPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom' // 1. Import Link
import apiClient from '../api'
import { useAuth } from '../context/AuthContext'
import AddTeamForm from '../components/AddTeamForm.jsx'
import EditTeamModal from '../components/EditTeamModal.jsx'
import './TeamManagementPage.css'

function TeamManagementPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [teamsRes, usersRes] = await Promise.all([
        apiClient.get('/api/auth/teams/'),
        apiClient.get('/api/auth/users/'),
      ])
      setTeams(teamsRes.data)
      setAllUsers(usersRes.data)
    } catch (error) {
      console.error('Failed to fetch data', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleTeamAdded = async (newTeamData) => {
    setIsSubmitting(true)
    try {
      await apiClient.post('/api/auth/teams/', newTeamData)
      fetchData()
    } catch (error) {
      console.error('Failed to create team', error)
      alert('Could not create team.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTeamUpdated = async (teamId, updatedData) => {
    setIsSubmitting(true)
    try {
      await apiClient.put(`/api/auth/teams/${teamId}/`, updatedData)
      setEditingTeam(null)
      fetchData()
    } catch (error) {
      console.error('Failed to update team', error)
      alert('Could not update team.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTeamDelete = async (teamId) => {
    setIsSubmitting(true)
    try {
      await apiClient.delete(`/api/auth/teams/${teamId}/`)
      setEditingTeam(null)
      fetchData()
    } catch (error) {
      console.error('Failed to delete team', error)
      alert('Could not delete team.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div>Loading teams...</div>

  return (
    <>
      <div className='team-management-layout'>
        <div className='team-list-container'>
          <h2>Team Management</h2>
          {teams.map((team) => (
            <div key={team.id} className='team-item'>
              <div className='team-info'>
                {/* 2. เปลี่ยน p tag ให้เป็น Link */}
                <Link to={`/admin/teams/${team.id}`} className='team-name-link'>
                  {team.name}
                </Link>
                <span className='team-member-count'>
                  {team.members_details.length} members
                </span>
                <ul className='team-members-list'>
                  {team.members_details.length > 0 ? (
                    team.members_details.slice(0, 3).map((member) => (
                      <li key={member.id}>
                        {member.first_name} {member.last_name}
                      </li>
                    ))
                  ) : (
                    <li>No members yet.</li>
                  )}
                  {team.members_details.length > 3 && (
                    <li>...and {team.members_details.length - 3} more</li>
                  )}
                </ul>
              </div>
              {user && user.is_staff && (
                <div className='team-actions'>
                  <button
                    className='action-button edit'
                    onClick={() => setEditingTeam(team)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {user && user.is_staff && (
          <div className='add-team-section'>
            <AddTeamForm
              onTeamAdded={handleTeamAdded}
              isSubmitting={isSubmitting}
            />
          </div>
        )}
      </div>

      <EditTeamModal
        team={editingTeam}
        allUsers={allUsers}
        onSave={handleTeamUpdated}
        onClose={() => setEditingTeam(null)}
        isSaving={isSubmitting}
        onDelete={handleTeamDelete}
      />
    </>
  )
}

export default TeamManagementPage
