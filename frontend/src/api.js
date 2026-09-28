// frontend/src/api.js
import axios from "axios";

// ==========================================
// 1. ✅ กำหนดค่า Config กลาง (Single Source of Truth)
// ==========================================
export const SERVER_URL = import.meta.env.DEV ? "http://localhost:8000" : "";
export const API_URL = import.meta.env.DEV
  ? "http://localhost:8000/api"
  : "/api";

// Helper: ฟังก์ชันดึง Token
const getStoredTokens = () => {
  const local = localStorage.getItem("authTokens");
  const session = sessionStorage.getItem("authTokens");
  return local ? JSON.parse(local) : session ? JSON.parse(session) : null;
};

// Helper: ฟังก์ชันเก็บ Token
const setStoredTokens = (tokens) => {
  const storage = localStorage.getItem("authTokens")
    ? localStorage
    : sessionStorage;
  storage.setItem("authTokens", JSON.stringify(tokens));
};

// Helper: ฟังก์ชันลบ Token (Logout)
const clearTokens = () => {
  localStorage.removeItem("authTokens");
  localStorage.removeItem("user");
  sessionStorage.removeItem("authTokens");
  sessionStorage.removeItem("user");
};

// ==========================================
// 2. สร้าง Axios Instance
// ==========================================
const apiClient = axios.create({
  // 🟢 ตั้ง baseURL เป็น SERVER_URL ("http://localhost:8000" บน Dev หรือ "" บน Production)
  // วิธีนี้จะทำให้ยิงได้ทั้ง /api/xxx และ /auth/xxx โดยไม่เกิด /api/api/ ซ้ำซ้อน
  baseURL: SERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================================
// 3. Request Interceptor (แนบ Token)
// ==========================================
apiClient.interceptors.request.use(
  (config) => {
    const authTokens = getStoredTokens();

    if (authTokens?.access) {
      config.headers["Authorization"] = `Bearer ${authTokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ==========================================
// 4. Response Interceptor (Refresh Token)
// ==========================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const authTokens = getStoredTokens();

      if (authTokens?.refresh) {
        try {
          // 🟢 สั่ง Refresh Token ยิงไปที่ /api/token/refresh/ เสมอ
          const refreshEndpoint = import.meta.env.DEV
            ? "http://localhost:8000/api/token/refresh/"
            : "/api/token/refresh/";

          const response = await axios.post(refreshEndpoint, {
            refresh: authTokens.refresh,
          });

          setStoredTokens(response.data);

          originalRequest.headers["Authorization"] =
            `Bearer ${response.data.access}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          clearTokens();
          window.dispatchEvent(
            new CustomEvent("sessionExpired", {
              detail: { originalPath: window.location.pathname },
            }),
          );
          return Promise.reject(refreshError);
        }
      } else {
        clearTokens();
        window.dispatchEvent(
          new CustomEvent("sessionExpired", {
            detail: { originalPath: window.location.pathname },
          }),
        );
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
