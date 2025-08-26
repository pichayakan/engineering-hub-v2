// frontend/src/components/Sidebar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

// --- ✅ IMPORT ICONS ---
import {
  FiHome,
  FiGrid,
  FiArchive,
  FiShoppingCart,
  FiFileText,
  FiCheckSquare,
  FiShare2,
  FiBarChart2,
  FiUsers,
  FiSettings,
  FiClipboard,
  FiChevronDown,
} from "react-icons/fi";

function Sidebar({ isOpen, onClose }) {
  const { user, logoutUser, unseenTaskCount } = useAuth();
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);

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
                <FiHome /> <span>หน้าหลัก</span>
              </NavLink>
              {/* <NavLink
                to="/dashboard"
                className="sidebar-link"
                onClick={onClose}
              >
                <FiGrid /> <span>แดชบอร์ด</span>
              </NavLink>
              <NavLink
                to="/projects"
                className="sidebar-link"
                onClick={onClose}
                end
              >
                <FiArchive /> <span>โปรเจกต์ทั้งหมด</span>
              </NavLink> */}

              {/* --- ✅ UPDATED: Collapsible Procurement Menu --- */}
              <div
                className={`sidebar-link-group ${
                  isProcurementOpen ? "is-open" : ""
                }`}
              >
                <div
                  className="sidebar-menu-toggle"
                  onClick={() => setIsProcurementOpen(!isProcurementOpen)}
                >
                  <div className="menu-toggle-left">
                    <FiShoppingCart /> <span>ระบบติดตามงาน วขตป.</span>
                  </div>
                  <FiChevronDown className="menu-chevron" />
                </div>

                {isProcurementOpen && (
                  <div className="sub-menu-container">
                    <NavLink
                      to="/procurement/dashboard"
                      className="sidebar-link sub-menu"
                      onClick={onClose}
                    >
                      <span>แดชบอร์ด</span>
                    </NavLink>
                    <NavLink
                      to="/procurement"
                      className="sidebar-link sub-menu"
                      onClick={onClose}
                      end
                    >
                      <span>รายการทั้งหมด</span>
                    </NavLink>
                  </div>
                )}
              </div>

              <NavLink
                to="/workflows"
                className="sidebar-link"
                onClick={onClose}
              >
                <FiFileText /> <span>ระบบติดตามงานจัดหาฯ</span>
              </NavLink>
              <NavLink
                to="/my-tasks"
                className="sidebar-link"
                onClick={onClose}
              >
                <FiCheckSquare /> <span>งานของฉัน</span>
                {unseenTaskCount > 0 && (
                  <span className="notification-badge">{unseenTaskCount}</span>
                )}
              </NavLink>
              <NavLink to="/share" className="sidebar-link" onClick={onClose}>
                <FiShare2 /> <span>แชร์ไฟล์</span>
              </NavLink>

              {user.is_staff && (
                <>
                  <hr className="sidebar-divider" />
                  <NavLink
                    to="/workload"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    <FiBarChart2 /> <span>ภาระงาน</span>
                  </NavLink>
                  <NavLink
                    to="/performance"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    <FiUsers /> <span>ประสิทธิภาพ</span>
                  </NavLink>
                  <NavLink
                    to="/admin/departments"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    <FiSettings /> <span>จัดการแผนก</span>
                  </NavLink>
                  <NavLink
                    to="/tasks/all"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    <FiClipboard /> <span>รายงาน Task</span>
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
