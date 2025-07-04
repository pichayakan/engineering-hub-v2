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
            <NavLink to='/dashboard' className='nav-link'>
              Dashboard
            </NavLink>
            {user.is_staff && (
              <NavLink to='/workload' className='nav-link'>
                Workload
              </NavLink>
            )}
            {user.is_staff && (
              <NavLink to='/performance' className='nav-link'>
                Performance
              </NavLink>
            )}
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
            <NavLink to='/admin/teams' className='nav-link'>
              Manage Teams
            </NavLink>
          </>
        )}
      </nav>

      <div className='navbar-user'>
        {user ? (
          <>
            {/* --- โครงสร้างที่ถูกต้องสำหรับแสดงผล --- */}
            <div className='user-details'>
              <span className='user-fullname'>
                {user.first_name} {user.last_name}
              </span>
              <span className='user-role'>{user.role}</span>
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
