// frontend/src/pages/FileSharerPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { QRCodeCanvas } from 'qrcode.react'
import Select from 'react-select'
import apiClient from '../api'
import './FileSharerPage.css'
import '../components/MultiSelect.css' // Re-use styles for Select component

function FileSharerPage() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [fileHistory, setFileHistory] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [historyFilter, setHistoryFilter] = useState('')
  const [copiedLinkId, setCopiedLinkId] = useState(null)

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/share/categories/')
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const params = { category: historyFilter || undefined }
      const response = await apiClient.get('/api/share/history/', { params })
      setFileHistory(response.data.results || response.data) // Handle pagination if added later
    } catch (error) {
      console.error('Failed to fetch history:', error)
    }
  }, [historyFilter])

  useEffect(() => {
    fetchCategories()
    fetchHistory()
  }, [fetchCategories, fetchHistory])

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0])
      }
    },
    [title, selectedCategory]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  })

  const handleUpload = async (file) => {
    if (!title.trim()) {
      alert('Please enter a title for the file.')
      return
    }
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    if (selectedCategory) {
      formData.append('category', selectedCategory.value)
    }

    try {
      const response = await apiClient.post('/api/share/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadedFile(response.data)
      fetchHistory()
      setTitle('')
      setSelectedCategory(null)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('File upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const getDownloadUrl = (fileId) => {
    const baseURL = apiClient.defaults.baseURL || window.location.origin
    return `${baseURL.replace('/api', '')}/download/${fileId}/`
  }

  const handleCopyLink = (url, id) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedLinkId(id)
        setTimeout(() => setCopiedLinkId(null), 2000)
      })
      .catch((err) => {
        console.error('Could not copy text: ', err)
        alert('Failed to copy link.')
      })
  }

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }))

  return (
    <div className='file-sharer-container'>
      <h1>File Sharer & QR Code Generator</h1>
      <p
        style={{ color: '#6c757d', textAlign: 'center', marginBottom: '2rem' }}
      >
        Add a title, then upload a file to generate a shareable link and QR
        code.
      </p>

      <div className='form-group'>
        <label htmlFor='fileTitle'>Topic / Title</label>
        <input
          type='text'
          id='fileTitle'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Enter a title for your file...'
        />
      </div>

      <div className='form-group'>
        <label htmlFor='fileCategory'>Category (Optional)</label>
        <Select
          id='fileCategory'
          options={categoryOptions}
          onChange={setSelectedCategory}
          value={selectedCategory}
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

      <div
        {...getRootProps()}
        className={`upload-box ${isDragActive ? 'is-active' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <p>Uploading...</p>
        ) : isDragActive ? (
          <p>Drop the file here ...</p>
        ) : (
          <p>Drag 'n' drop a file here, or click to select a file</p>
        )}
      </div>

      {uploadedFile && (
        <div className='result-card'>
          <h3>Upload Successful!</h3>
          <div className='qr-code-wrapper'>
            <QRCodeCanvas value={getDownloadUrl(uploadedFile.id)} size={180} />
          </div>
          <div className='download-link-wrapper'>
            <p>Shareable Download Link:</p>
            <div className='download-link'>
              {getDownloadUrl(uploadedFile.id)}
            </div>
            <button
              onClick={() =>
                handleCopyLink(getDownloadUrl(uploadedFile.id), 'new')
              }
              className='copy-link-button'
              style={{ marginTop: '1rem' }}
            >
              {copiedLinkId === 'new' ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      <div className='history-section'>
        <div className='history-header'>
          <h2>Upload History</h2>
          <select
            className='filter-select'
            onChange={(e) => setHistoryFilter(e.target.value)}
            value={historyFilter}
          >
            <option value=''>All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className='history-table-wrapper'>
          <table className='history-table'>
            <thead>
              <tr>
                <th>Topic / Title</th>
                <th>Category</th>
                <th>Uploaded By</th>
                <th>Date</th>
                <th>QR Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fileHistory.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className='history-title'>{file.title}</div>
                    <div className='history-meta'>{file.filename}</div>
                  </td>
                  <td>{file.category_details?.name || 'N/A'}</td>
                  <td>{file.uploaded_by_details?.username || 'N/A'}</td>
                  <td>{new Date(file.uploaded_at).toLocaleDateString()}</td>
                  <td className='qr-cell'>
                    <QRCodeCanvas
                      value={getDownloadUrl(file.id)}
                      size={64}
                      bgColor='#ffffff'
                      fgColor='#000000'
                    />
                  </td>
                  <td className='history-actions'>
                    <a
                      href={getDownloadUrl(file.id)}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      Download
                    </a>
                    <button
                      onClick={() =>
                        handleCopyLink(getDownloadUrl(file.id), file.id)
                      }
                      className='copy-link-button'
                    >
                      {copiedLinkId === file.id ? 'Copied!' : 'Copy Link'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default FileSharerPage
