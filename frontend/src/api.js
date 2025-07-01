import axios from 'axios'

// สร้าง apiClient instance พื้นฐาน
const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
})

// Interceptor 1: สำหรับ "ขาไป" (Request)
// - ทำหน้าที่แนบ Access Token ไปกับทุกๆ request
apiClient.interceptors.request.use(
  (config) => {
    const authTokens = localStorage.getItem('authTokens')
      ? JSON.parse(localStorage.getItem('authTokens'))
      : null
    if (authTokens) {
      config.headers['Authorization'] = `Bearer ${authTokens.access}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor 2: สำหรับ "ขากลับ" (Response) - นี่คือส่วนที่เพิ่มเข้ามา
// - ทำหน้าที่ดักจับ Error ที่เกิดขึ้น
apiClient.interceptors.response.use(
  // ถ้า Response สำเร็จ ก็ส่งต่อไปตามปกติ
  (response) => response,

  // ถ้า Response เกิด Error
  async (error) => {
    const originalRequest = error.config

    // 1. ตรวจสอบว่าเป็น Error 401 และยังไม่ได้ลอง refresh มาก่อน
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true // ตั้งธงว่ากำลังจะลอง refresh

      const authTokens = localStorage.getItem('authTokens')
        ? JSON.parse(localStorage.getItem('authTokens'))
        : null

      if (authTokens?.refresh) {
        try {
          console.log('Access token expired. Attempting to refresh...')
          // 2. ส่ง refresh token ไปขอ access token ใบใหม่
          const response = await axios.post(
            'http://localhost:8000/api/token/refresh/',
            {
              refresh: authTokens.refresh,
            }
          )

          // 3. อัปเดต token ใน localStorage
          localStorage.setItem('authTokens', JSON.stringify(response.data))

          // 4. อัปเดต Authorization header ใน request เดิมที่เคยล้มเหลว
          originalRequest.headers[
            'Authorization'
          ] = `Bearer ${response.data.access}`

          console.log(
            'Token refreshed successfully. Retrying original request...'
          )
          // 5. ส่ง request เดิมซ้ำอีกครั้งด้วย token ใหม่
          return apiClient(originalRequest)
        } catch (refreshError) {
          // ถ้าการ refresh ล้มเหลว (เช่น refresh token หมดอายุ)
          console.error('Token refresh failed:', refreshError)
          localStorage.removeItem('authTokens')
          window.location.href = '/login' // บังคับ Logout
          return Promise.reject(refreshError)
        }
      }
    }

    // สำหรับ Error อื่นๆ หรือถ้า refresh ล้มเหลว ก็ให้ส่ง Error ต่อไป
    return Promise.reject(error)
  }
)

export default apiClient
