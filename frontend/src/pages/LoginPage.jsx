// frontend/src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
//import "./AuthPage.css";
// import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loggedIn = await loginUser(email, password, rememberMe);
    if (loggedIn) {
      navigate("/");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="system-name">ระบบติดตามงาน วขตป.</h1>{" "}
        {/* Added system name */}
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <div className="form-options">
            <div className="remember-me-group">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">จดจำการเข้าสู่ระบบ</label>
            </div>
          </div>
          <button type="submit">เข้าสู่ระบบ</button>
        </form>
        <div className="auth-switch">
          <p>
            ยังไม่มีบัญชีผู้ใช้? <Link to="/register">ลงทะเบียน</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
