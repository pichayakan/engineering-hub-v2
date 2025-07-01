// frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import './AuthPage.css' // <-- 1. Import CSS ใหม่

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { loginUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const loggedIn = await loginUser(email, password)
    if (loggedIn) {
      navigate('/')
    }
  }

  return (
    // 2. ใช้ className เดียวกัน
    <div className='auth-container'>
      <div className='auth-card'>
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Email Address'
            required
          />
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='Password'
            required
          />
          <button type='submit'>Login</button>
        </form>
        {/* 3. เพิ่มลิงก์ไปหน้า Register */}
        <div className='auth-switch'>
          <p>
            Don't have an account? <Link to='/register'>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
