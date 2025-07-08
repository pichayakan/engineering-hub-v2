// frontend/src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import KanbanPage from './pages/KanbanPage.jsx'

import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage'
import ProjectDetail from './pages/ProjectDetail.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import MyTasksPage from './pages/MyTasksPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx' // 1. Import
import ProtectedRoute from './utils/ProtectedRoute.jsx'
import FileSharerPage from './pages/FileSharerPage.jsx'
import AdminRoute from './utils/AdminRoute.jsx' // 1. Import ยามคนใหม่
import TeamManagementPage from './pages/TeamManagementPage.jsx'
import DepartmentManagementPage from './pages/DepartmentManagementPage.jsx'
import TeamDetailPage from './pages/TeamDetailPage.jsx'
import WorkloadDashboardPage from './pages/WorkloadDashboardPage.jsx'
import AssignerPerformancePage from './pages/AssignerPerformancePage.jsx'
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

          {/* Protected Routes (สำหรับผู้ใช้ที่ Login แล้วทุกคน) */}
          <Route element={<ProtectedRoute />}>
            <Route path='/' element={<HomePage />} />
            <Route path='/dashboard' element={<DashboardPage />} />
            <Route path='/my-tasks' element={<MyTasksPage />} />
            <Route path='/projects/:projectId' element={<ProjectDetail />} />
            <Route
              path='/projects/:projectId/kanban'
              element={<KanbanPage />}
            />
            <Route
              path='/admin/departments'
              element={<DepartmentManagementPage />}
            />
            <Route path='/share' element={<FileSharerPage />} />{' '}
            {/* <-- ย้าย Route มาไว้ที่นี่ */}
            {/* Admin-only Routes */}
            <Route element={<AdminRoute />}>
              <Route path='/workload' element={<WorkloadDashboardPage />} />
              <Route
                path='/performance'
                element={<AssignerPerformancePage />}
              />
              <Route path='/admin/teams' element={<TeamManagementPage />} />
              <Route path='/admin/teams/:teamId' element={<TeamDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </main>
    </div>
  )
}

export default App