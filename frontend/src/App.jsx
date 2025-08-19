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
import TeamDetailPage from "./pages/TeamDetailPage.jsx"; // This might be refactored to DepartmentDetailPage later
import FileSharerPage from "./pages/FileSharerPage.jsx";
import KanbanPage from "./pages/KanbanPage.jsx";
import AllTasksPage from "./pages/AllTasksPage.jsx";
import ProcurementListPage from "./pages/ProcurementListPage.jsx";
import CreateProcurementPage from "./pages/CreateProcurementPage.jsx";
import ProcurementDetailPage from "./pages/ProcurementDetailPage.jsx";
import ProjectWorkflowListPage from "./pages/ProjectWorkflowListPage";
import ProjectWorkflowDetailPage from "./pages/ProjectWorkflowDetailPage";
import CreateWorkflowPage from "./pages/CreateWorkflowPage";

// Import Route Guards
import ProtectedRoute from "./utils/ProtectedRoute.jsx";
import AdminRoute from "./utils/AdminRoute.jsx";

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
            {/* เส้นทางที่ทุกคนสามารถเข้าถึงได้โดยไม่ต้อง Login */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            {/* --- Protected Routes --- */}
            {/* เส้นทางทั้งหมดที่อยู่ข้างในนี้ จะต้องทำการ Login ก่อน */}
            <Route element={<ProtectedRoute />}>
              {/* Routes for all authenticated users */}
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<AllProjectsPage />} />
              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/share" element={<FileSharerPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
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
              <Route path="/admin/teams/:teamId" element={<TeamDetailPage />} />{" "}
              {/* Note: This might be deprecated */}
              {/* --- Admin-only Routes --- */}
              {/* เส้นทางที่อยู่ข้างในนี้ จะต้องเป็น Admin (is_staff=True) เท่านั้น */}
              <Route element={<AdminRoute />}>
                <Route path="/workload" element={<WorkloadDashboardPage />} />
                <Route
                  path="/performance"
                  element={<AssignerPerformancePage />}
                />
                <Route path="/tasks/all" element={<AllTasksPage />} />
              </Route>
              <Route path="/workflows" element={<ProjectWorkflowListPage />} />
              <Route
                path="/workflows/:workflowId"
                element={<ProjectWorkflowDetailPage />}
              />
            </Route>
            <Route path="/workflows/new" element={<CreateWorkflowPage />} />{" "}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
