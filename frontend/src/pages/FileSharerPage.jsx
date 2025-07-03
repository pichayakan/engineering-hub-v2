import React, { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { QRCodeCanvas } from 'qrcode.react'
import apiClient from '../api'
import './FileSharerPage.css'

function FileSharerPage() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [fileHistory, setFileHistory] = useState([])
  const [copiedLinkId, setCopiedLinkId] = useState(null) // State สำหรับจัดการ feedback "Copied!"

  const fetchHistory = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/share/history/')
      setFileHistory(response.data)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0])
      }
    },
    [title]
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

    try {
      const response = await apiClient.post('/api/share/upload/', formData)
      setUploadedFile(response.data)
      fetchHistory()
      setTitle('')
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

  // ฟังก์ชันสำหรับ Copy Link
  const handleCopyLink = (url, id) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedLinkId(id) // ตั้งค่า ID ของลิงก์ที่ถูก copy
        setTimeout(() => {
          setCopiedLinkId(null) // เคลียร์ค่าหลังจาก 2 วินาที
        }, 2000)
      })
      .catch((err) => {
        console.error('Could not copy text: ', err)
        alert('Failed to copy link.')
      })
  }

  return (
    <div className='file-sharer-container'>
      <h1>File Sharer & QR Code Generator</h1>
      <p
        style={{ color: '#a0a0a0', textAlign: 'center', marginBottom: '2rem' }}
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
        <h2>Upload History</h2>
        <div className='history-table-wrapper'>
          <table className='history-table'>
            <thead>
              <tr>
                <th>Topic / Title</th>
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
