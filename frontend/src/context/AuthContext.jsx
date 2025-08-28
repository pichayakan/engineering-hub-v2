// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import apiClient from "../api";
import { useNavigate } from "react-router-dom"; // ✅ Added useNavigate

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  // ✅ MODIFIED: Check both storages to initialize state
  const [authTokens, setAuthTokens] = useState(() => {
    const storedTokens =
      localStorage.getItem("authTokens") ||
      sessionStorage.getItem("authTokens");
    return storedTokens ? JSON.parse(storedTokens) : null;
  });

  const [user, setUser] = useState(() => {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [unseenTaskCount, setUnseenTaskCount] = useState(0);
  const navigate = useNavigate(); // ✅ Added navigate

  // ✅ MODIFIED: loginUser now accepts the rememberMe flag
  const loginUser = async (email, password, rememberMe = false) => {
    try {
      const tokenResponse = await apiClient.post("/api/token/", {
        email,
        password,
      });
      if (tokenResponse.status === 200) {
        const tokens = tokenResponse.data;
        const userResponse = await apiClient.get("/api/auth/user/", {
          headers: { Authorization: `Bearer ${tokens.access}` },
        });
        const userData = userResponse.data;

        // --- THIS IS THE CORE "REMEMBER ME" LOGIC ---
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("authTokens", JSON.stringify(tokens));
        storage.setItem("user", JSON.stringify(userData));
        // --- END OF LOGIC ---

        setAuthTokens(tokens);
        setUser(userData);
        return true;
      }
    } catch (error) {
      console.error("Login Error:", error);
      logoutUser();
      alert("Login failed! Please check your credentials.");
      return false;
    }
  };

  // ✅ MODIFIED: logoutUser now clears both storages
  const logoutUser = () => {
    setAuthTokens(null);
    setUser(null);
    setUnseenTaskCount(0);
    localStorage.removeItem("authTokens");
    localStorage.removeItem("user");
    sessionStorage.removeItem("authTokens");
    sessionStorage.removeItem("user");
    navigate("/login"); // Redirect to login on logout
  };

  const fetchUnseenTaskCount = async () => {
    if (!user) return;
    try {
      const response = await apiClient.get("/api/notifications/?is_read=false");
      setUnseenTaskCount(response.data.count || 0);
    } catch (error) {
      console.error("Failed to fetch notification count", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnseenTaskCount();
      const intervalId = setInterval(fetchUnseenTaskCount, 60000);
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const contextData = {
    user: user,
    authTokens: authTokens,
    unseenTaskCount: unseenTaskCount,
    fetchUnseenTaskCount: fetchUnseenTaskCount,
    loginUser: loginUser,
    logoutUser: logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  );
};
