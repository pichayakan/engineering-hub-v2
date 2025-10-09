import axios from "axios";

// สร้าง apiClient instance พื้นฐาน
const apiClient = axios.create({
  baseURL: "http://202.139.196.7:8000",
  //baseURL: "http://localhost:8000",
});

apiClient.interceptors.request.use(
  (config) => {
    // --- ✅ THIS IS THE FIX ---
    // Try to get tokens from localStorage first, then fall back to sessionStorage
    const authTokens = localStorage.getItem("authTokens")
      ? JSON.parse(localStorage.getItem("authTokens"))
      : JSON.parse(sessionStorage.getItem("authTokens"));

    if (authTokens) {
      config.headers["Authorization"] = `Bearer ${authTokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check which storage the tokens are in
      const storage = localStorage.getItem("authTokens")
        ? localStorage
        : sessionStorage;
      const authTokens = JSON.parse(storage.getItem("authTokens"));

      if (authTokens?.refresh) {
        try {
          const response = await axios.post(
            //"http://localhost:8000/api/token/refresh/",
            "http://202.139.196.7:8000/api/token/refresh/",
            {
              refresh: authTokens.refresh,
            }
          );

          storage.setItem("authTokens", JSON.stringify(response.data));

          originalRequest.headers[
            "Authorization"
          ] = `Bearer ${response.data.access}`;

          return apiClient(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          localStorage.removeItem("authTokens");
          localStorage.removeItem("user");
          sessionStorage.removeItem("authTokens");
          sessionStorage.removeItem("user");
          window.dispatchEvent(
            new CustomEvent("sessionExpired", {
              detail: { originalPath: window.location.pathname },
            })
          );
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem("authTokens");
        localStorage.removeItem("user");
        sessionStorage.removeItem("authTokens");
        sessionStorage.removeItem("user");
        window.dispatchEvent(
          new CustomEvent("sessionExpired", {
            detail: { originalPath: window.location.pathname },
          })
        );
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
