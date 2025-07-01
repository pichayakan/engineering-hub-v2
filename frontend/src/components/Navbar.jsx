// frontend/src/components/Navbar.jsx
import React from 'react'
import { Link, NavLink } from 'react-router-dom' // ใช้ NavLink เพื่อทำ Active Style
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const { user, logoutUser } = useAuth()

  return (
    <header className='navbar'>
      <div className='navbar-brand'>
        <Link to='/' className='navbar-title-link'>
          <h1>ระบบติดตามงาน</h1>
        </Link>
      </div>

      <nav className='navbar-links'>
        {user && ( // แสดงลิงก์เหล่านี้เมื่อ Login แล้วเท่านั้น
          <>
            {/* 1. เปลี่ยน Link เดิมให้เป็น NavLink เพื่อให้มี active style */}
            <NavLink to='/' className='nav-link' end>
              All Projects
            </NavLink>
            {/* 2. เพิ่ม NavLink ใหม่สำหรับ My Tasks */}
            <NavLink to='/my-tasks' className='nav-link'>
              My Tasks
            </NavLink>
          </>
        )}
      </nav>

      <div className='navbar-user'>
        {user ? (
          <>
            <span>สวัสดี, {user.username}</span>
            <button onClick={logoutUser} className='logout-button'>
              Logout
            </button>
          </>
        ) : (
          <div className='guest-links'>
            <NavLink to='/login' className='nav-link'>
              Login
            </NavLink>
            <NavLink to='/register' className='nav-link register'>
              Register
            </NavLink>
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
