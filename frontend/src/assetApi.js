// frontend/src/api/assetApi.js

// 👇 1. Import apiClient ตัวเดิมของคุณเข้ามา
import apiClient from "./api";

const BASE_URL = "/api/assets";

export const assetApi = {
  // ดึงรอบการสำรวจ
  getCampaigns: () => apiClient.get(`${BASE_URL}/campaigns/`),

  // ดึงรายการสินทรัพย์
  getAssets: (params) => apiClient.get(`${BASE_URL}/requests/`, { params }),

  // สร้างรายการใหม่ (Upload รูปต้องใช้ FormData)
  createAsset: (data) => {
    return apiClient.post(`${BASE_URL}/requests/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // แก้ไขรายการ
  updateAsset: (id, data) => {
    return apiClient.patch(`${BASE_URL}/requests/${id}/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  submitAsset: (id) => apiClient.post(`${BASE_URL}/requests/${id}/submit/`),
  // ลบรายการ
  deleteAsset: (id) => apiClient.delete(`${BASE_URL}/requests/${id}/`),

  // ✅ 1. ดึงข้อมูล Stats สำหรับ Dashboard
  getCampaignStats: (campaignId) =>
    apiClient.get(`${BASE_URL}/campaigns/${campaignId}/stats/`),

  // ✅ 2. Export Excel (ต้องทำเป็น Blob เพื่อให้ Browser ดาวน์โหลดไฟล์ได้)
  exportAssets: (campaignId) =>
    apiClient.get(`${BASE_URL}/campaigns/${campaignId}/export/`, {
      responseType: "blob", // สำคัญมาก! บอก axios ว่าสิ่งที่ได้กลับมาคือไฟล์
    }),
  approveAsset: (id) => apiClient.post(`${BASE_URL}/requests/${id}/approve/`),
  rejectAsset: (id) => apiClient.post(`${BASE_URL}/requests/${id}/reject/`),

  getAllDepartments: () => apiClient.get("/api/auth/departments/"),
};
