// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react"; // 🌟 1. เพิ่ม useEffect
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  // 🌟 2. ดึง Email ที่เคยจำไว้ใน localStorage ออกมาใส่ State เมื่อเปิดหน้าเว็บ
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🌟 3. บันทึกหรือลบ Email ตามสถานะของ Checkbox "จดจำการเข้าสู่ระบบ"
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    const loggedIn = await loginUser(email, password, rememberMe);
    if (loggedIn) {
      // navigate("/");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="system-name">ระบบติดตามงาน วขตป.</h1>
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            autoComplete="username" // 🌟 เพิ่ม autoComplete เพื่อให้ Browser ช่วยจำได้ดีขึ้น
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
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
