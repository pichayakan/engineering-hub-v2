import axios from "axios";

// ==========================================
// 1. ✅ กำหนดค่า Config กลางที่นี่จุดเดียว (Single Source of Truth)
// ==========================================
// เปลี่ยน IP ตรงนี้ที่เดียว มีผลทั้ง Project (ทั้ง API และ รูปภาพ)
export const SERVER_URL = "http://202.139.196.7:8000";
//export const SERVER_URL = "http://172.22.16.28:8000";
export const API_URL = `${SERVER_URL}/api`;

// Helper: ฟังก์ชันดึง Token (ลด code ซ้ำซ้อน)
const getStoredTokens = () => {
  const local = localStorage.getItem("authTokens");
  const session = sessionStorage.getItem("authTokens");
  return local ? JSON.parse(local) : session ? JSON.parse(session) : null;
};

// Helper: ฟังก์ชันเก็บ Token (ลด code ซ้ำซ้อน)
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
  baseURL: SERVER_URL, // ใช้ตัวแปรที่ประกาศด้านบน
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================================
// 3. Request Interceptor (แนบ Token)
// ==========================================
apiClient.interceptors.request.use(
  (config) => {
    const authTokens = getStoredTokens(); // เรียกใช้ Helper

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

    // ถ้าเจอ 401 (Unauthorized) และยังไม่เคยลอง Retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const authTokens = getStoredTokens();

      // ถ้ามี Refresh Token ให้ลองขอ Access Token ใหม่
      if (authTokens?.refresh) {
        try {
          // ✅ ใช้ API_URL ตัวแปรกลาง แทนการ Hardcode URL
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: authTokens.refresh,
          });

          // บันทึก Token ใหม่ลง Storage เดิม
          setStoredTokens(response.data);

          // แนบ Token ใหม่แล้วยิง Request เดิมซ้ำ
          originalRequest.headers["Authorization"] =
            `Bearer ${response.data.access}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // ถ้า Refresh ไม่ผ่าน ให้เคลียร์ข้อมูลแล้วเด้งออก
          clearTokens();
          window.dispatchEvent(
            new CustomEvent("sessionExpired", {
              detail: { originalPath: window.location.pathname },
            }),
          );
          return Promise.reject(refreshError);
        }
      } else {
        // ถ้าไม่มี Refresh Token
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
