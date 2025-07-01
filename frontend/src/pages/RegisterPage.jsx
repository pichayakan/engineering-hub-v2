// frontend/src/pages/RegisterPage.jsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import apiClient from '../api'
import './AuthPage.css' // เราจะสร้าง CSS นี้เพื่อใช้ร่วมกับหน้า Login

function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
  })
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage('')

    if (formData.password !== formData.password2) {
      setError('Passwords do not match.')
      return
    }

    try {
      await apiClient.post('/api/auth/register/', formData)
      setSuccessMessage(
        'Registration successful! Please wait for admin approval, then you can log in.'
      )
      // ทำให้ผู้ใช้เห็นข้อความก่อน redirect
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      console.error('Registration Error:', err.response.data)
      // แปลง error object จาก backend มาแสดงผล
      const errorData = err.response.data
      const errorMessages = Object.entries(errorData).map(
        ([key, value]) => `${key}: ${value.join(', ')}`
      )
      setError(errorMessages.join(' | '))
    }
  }

  return (
    <div className='auth-container'>
      <div className='auth-card'>
        <h2>Register New Account</h2>
        <form onSubmit={handleSubmit}>
          <input
            type='email'
            name='email'
            value={formData.email}
            onChange={handleChange}
            placeholder='Email Address'
            required
          />
          <input
            type='text'
            name='username'
            value={formData.username}
            onChange={handleChange}
            placeholder='Username'
            required
          />
          <input
            type='text'
            name='first_name'
            value={formData.first_name}
            onChange={handleChange}
            placeholder='First Name'
            required
          />
          <input
            type='text'
            name='last_name'
            value={formData.last_name}
            onChange={handleChange}
            placeholder='Last Name'
            required
          />
          <input
            type='password'
            name='password'
            value={formData.password}
            onChange={handleChange}
            placeholder='Password'
            required
          />
          <input
            type='password'
            name='password2'
            value={formData.password2}
            onChange={handleChange}
            placeholder='Confirm Password'
            required
          />
          <button type='submit'>Register</button>
        </form>
        {error && <p className='auth-error'>{error}</p>}
        {successMessage && <p className='auth-success'>{successMessage}</p>}
        <div className='auth-switch'>
          <p>
            Already have an account? <Link to='/login'>Login here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
