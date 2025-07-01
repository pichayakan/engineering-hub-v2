// frontend/src/utils/ProtectedRoute.jsx
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute() {
  const { user } = useAuth()

  if (!user) {
    // ถ้าไม่มี user ใน context ให้ redirect ไปหน้า login
    return <Navigate to='/login' replace />
  }

  // ถ้ามี user ให้แสดง Component ลูก (Outlet)
  return <Outlet />
}

export default ProtectedRoute
