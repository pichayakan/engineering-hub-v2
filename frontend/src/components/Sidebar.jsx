// frontend/src/components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
  const { user, logoutUser, unseenTaskCount } = useAuth();

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
      ></div>
      <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <h3>เมนู</h3>
          <button className="sidebar-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <nav className="sidebar-nav">
          {user && (
            <>
              <NavLink to="/" className="sidebar-link" onClick={onClose} end>
                หน้าหลัก
              </NavLink>
              <NavLink
                to="/dashboard"
                className="sidebar-link"
                onClick={onClose}
              >
                แดชบอร์ด
              </NavLink>
              <NavLink
                to="/projects"
                className="sidebar-link"
                onClick={onClose}
                end
              >
                โปรเจกต์ทั้งหมด
              </NavLink>
              <NavLink
                to="/procurement"
                className="sidebar-link"
                onClick={onClose}
              >
                ระบบตามงาน วขตป.
              </NavLink>

              {/* --- ✅ ADDED THIS NEW MENU ITEM --- */}
              <NavLink
                to="/workflows"
                className="sidebar-link"
                onClick={onClose}
              >
                ระบบ Workflow
              </NavLink>

              <NavLink
                to="/my-tasks"
                className="sidebar-link"
                onClick={onClose}
              >
                <span>งานของฉัน</span>
                {unseenTaskCount > 0 && (
                  <span className="notification-badge">{unseenTaskCount}</span>
                )}
              </NavLink>
              <NavLink to="/share" className="sidebar-link" onClick={onClose}>
                แชร์ไฟล์
              </NavLink>

              {user.is_staff && (
                <>
                  <hr style={{ borderColor: "#495057", margin: "1rem 0" }} />
                  <NavLink
                    to="/workload"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    ภาระงาน
                  </NavLink>
                  <NavLink
                    to="/performance"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    ประสิทธิภาพ
                  </NavLink>
                  <NavLink
                    to="/admin/departments"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    จัดการแผนก
                  </NavLink>
                  <NavLink
                    to="/tasks/all"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    รายงาน Task
                  </NavLink>
                </>
              )}
            </>
          )}
        </nav>
        {user && (
          <div className="sidebar-footer">
            <button onClick={logoutUser} className="sidebar-logout-button">
              ออกจากระบบ
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
