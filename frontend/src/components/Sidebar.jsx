// frontend/src/components/Sidebar.jsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

function Sidebar({ isOpen, onClose }) {
  // 1. ดึงข้อมูล user และ unseenTaskCount มาจาก Context
  const { user, logoutUser, unseenTaskCount } = useAuth()

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
      ></div>
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className='sidebar-header'>
          <h3>Menu</h3>
          <button className='sidebar-close-btn' onClick={onClose}>
            &times;
          </button>
        </div>
        <nav className='sidebar-nav'>
          {user && (
            <>
              <NavLink to='/' className='sidebar-link' onClick={onClose} end>
                Home
              </NavLink>
              <NavLink
                to='/dashboard'
                className='sidebar-link'
                onClick={onClose}
              >
                Dashboard
              </NavLink>

              <NavLink
                to='/projects'
                className='sidebar-link'
                onClick={onClose}
                end
              >
                All Projects
              </NavLink>
              <NavLink
                to='/procurement'
                className='sidebar-link'
                onClick={onClose}
              >
                Procurement
              </NavLink>
              {/* --- ส่วนที่แก้ไข --- */}
              <NavLink
                to='/my-tasks'
                className='sidebar-link'
                onClick={onClose}
              >
                <span>My Tasks</span>
                {/* 2. เพิ่มเงื่อนไขการแสดงป้ายแจ้งเตือนกลับเข้ามา */}
                {unseenTaskCount > 0 && (
                  <span className='notification-badge'>{unseenTaskCount}</span>
                )}
              </NavLink>

              <NavLink to='/share' className='sidebar-link' onClick={onClose}>
                File Sharer
              </NavLink>

              {user.is_staff && (
                <>
                  <hr style={{ borderColor: '#495057', margin: '1rem 0' }} />
                  <NavLink
                    to='/workload'
                    className='sidebar-link'
                    onClick={onClose}
                  >
                    Workload
                  </NavLink>
                  <NavLink
                    to='/performance'
                    className='sidebar-link'
                    onClick={onClose}
                  >
                    Performance
                  </NavLink>
                  <NavLink
                    to='/admin/departments'
                    className='sidebar-link'
                    onClick={onClose}
                  >
                    Manage Depts
                  </NavLink>
                  <NavLink
                    to='/tasks/all'
                    className='sidebar-link'
                    onClick={onClose}
                  >
                    Task Report
                  </NavLink>
                </>
              )}
            </>
          )}
        </nav>
        {/* ส่วนท้ายของ Sidebar สำหรับปุ่ม Logout */}
        {user && (
          <div className='sidebar-footer'>
            <button onClick={logoutUser} className='sidebar-logout-button'>
              Logout
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar
