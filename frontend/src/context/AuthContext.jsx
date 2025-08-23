// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react'
import apiClient from '../api'

const AuthContext = createContext()

export const useAuth = () => {
  return useContext(AuthContext)
}

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(() =>
    localStorage.getItem('authTokens')
      ? JSON.parse(localStorage.getItem('authTokens'))
      : null
  )
  const [user, setUser] = useState(() =>
    localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user'))
      : null
  )

  const [unseenTaskCount, setUnseenTaskCount] = useState(0)

  const loginUser = async (email, password) => {
    try {
      const tokenResponse = await apiClient.post('/api/token/', { email, password, })
      if (tokenResponse.status === 200) {
        const tokens = tokenResponse.data
        localStorage.setItem('authTokens', JSON.stringify(tokens))
        setAuthTokens(tokens)
        const userResponse = await apiClient.get('/api/auth/user/')
        const userData = userResponse.data
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        return true
      }
    } catch (error) {
      console.error('Login Error:', error)
      logoutUser()
      alert('Login failed! Please check your credentials.')
      return false
    }
  }

  const logoutUser = () => {
    setAuthTokens(null)
    setUser(null)
    setUnseenTaskCount(0)
    localStorage.removeItem('authTokens')
    localStorage.removeItem('user')
  }

  // ✅ THIS IS THE CORRECTED FUNCTION
  const fetchUnseenTaskCount = async () => {
    if (!user) return;
    try {
        // Use the correct URL to filter for unread notifications
        const response = await apiClient.get('/api/notifications/?is_read=false');
        // The count is in the 'count' property of the paginated response
        setUnseenTaskCount(response.data.count || 0);
    } catch (error) {
        console.error("Failed to fetch notification count", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnseenTaskCount(); // Fetch on initial load/login
      const intervalId = setInterval(fetchUnseenTaskCount, 60000); // Check every 60 seconds
      return () => clearInterval(intervalId);
    }
  }, [user]);

  const contextData = {
    user: user,
    authTokens: authTokens,
    unseenTaskCount: unseenTaskCount,
    fetchUnseenTaskCount: fetchUnseenTaskCount, // Expose the function
    loginUser: loginUser,
    logoutUser: logoutUser,
  }

  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  )
}