// frontend/src/utils/AdminRoute.jsx
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AdminRoute() {
  const { user } = useAuth()

  // ตรวจสอบว่ามี user, login อยู่, และเป็น staff หรือไม่
  if (!user) {
    return <Navigate to='/login' replace />
  }

  if (!user.is_staff) {
    // ถ้าไม่ใช่ staff ให้ redirect ไปหน้าแรก
    return <Navigate to='/' replace />
  }

  // ถ้าผ่านทุกเงื่อนไข ให้แสดง Component ลูก
  return <Outlet />
}

export default AdminRoute
