// frontend/src/components/CommentSection.jsx
import React, { useState, useEffect } from 'react'
import apiClient from '../api'
import { useAuth } from '../context/AuthContext'
import './CommentSection.css'

function CommentSection({ task, project, onCommentAdded }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    const fetchComments = async () => {
      if (task && project) {
        try {
          const response = await apiClient.get(
            `/api/projects/${project.id}/tasks/${task.id}/comments/`
          )
          setComments(response.data)
        } catch (error) {
          console.error('Failed to fetch comments', error)
        }
      }
    }
    fetchComments()
  }, [task, project])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const response = await apiClient.post(
        `/api/projects/${project.id}/tasks/${task.id}/comments/`,
        {
          text: newComment,
        }
      )
      setComments([...comments, response.data])
      setNewComment('')
      // 2. เรียกใช้ฟังก์ชัน callback ที่ได้รับมา
      onCommentAdded()
    } catch (error) {
      console.error('Failed to add comment', error)
      alert('Could not post comment.')
    }
  }

  return (
    <div className='comment-section'>
      <h4>Comments ({comments.length})</h4>
      <div className='comment-list'>
        {comments.map((comment) => (
          <div key={comment.id} className='comment-item'>
            <div className='comment-author-avatar'>
              {comment.author_details.username.charAt(0).toUpperCase()}
            </div>
            <div className='comment-body'>
              <div className='comment-header'>
                <span className='comment-author-name'>
                  {comment.author_details.username}
                </span>
                <span className='comment-timestamp'>
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className='comment-text'>{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddComment} className='add-comment-form'>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={`Comment as ${user.username}...`}
          required
        />
        <button type='submit'>Comment</button>
      </form>
    </div>
  )
}

export default CommentSection
