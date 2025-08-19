// frontend/src/components/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // ✅ IMPORT Link
import { useAuth } from '../context/AuthContext';
import './Header.css';
import logo from '../assets/01_NT-Logo.png'; // ✅ IMPORT รูปโลโก้

function Header({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick}>
          ☰
        </button>
        {/* --- ✅ ADDED: Logo with a link to homepage --- */}
        <Link to="/" className="header-logo-link">
          <img src={logo} alt="NT Logo" className="header-logo" />
          <h1 className="header-title">Engineering Hub</h1>
        </Link>
      </div>
      <div className="header-right">
        {user ? (
          <div className="user-info">
            Welcome, <strong>{user.first_name || user.username}</strong>
          </div>
        ) : (
          <div>Loading user...</div>
        )}
      </div>
    </header>
  );
}

export default Header;