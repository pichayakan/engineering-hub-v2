// frontend/src/components/Header.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";
import logo from "../assets/01_NT-Logo.png";

function Header({ onMenuClick }) {
  const { user, logoutUser } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick}>
          ☰
        </button>
        <Link to="/" className="header-logo-link">
          <img src={logo} alt="NT Logo" className="header-logo" />
          <h1 className="header-title">Engineering Hub</h1>
        </Link>
      </div>
      <div className="header-right">
        {user ? (
          <>
            <Link to={`/profile/${user.id}`} className="user-info-link">
              Welcome, <strong>{user.first_name || user.username}</strong>
            </Link>
            <button onClick={logoutUser} className="logout-button">
              Logout
            </button>
          </>
        ) : (
          <div>Loading user...</div>
        )}
      </div>
    </header>
  );
}

export default Header;
