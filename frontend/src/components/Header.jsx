import React from 'react'
import { useAuth } from '../context/AuthContext'
import './Header.css'

function Header({ onMenuClick }) {
  const { user, logoutUser } = useAuth()

  return (
    <header className='header'>
      <div className='header-left'>
        {/* --- ส่วนที่แก้ไข --- */}
        {/* เพิ่ม className "md:hidden" ของ Tailwind เข้าไป */}
        {/* md:hidden หมายความว่า "ให้ซ่อนปุ่มนี้ เมื่อหน้าจอมีความกว้างตั้งแต่ขนาดกลาง (md) ขึ้นไป" */}
        <button className='hamburger-btn md:hidden' onClick={onMenuClick}>
          ☰
        </button>
        <div className='header-logo'>
          <h1>NT Task Tracker</h1>
        </div>
      </div>
      <div className='header-user-info'>
        {user && (
          <>
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
        )}
      </div>
    </header>
  )
}

export default Header
