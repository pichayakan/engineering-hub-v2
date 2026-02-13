// frontend/src/App.jsx
import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";

// Import Layout Components
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";

// Import Page Components
import HomePage from "./pages/HomePage.jsx";
import AllProjectsPage from "./pages/AllProjectsPage.jsx";
import ProjectDetail from "./pages/ProjectDetail.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MyTasksPage from "./pages/MyTasksPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import WorkloadDashboardPage from "./pages/WorkloadDashboardPage.jsx";
import AssignerPerformancePage from "./pages/AssignerPerformancePage.jsx";
import DepartmentManagementPage from "./pages/DepartmentManagementPage.jsx";
import TeamDetailPage from "./pages/TeamDetailPage.jsx";
import FileSharerPage from "./pages/FileSharerPage.jsx";
import KanbanPage from "./pages/KanbanPage.jsx";
import AllTasksPage from "./pages/AllTasksPage.jsx";
import ProcurementListPage from "./pages/ProcurementListPage.jsx";
import CreateProcurementPage from "./pages/CreateProcurementPage.jsx";
import ProcurementDetailPage from "./pages/ProcurementDetailPage.jsx";
import ProjectWorkflowListPage from "./pages/ProjectWorkflowListPage";
import ProjectWorkflowDetailPage from "./pages/ProjectWorkflowDetailPage";
import CreateWorkflowPage from "./pages/CreateWorkflowPage";
import UserProfilePage from "./pages/UserProfilePage";
import ProcurementDashboardPage from "./pages/ProcurementDashboardPage.jsx";
import SystemLogsPage from "./pages/SystemLogsPage";
import ProcurementAnalyticsPage from "./pages/ProcurementAnalyticsPage";

import HelpButton from "./components/HelpButton.jsx";

import AssetsDashboard from "./pages/assets/AssetsDashboard";

// ✅ 1. Import หน้า Admin Dashboard (ถ้ายังไม่มีบรรทัดนี้ให้เพิ่ม)
import AssetsAdminDashboard from "./pages/assets/AssetsAdminDashboard";

// Import Route Guards
import ProtectedRoute from "./utils/ProtectedRoute.jsx";
import AdminRoute from "./utils/AdminRoute.jsx";

import RedirectIfAuth from "./utils/RedirectIfAuth";

// Import Global CSS
import "./App.css";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="App">
      <div className="app-layout">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="main-content-wrapper">
          <Routes>
            {/* --- Public Routes --- */}
            <Route element={<RedirectIfAuth />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* --- Protected Routes (ต้อง Login ก่อน) --- */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<AllProjectsPage />} />
              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/share" element={<FileSharerPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />

              {/* ✅ หน้า User Assets */}
              <Route path="/assetnt" element={<AssetsDashboard />} />

              {/* ✅ ย้าย Assets Admin มาไว้ตรงนี้ (นอก AdminRoute) */}
              {/* เพื่อให้ User ธรรมดาที่มี Group "AssetAdmin" สามารถเข้าถึงได้ */}
              {/* (การเช็คสิทธิ์จะทำภายในไฟล์ AssetsAdminDashboard แทน) */}
              <Route path="/assets/admin" element={<AssetsAdminDashboard />} />

              <Route
                path="/projects/:projectId/kanban"
                element={<KanbanPage />}
              />
              <Route
                path="/admin/departments"
                element={<DepartmentManagementPage />}
              />
              <Route path="/procurement" element={<ProcurementListPage />} />
              <Route
                path="/procurement/new"
                element={<CreateProcurementPage />}
              />
              <Route
                path="/procurement/requests/:requestId"
                element={<ProcurementDetailPage />}
              />
              <Route path="/admin/teams/:teamId" element={<TeamDetailPage />} />

              {/* --- Admin-only Routes (บังคับ is_staff=True เท่านั้น) --- */}
              <Route element={<AdminRoute />}>
                <Route path="/workload" element={<WorkloadDashboardPage />} />
                <Route
                  path="/performance"
                  element={<AssignerPerformancePage />}
                />
                <Route path="/tasks/all" element={<AllTasksPage />} />
                <Route path="/admin/logs" element={<SystemLogsPage />} />

                {/* ❌ เอา Assets Admin ออกจากตรงนี้แล้ว */}
              </Route>

              <Route path="/workflows" element={<ProjectWorkflowListPage />} />
              <Route
                path="/workflows/:workflowId"
                element={<ProjectWorkflowDetailPage />}
              />
            </Route>

            <Route path="/workflows/new" element={<CreateWorkflowPage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />
            <Route
              path="/procurement/dashboard"
              element={<ProcurementDashboardPage />}
            />
            <Route
              path="/procurement/analytics"
              element={<ProcurementAnalyticsPage />}
            />
          </Routes>
        </main>
        <HelpButton />
      </div>
    </div>
  );
}

export default App;
