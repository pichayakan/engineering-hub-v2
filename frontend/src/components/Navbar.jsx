// frontend/src/components/Navbar.jsx
import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const { user, logoutUser, unseenTaskCount } = useAuth()

  return (
    <header className='navbar'>
      <div className='navbar-brand'>
        <Link to='/' className='navbar-title-link'>
          <h1>ระบบติดตามงาน</h1>
        </Link>
      </div>

      <nav className='navbar-links'>
        {user && (
          <>
            {/* --- Links for All Logged-in Users --- */}
            <NavLink to='/dashboard' className='nav-link'>
              Dashboard
            </NavLink>
            <NavLink to='/' className='nav-link' end>
              All Projects
            </NavLink>
            <NavLink to='/my-tasks' className='nav-link'>
              My Tasks
              {unseenTaskCount > 0 && (
                <span className='notification-badge'>{unseenTaskCount}</span>
              )}
            </NavLink>
            <NavLink to='/share' className='nav-link'>
              File Sharer
            </NavLink>

            {/* --- Admin-only Links (จัดกลุ่มไว้ด้วยกัน) --- */}
            {user.is_staff && (
              <>
                <NavLink to='/tasks/all' className='nav-link'>
                  Task Report
                </NavLink>
                <NavLink to='/workload' className='nav-link'>
                  Workload
                </NavLink>
                <NavLink to='/performance' className='nav-link'>
                  Performance
                </NavLink>
                {/* อัปเดตลิงก์นี้ให้ถูกต้อง และแสดงให้ทุกคนเห็น */}
                <NavLink to='/admin/departments' className='nav-link'>
                  Manage Depts
                </NavLink>
              </>
            )}
          </>
        )}
      </nav>

      <div className='navbar-user'>
        {user ? (
          <>
            <div className='user-details'>
              <span className='user-fullname'>
                {user.first_name} {user.last_name}
              </span>
              {/* --- ส่วนที่แก้ไข --- */}
              {/* แสดง Department และ Role */}
              <div className='user-sub-details'>
                <span className='user-department'>
                  {user.department_name || 'No Department'}
                </span>
                <span className='user-role'>{user.role}</span>
              </div>
            </div>
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
