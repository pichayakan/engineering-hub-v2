// frontend/src/components/TaskTemplateSelector.jsx
import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import apiClient from '../api'
import './MultiSelect.css'
import './TaskTemplateSelector.css'

function TaskTemplateSelector({ onTemplateChange }) {
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  // ดึงรายการ Template ทั้งหมดจาก API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await apiClient.get('/api/task-templates/')
        setTemplates(response.data)
      } catch (error) {
        console.error('Failed to fetch task templates', error)
      }
    }
    fetchTemplates()
  }, [])

  const templateOptions = templates.map((template) => ({
    value: template.id,
    label: template.name,
  }))

  const handleSelect = (selectedOption) => {
    setSelectedTemplate(selectedOption)
    // ส่งแค่ ID กลับไป หรือ null ถ้าเคลียร์ค่า
    onTemplateChange(selectedOption ? selectedOption.value : null)
  }

  return (
    <div className='template-selector-group'>
      <label htmlFor='task-template-select'>
        Start with a Template (Optional)
      </label>
      <Select
        id='task-template-select'
        options={templateOptions}
        value={selectedTemplate}
        onChange={handleSelect}
        placeholder='Select a template...'
        isClearable
        className='multi-select-container'
        classNamePrefix='multi-select'
        styles={{
          control: (base) => ({
            ...base,
            backgroundColor: 'var(--nt-white)',
            borderColor: 'var(--nt-border-color)',
          }),
        }}
      />
    </div>
  )
}

export default TaskTemplateSelector
