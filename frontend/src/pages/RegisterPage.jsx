// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Select from 'react-select' // 1. Import Select
import apiClient from '../api'
import './AuthPage.css'
import '../components/MultiSelect.css' // 2. Import CSS สำหรับ Select

function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
  })
  const [department, setDepartment] = useState(null) // 3. State ใหม่สำหรับเก็บ Department ที่เลือก
  const [departments, setDepartments] = useState([]) // State สำหรับเก็บรายการ Department ทั้งหมด
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  // 4. ดึงข้อมูล Department ทั้งหมดมาตอนที่หน้าเว็บโหลด
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await apiClient.get('/api/auth/departments/')
        setDepartments(response.data)
      } catch (error) {
        console.error('Failed to fetch departments', error)
      }
    }
    fetchDepartments()
  }, [])

  // 5. แปลงข้อมูล Department ให้อยู่ใน format ที่ react-select ต้องการ
  const departmentOptions = departments.map((dept) => ({
    value: dept.id,
    label: dept.name,
  }))

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

    // 6. รวมข้อมูล Department เข้าไปด้วย
    const registrationData = {
      ...formData,
      department: department ? department.value : null,
    }

    try {
      await apiClient.post('/api/auth/register/', registrationData)
      setSuccessMessage(
        'Registration successful! Please wait for admin approval, then you can log in.'
      )
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      console.error('Registration Error:', err.response.data)
      const errorData = err.response.data

      // --- ส่วนที่แก้ไข ---
      // ทำให้การแสดงผล Error แข็งแรงขึ้น
      const errorMessages = Object.entries(errorData).map(([key, value]) => {
        // ตรวจสอบว่า value เป็น array หรือไม่ ก่อนที่จะใช้ .join()
        const message = Array.isArray(value) ? value.join(', ') : value
        return `${key}: ${message}`
      })
      setError(errorMessages.join(' | '))
    }
  }

  return (
    <div className='auth-container'>
      <div className='auth-card'>
        <h2>Register New Account</h2>
        <form onSubmit={handleSubmit}>
          {/* ... input fields เดิมสำหรับ email, username, etc. ... */}
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

          {/* 7. เพิ่มช่องเลือก Department */}
          <Select
            id='department'
            options={departmentOptions}
            isClearable
            className='multi-select-container'
            classNamePrefix='multi-select'
            value={department}
            onChange={setDepartment}
            placeholder='Select Department (optional)'
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
