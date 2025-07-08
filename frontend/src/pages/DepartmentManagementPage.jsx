// frontend/src/pages/DepartmentManagementPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import apiClient from '../api'
import AddDepartmentForm from '../components/AddDepartmentForm.jsx'
import EditDepartmentModal from '../components/EditDepartmentModal.jsx'
import './DepartmentManagementPage.css'

function DepartmentManagementPage() {
  const [departments, setDepartments] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [deptsRes, usersRes] = await Promise.all([
        apiClient.get('/api/auth/departments/'),
        apiClient.get('/api/auth/users/'),
      ])
      setDepartments(deptsRes.data)
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

  const handleDepartmentAdded = async (newData) => {
    setIsSubmitting(true)
    try {
      await apiClient.post('/api/auth/departments/', newData)
      fetchData()
    } catch (error) {
      console.error('Failed to add department', error)
      alert('Could not add department.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDepartmentUpdated = async (id, updatedData) => {
    setIsSubmitting(true)
    try {
      await apiClient.put(`/api/auth/departments/${id}/`, updatedData)
      setEditingDepartment(null)
      fetchData()
    } catch (error) {
      console.error('Failed to update department', error)
      alert('Could not update department.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDepartmentDelete = async (id) => {
    setIsSubmitting(true)
    try {
      await apiClient.delete(`/api/auth/departments/${id}/`)
      setEditingDepartment(null)
      fetchData()
    } catch (error) {
      console.error('Failed to delete department', error)
      alert('Could not delete department.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const buildTree = (list) => {
    const map = {}
    list.forEach((node) => {
      map[node.id] = { ...node, children: [] }
    })
    const roots = []
    list.forEach((node) => {
      if (node.parent) {
        map[node.parent]?.children.push(map[node.id])
      } else {
        roots.push(map[node.id])
      }
    })
    return roots
  }

  const departmentTree = buildTree(departments)

  const DepartmentNode = ({ node }) => (
    <li>
      <div className='dept-item'>
        <span className='dept-name'>{node.name}</span>
        <button
          className='action-button edit'
          onClick={() => setEditingDepartment(node)}
        >
          Edit
        </button>
      </div>
      {node.children && node.children.length > 0 && (
        <ul className='dept-list dept-node'>
          {node.children.map((child) => (
            <DepartmentNode key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  )

  if (loading) return <div>Loading departments...</div>

  return (
    <>
      <div className='dept-management-layout'>
        <div className='dept-list-container'>
          <h2>Department Structure</h2>
          <ul className='dept-list'>
            {departmentTree.map((node) => (
              <DepartmentNode key={node.id} node={node} />
            ))}
          </ul>
        </div>
        <div className='add-dept-section'>
          <AddDepartmentForm
            onDepartmentAdded={handleDepartmentAdded}
            isSubmitting={isSubmitting}
            allUsers={allUsers}
            allDepartments={departments}
          />
        </div>
      </div>
      <EditDepartmentModal
        department={editingDepartment}
        allUsers={allUsers}
        allDepartments={departments}
        onSave={handleDepartmentUpdated}
        onClose={() => setEditingDepartment(null)}
        onDelete={handleDepartmentDelete}
        isSaving={isSubmitting}
      />
    </>
  )
}

export default DepartmentManagementPage
