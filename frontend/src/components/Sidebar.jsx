// frontend/src/components/Sidebar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

import {
  FiHome,
  FiShoppingCart,
  FiFileText,
  FiCheckSquare,
  FiShare2,
  FiBarChart2,
  FiUsers,
  FiSettings,
  FiClipboard,
  FiChevronDown,
  FiHardDrive,
  FiPieChart,
  FiPackage,
  FiMonitor, // ✅ Import ไอคอนใหม่
} from "react-icons/fi";

function Sidebar({ isOpen, onClose }) {
  const { user, logoutUser, unseenTaskCount } = useAuth();
  const [isProcurementOpen, setIsProcurementOpen] = useState(false);

  const isSurveyOnly = user?.group_names?.includes("SurveyOnly");

  const isAssetAdmin =
    user?.is_staff ||
    user?.is_superuser ||
    user?.group_names?.includes("AssetAdmin");

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
              {!isSurveyOnly && (
                <>
                  <NavLink
                    to="/"
                    className="sidebar-link"
                    onClick={onClose}
                    end
                  >
                    <FiHome /> <span>หน้าหลัก</span>
                  </NavLink>

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
                          <span>แดชบอร์ดของฉัน</span>
                        </NavLink>

                        <NavLink
                          to="/procurement/analytics"
                          className="sidebar-link sub-menu"
                          onClick={onClose}
                        >
                          <span>ภาพรวมผู้บริหาร</span>
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
                </>
              )}

              {/* --- กลุ่มเมนู ASSETS --- */}
              <NavLink to="/assetnt" className="sidebar-link" onClick={onClose}>
                <FiPackage /> <span>ขอทดแทนครุภัณฑ์</span>
              </NavLink>

              {/* ✅ เพิ่มเมนูระบบสำรวจครุภัณฑ์ประจำปี */}
              <NavLink
                to="/annual-equipments"
                className="sidebar-link"
                onClick={onClose}
                style={{ color: "#4facfe" }}
              >
                <FiMonitor /> <span>สำรวจครุภัณฑ์ประจำปี</span>
              </NavLink>

              {isAssetAdmin && (
                <NavLink
                  to="/assets/admin"
                  className="sidebar-link"
                  onClick={onClose}
                  style={{ color: "#d63384" }}
                >
                  <FiPieChart /> <span>บริหารงานสำรวจ (Admin)</span>
                </NavLink>
              )}

              {!isSurveyOnly && (
                <>
                  <NavLink
                    to="/my-tasks"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    <FiCheckSquare /> <span>แจ้งเตือนงาน</span>
                    {unseenTaskCount > 0 && (
                      <span className="notification-badge">
                        {unseenTaskCount}
                      </span>
                    )}
                  </NavLink>
                  <NavLink
                    to="/share"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    <FiShare2 /> <span>แชร์ไฟล์</span>
                  </NavLink>
                </>
              )}

              {user.is_staff && !isSurveyOnly && (
                <>
                  <hr className="sidebar-divider" />
                  <div
                    className="sidebar-link"
                    style={{
                      pointerEvents: "none",
                      fontSize: "0.85rem",
                      color: "#6c757d",
                      paddingBottom: "0.2rem",
                    }}
                  >
                    ADMIN TOOLS
                  </div>
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
                  <NavLink
                    to="/admin/logs"
                    className="sidebar-link"
                    onClick={onClose}
                  >
                    <FiHardDrive /> <span>System Logs</span>
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
