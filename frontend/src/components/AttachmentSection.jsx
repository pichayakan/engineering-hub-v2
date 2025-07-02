// frontend/src/components/AttachmentSection.jsx
import React, { useState, useEffect } from 'react'
import apiClient from '../api'
import { useAuth } from '../context/AuthContext'
import './AttachmentSection.css'

function AttachmentSection({
  entityType,
  entityId,
  projectId,
  initialAttachments = [],
  onUploadSuccess,
}) {
  const [attachments, setAttachments] = useState(initialAttachments)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    setAttachments(initialAttachments)
  }, [initialAttachments])

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    let url = ''
    if (entityType === 'project') {
      url = `/api/projects/${entityId}/attachments/`
    } else if (entityType === 'task') {
      url = `/api/projects/${projectId}/tasks/${entityId}/attachments/`
    }
    try {
      const response = await apiClient.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAttachments((prevAttachments) => [...prevAttachments, response.data])
      setSelectedFile(null)
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error) {
      console.error('File upload failed:', error)
      alert('Failed to upload file.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (attachmentId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      let url = ''
      if (entityType === 'project') {
        url = `/api/projects/${entityId}/attachments/${attachmentId}/`
      } else if (entityType === 'task') {
        url = `/api/projects/${projectId}/tasks/${entityId}/attachments/${attachmentId}/`
      }
      try {
        await apiClient.delete(url)
        setAttachments(attachments.filter((att) => att.id !== attachmentId))
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } catch (error) {
        console.error('Failed to delete file:', error)
        alert('You might not have permission to delete this file.')
      }
    }
  }

  return (
    <div className='attachment-section'>
      <h3>Attachments ({attachments.length})</h3>
      <ul className='attachment-list'>
        {attachments.map((att) => (
          <li key={att.id} className='attachment-item'>
            <a
              href={att.file}
              target='_blank'
              rel='noopener noreferrer'
              className='attachment-link'
            >
              📎 {att.file.split('/').pop()}
            </a>
            <div className='attachment-details'>
              <span className='attachment-meta'>
                by {att.uploaded_by_details.username} on{' '}
                {new Date(att.uploaded_at).toLocaleDateString()}
              </span>
              {user && user.id === att.uploaded_by && (
                <button
                  onClick={() => handleDelete(att.id)}
                  className='delete-attachment-button'
                  title='Delete file'
                >
                  &times;
                </button>
              )}
            </div>
          </li>
        ))}
        {attachments.length === 0 && (
          <p style={{ color: '#a0a0a0' }}>No files attached.</p>
        )}
      </ul>
      <div className='upload-form'>
        <h4>Upload New File</h4>
        <input
          type='file'
          onChange={handleFileChange}
          className='upload-input'
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className='upload-button'
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  )
}

export default AttachmentSection
