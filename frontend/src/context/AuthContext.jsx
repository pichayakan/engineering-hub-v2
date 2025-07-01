// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react'
import { jwtDecode } from 'jwt-decode' // ต้องติดตั้ง: npm install jwt-decode
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
    localStorage.getItem('authTokens')
      ? jwtDecode(localStorage.getItem('authTokens'))
      : null
  )

  const loginUser = async (email, password) => {
    try {
      const response = await apiClient.post('/api/token/', { email, password })
      if (response.status === 200) {
        setAuthTokens(response.data)
        setUser(jwtDecode(response.data.access))
        localStorage.setItem('authTokens', JSON.stringify(response.data))
        return true
      }
    } catch (error) {
      console.error('Login Error:', error)
      alert('Something went wrong with login.')
      return false
    }
  }

  const logoutUser = () => {
    setAuthTokens(null)
    setUser(null)
    localStorage.removeItem('authTokens')
  }

  const contextData = {
    user: user,
    authTokens: authTokens,
    loginUser: loginUser,
    logoutUser: logoutUser,
  }

  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  )
}

export default AuthContext
