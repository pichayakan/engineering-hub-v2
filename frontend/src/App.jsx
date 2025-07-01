// frontend/src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage'
import ProjectDetail from './pages/ProjectDetail.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import MyTasksPage from './pages/MyTasksPage.jsx' // 1. Import หน้าใหม่เข้ามา
import ProtectedRoute from './utils/ProtectedRoute.jsx'
import './App.css'

function App() {
  return (
    <div className='App'>
      <Navbar />
      <main className='main-content'>
        <Routes>
          {/* Public Routes */}
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path='/' element={<HomePage />} />
            <Route path='/my-tasks' element={<MyTasksPage />} />{' '}
            {/* <-- 2. เพิ่ม Route ใหม่ที่นี่ */}
            <Route path='/projects/:projectId' element={<ProjectDetail />} />
          </Route>
        </Routes>
      </main>
    </div>
  )
}

export default App
