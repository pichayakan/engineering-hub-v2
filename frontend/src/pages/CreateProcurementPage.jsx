// frontend/src/pages/CreateProcurementPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import apiClient from '../api'
import '../components/AddProject.css' // ใช้สไตล์ฟอร์มร่วมกัน
import '../components/MultiSelect.css'
import './CreateProcurementPage.css'

function CreateProcurementPage() {
  const [title, setTitle] = useState('')
  const [project, setProject] = useState(null)
  const [workflowTemplate, setWorkflowTemplate] = useState(null)

  const [projects, setProjects] = useState([])
  const [templates, setTemplates] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, templatesRes] = await Promise.all([
          apiClient.get('/api/projects/'),
          apiClient.get('/api/procurement/templates/'),
        ])

        // --- ส่วนที่แก้ไข ---
        // ทำให้รองรับข้อมูลทั้งแบบแบ่งหน้าและไม่แบ่งหน้า
        setProjects(projectsRes.data.results || projectsRes.data)
        setTemplates(templatesRes.data.results || templatesRes.data)
      } catch (error) {
        console.error('Failed to fetch data', error)
      }
    }
    fetchData()
  }, [])

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))
  const templateOptions = templates.map((t) => ({ value: t.id, label: t.name }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!workflowTemplate) {
      alert('Please select a workflow template.')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await apiClient.post('/api/procurement/requests/', {
        title,
        project: project ? project.value : null,
        workflow_template: workflowTemplate.value,
      })
      // ไปยังหน้ารายละเอียดของเรื่องที่เพิ่งสร้าง
      navigate(`/procurement/requests/${response.data.id}`)
    } catch (error) {
      console.error('Failed to create procurement request', error)
      alert('Could not create the request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='create-procurement-container'>
      <div className='form-card'>
        <h1>Create New Procurement Request</h1>
        <form onSubmit={handleSubmit}>
          <div className='form-group'>
            <label htmlFor='reqTitle'>Title</label>
            <input
              id='reqTitle'
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className='form-group'>
            <label htmlFor='reqProject'>Link to Project (Optional)</label>
            <Select
              id='reqProject'
              options={projectOptions}
              isClearable
              className='multi-select-container'
              classNamePrefix='multi-select'
              value={project}
              onChange={setProject}
            />
          </div>
          <div className='form-group'>
            <label htmlFor='reqTemplate'>Workflow Template</label>
            <Select
              id='reqTemplate'
              options={templateOptions}
              className='multi-select-container'
              classNamePrefix='multi-select'
              value={workflowTemplate}
              onChange={setWorkflowTemplate}
              required
            />
          </div>
          <button
            type='submit'
            className='submit-button'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Request'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateProcurementPage
