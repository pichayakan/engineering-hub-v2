// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react'
import apiClient from '../api'

const AuthContext = createContext()

export const useAuth = () => {
  return useContext(AuthContext)
}

export const AuthProvider = ({ children }) => {
  // ดึงข้อมูล tokens และ user object ทั้งหมดจาก localStorage
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
      // 1. ขอ Tokens
      const tokenResponse = await apiClient.post('/api/token/', {
        email,
        password,
      })

      if (tokenResponse.status === 200) {
        const tokens = tokenResponse.data
        // เก็บ token ใน localStorage ก่อนเพื่อให้ Interceptor ทำงานได้
        localStorage.setItem('authTokens', JSON.stringify(tokens))
        setAuthTokens(tokens)

        // 2. ใช้ token ใหม่เพื่อขอข้อมูลผู้ใช้ทั้งหมด
        const userResponse = await apiClient.get('/api/auth/user/')
        const userData = userResponse.data

        // 3. เก็บข้อมูลผู้ใช้ทั้งหมดลงใน state และ localStorage
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))

        return true
      }
    } catch (error) {
      console.error('Login Error:', error)
      // ล้างข้อมูลเก่าทิ้งถ้า Login ล้มเหลว
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
    localStorage.removeItem('user') // ต้องลบข้อมูล user ออกด้วย
  }

  useEffect(() => {
    let interval
    if (user) {
      const fetchUnseenCount = async () => {
        try {
          const response = await apiClient.get(
            '/api/notifications/unseen-count/'
          )
          setUnseenTaskCount(response.data.unseen_count)
        } catch (error) {
          console.error('Failed to fetch unseen task count', error)
        }
      }

      fetchUnseenCount()
      interval = setInterval(fetchUnseenCount, 30000)
    }

    return () => clearInterval(interval)
  }, [user])

  const contextData = {
    user: user, // ตอนนี้ user คือ object ที่มีข้อมูลครบถ้วน
    authTokens: authTokens,
    unseenTaskCount: unseenTaskCount,
    setUnseenTaskCount: setUnseenTaskCount,
    loginUser: loginUser,
    logoutUser: logoutUser,
  }

  return (
    <AuthContext.Provider value={contextData}>{children}</AuthContext.Provider>
  )
}

export default AuthContext
