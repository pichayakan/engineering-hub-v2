import React, { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import {
  FiUploadCloud,
  FiEdit,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiFileText,
} from "react-icons/fi";
import "./AnnualEquipmentPage.css";

const AnnualEquipmentPage = () => {
  const { user } = useAuth();
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  // สำหรับระบบ Pagination และ Search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // สำหรับ Modal แก้ไขสถานะ
  const [editingItem, setEditingItem] = useState(null);
  const [editStatus, setEditStatus] = useState("NORMAL");
  const [editRemark, setEditRemark] = useState("");

  const [editResponsibleUnit, setEditResponsibleUnit] = useState("");

  const [editImage, setEditImage] = useState(null);
  const [editDoc, setEditDoc] = useState(null);

  // progress bar
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processing, setProcessing] = useState(false);

  // status filter
  const [selectedStatus, setSelectedStatus] = useState("");

  const [costCenterSummary, setCostCenterSummary] = useState([]);

  // เช็คสิทธิ์
  const isAdminOrHQ =
    user?.is_staff ||
    user?.department_name === "ส่วนวิศวกรรมและบริหารโครงข่าย (วขตป.)";

  const fetchEquipments = async (page = 1, search = "", statusFilter = "") => {
    setLoading(true);
    try {
      let url = `/api/assets/annual-equipments/?page=${page}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      if (statusFilter) {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }
      const res = await api.get(url);

      setEquipments(res.data.results || res.data);
      setTotalCount(res.data.count || res.data.length);
      setTotalPages(Math.ceil((res.data.count || res.data.length) / 50));
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching equipments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments(1, searchQuery);
    fetchSummary(); // ✅ เพิ่มบรรทัดนี้เพื่อให้โหลดข้อมูล Dashboard ตอนเปิดหน้าเว็บ
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEquipments(1, searchQuery, selectedStatus);
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setSelectedStatus(val);
    fetchEquipments(1, searchQuery, val); // กรองทันทีเมื่อเลือกสถานะ
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("กรุณาเลือกไฟล์ CSV ก่อนครับ");
    setUploading(true);
    setUploadProgress(0);
    setProcessing(false); // เริ่มต้นยังไม่ถึงขั้นตอนประมวลผลฐานข้อมูล

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fiscal_year", "2026");

    try {
      const res = await api.post(
        "/api/assets/annual-equipments/import_csv/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percentCompleted);

            // ถ้าอัปโหลดถึง 100% แล้ว ให้เปลี่ยนสถานะเป็นกำลังประมวลผลต่อทันที
            if (percentCompleted === 100) {
              setProcessing(true);
            }
          },
        },
      );
      alert(res.data.message);
      setFile(null);
      fetchEquipments(1, searchQuery);
    } catch (error) {
      alert(
        "เกิดข้อผิดพลาด: " + (error.response?.data?.error || error.message),
      );
    } finally {
      setUploading(false);
      setProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleSaveEdit = async () => {
    const formData = new FormData();
    formData.append("current_status", editStatus);
    formData.append("remark", editRemark);
    formData.append("responsible_unit", editResponsibleUnit || "");

    if (editImage) {
      formData.append("image_current", editImage);
    }
    if (editDoc) {
      formData.append("document_file", editDoc);
    }

    try {
      // ใช้ PATCH ส่ง FormData ไปยังรายการครุภัณฑ์นั้นๆ
      await api.patch(
        `/api/assets/annual-equipments/${editingItem.id}/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      alert("บันทึกข้อมูลและแนบไฟล์สำเร็จ");
      setEditingItem(null);
      setEditImage(null);
      setEditDoc(null);
      fetchEquipments(currentPage, searchQuery, selectedStatus);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกไฟล์");
    }
  };

  const handleDeleteAll = async () => {
    const confirmText = prompt(
      "⚠️ คำเตือน: การกระทำนี้จะลบข้อมูลครุภัณฑ์ทั้งหมดในระบบ! หากต้องการยืนยัน โปรดพิมพ์คำว่า 'DELETE' ลงในช่องนี้:",
    );
    if (confirmText !== "DELETE") {
      return alert("ยกเลิกการลบข้อมูลครับ");
    }

    try {
      setLoading(true);
      const res = await api.delete(
        "/api/assets/annual-equipments/delete_all_data/",
      );
      alert(res.data.message);
      fetchEquipments(1, ""); // โหลดข้อมูลใหม่ (ตารางจะว่างเปล่า)
    } catch (error) {
      alert(
        "เกิดข้อผิดพลาดในการลบ: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get(
        "/api/assets/annual-equipments/cost_center_summary/",
      );
      setCostCenterSummary(res.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  return (
    <div className="annual-equipment-container">
      <h2 className="page-title">📋 ระบบสำรวจครุภัณฑ์ประจำปี (2026)</h2>

      {isAdminOrHQ && (
        <div className="upload-card">
          <h3>นำเข้าข้อมูลจากระบบ SAP (CSV File ขนาดใหญ่)</h3>
          <div className="upload-actions">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="file-input"
              disabled={uploading}
            />
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-upload"
            >
              <FiUploadCloud />
              {uploading && !processing
                ? `กำลังอัปโหลดไฟล์... (${uploadProgress}%)`
                : ""}
              {processing
                ? "กรุณารอสักครู่ กำลังบันทึกข้อมูลลงฐานข้อมูล..."
                : ""}
              {!uploading && !processing ? "อัปโหลดข้อมูล" : ""}
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={uploading}
              style={{
                backgroundColor: "#ff4d4f",
                color: "white",
                border: "none",
                padding: "8px 15px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🗑️ ลบข้อมูลทั้งหมดในระบบ
            </button>
          </div>

          {/* ✅ แสดงหลอด Progress Bar เล็กๆ ด้านล่าง */}
          {uploading && (
            <div
              className="progress-bar-container"
              style={{
                width: "100%",
                backgroundColor: "#e0e0df",
                borderRadius: "4px",
                marginTop: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "8px",
                  backgroundColor: "#4caf50",
                  transition: "width 0.2s ease-in-out",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* แถบค้นหาและฟิลเตอร์สถานะ */}
      <div
        className="filter-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "15px 0",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
        >
          <input
            type="text"
            placeholder="ค้นหารหัสสินทรัพย์ หรือรายละเอียด..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ padding: "8px", width: "250px" }}
          />

          {/* ✅ Dropdown เลือกสถานะ */}
          <select
            value={selectedStatus}
            onChange={handleStatusChange}
            className="form-control"
            style={{ padding: "8px", width: "180px" }}
          >
            <option value="">-- ทุกสถานะ --</option>
            <option value="NORMAL">ใช้งานได้ปกติ</option>
            <option value="BROKEN">ชำรุด/รอซ่อม</option>
            <option value="LOST">สูญหาย</option>
            <option value="TRANSFER">โอนย้าย</option>
            <option value="NOT_FOUND">หาไม่พบ/ไม่ทราบสถานะ</option>
          </select>

          <button
            type="submit"
            className="btn-secondary"
            style={{ padding: "8px 15px" }}
          >
            ค้นหา
          </button>
        </form>

        <div style={{ color: "#666", fontSize: "14px" }}>
          พบข้อมูลทั้งหมด:{" "}
          <strong>{Number(totalCount || 0).toLocaleString()}</strong> รายการ
        </div>
      </div>

      <div
        className="dashboard-summary"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          margin: "20px 0",
        }}
      >
        {costCenterSummary.map((item, index) => (
          <div
            key={index}
            style={{
              background: "#f8f9fa",
              padding: "15px",
              borderRadius: "8px",
              borderLeft: "4px solid #007bff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: "12px", color: "#666" }}>
              ศ.ต้นทุน: {item.cost_center || "ไม่ระบุ"}
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#333",
                marginTop: "5px",
              }}
            >
              {Number(item.total_items).toLocaleString()}{" "}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "normal",
                  color: "#666",
                }}
              >
                รายการ
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="table-container" style={{ overflowX: "auto" }}>
        <table
          className="equipment-table"
          style={{
            width: "100%",
            fontSize: "13px", // ลดขนาดตัวอักษรลงเล็กน้อยเพื่อให้แสดงผลได้เยอะขึ้น
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>คลาส</th>
              <th>รหัสสินทรัพย์</th>
              <th style={{ minWidth: "200px" }}>คำอธิบายของสินทรัพย์</th>
              <th>Cap.date</th>
              <th>ศ.ต้นทุน</th>
              <th className="text-right">ราคาทุน APC</th>
              <th className="text-right">มูลค่าตามบัญชี</th>
              <th>สถานะ</th>
              <th>หมายเหตุ</th>
              <th style={{ whiteSpace: "nowrap" }}>อัปเดตล่าสุด</th>{" "}
              {/* ✅ เพิ่มหัวข้อคอลัมน์ใหม่ */}
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" className="text-center p-4">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : equipments.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center p-4">
                  ไม่มีรายการครุภัณฑ์ให้สำรวจ
                </td>
              </tr>
            ) : (
              equipments.map((item) => (
                <tr key={item.id}>
                  <td>{item.asset_class || "-"}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{item.asset_number}</span>
                      {item.image_current && (
                        <span
                          title="มีรูปภาพแนบ"
                          style={{ color: "#28a745", display: "flex" }}
                        >
                          <FiImage size={14} />
                        </span>
                      )}
                      {item.document_file && (
                        <span
                          title="มีเอกสารแนบ"
                          style={{ color: "#007bff", display: "flex" }}
                        >
                          <FiFileText size={14} />
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      maxWidth: "250px",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.description}
                  </td>
                  <td>{item.cap_date || "-"}</td>
                  <td>{item.cost_center}</td>
                  <td className="text-right">
                    {Number(item.apc_value || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="text-right">
                    {Number(item.book_value || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${item.current_status === "NORMAL" ? "status-normal" : "status-danger"}`}
                      style={{ fontSize: "11px", padding: "2px 6px" }}
                    >
                      {item.current_status}
                    </span>
                  </td>
                  <td
                    style={{
                      maxWidth: "150px",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {item.remark || "-"}
                  </td>

                  {/* ✅ เพิ่มคอลัมน์แสดงวันเวลาอัปเดตล่าสุดตรงนี้ */}
                  <td
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.updated_at
                      ? new Date(item.updated_at).toLocaleString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>

                  <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setEditStatus(item.current_status);
                        setEditRemark(item.remark || "");
                        setEditResponsibleUnit(item.responsible_unit || "");
                      }}
                      className="btn-edit"
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                      <FiEdit /> อัปเดต
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* แถบเปลี่ยนหน้า (Pagination Controls) */}
      <div
        className="pagination-bar"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "15px",
          margin: "20px 0",
        }}
      >
        <button
          onClick={() => fetchEquipments(currentPage - 1, searchQuery)}
          disabled={currentPage <= 1 || loading}
          className="btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "5px" }}
        >
          <FiChevronLeft /> ก่อนหน้า
        </button>
        <span>
          หน้าที่ <strong>{currentPage}</strong> จาก {totalPages || 1}
        </span>
        <button
          onClick={() => fetchEquipments(currentPage + 1, searchQuery)}
          disabled={currentPage >= totalPages || loading}
          className="btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "5px" }}
        >
          ถัดไป <FiChevronRight />
        </button>
      </div>

      {editingItem && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <h3 className="modal-title">
              อัปเดตสถานะ: {editingItem.asset_number}
            </h3>
            <p className="modal-subtitle">{editingItem.description}</p>

            <div className="form-group" style={{ marginBottom: "15px" }}>
              <label>หน่วยงาน / ส่วนที่รับผิดชอบ</label>
              <input
                type="text"
                value={editResponsibleUnit}
                onChange={(e) => setEditResponsibleUnit(e.target.value)}
                className="form-control"
                placeholder="ระบุชื่อหน่วยงานหรือส่วนงานที่ดูแล..."
              />
            </div>

            {editingItem.updated_at && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#495057",
                  background: "#f8f9fa",
                  padding: "10px",
                  borderRadius: "6px",
                  margin: "10px 0",
                  borderLeft: "4px solid #17a2b8",
                }}
              >
                <div>
                  🕒 <strong>แก้ไขล่าสุดโดย:</strong>{" "}
                  {editingItem.last_updated_by_name || "ระบบ / ไม่ระบุ"}
                </div>
                <div style={{ marginTop: "3px" }}>
                  📅 <strong>เมื่อวันที่:</strong>{" "}
                  {new Date(editingItem.updated_at).toLocaleString("th-TH")}
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: "15px" }}>
              <label>สถานะปัจจุบัน</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="form-control"
              >
                <option value="NORMAL">ใช้งานได้ปกติ</option>
                <option value="BROKEN">ชำรุด/รอซ่อม</option>
                <option value="LOST">สูญหาย</option>
                <option value="TRANSFER">โอนย้าย</option>
                <option value="NOT_FOUND">หาไม่พบ/ไม่ทราบสถานะ</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: "15px" }}>
              <label>หมายเหตุ (ถ้ามี)</label>
              <textarea
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
                className="form-control"
                placeholder="ระบุสาเหตุที่ชำรุด หรือข้อมูลเพิ่มเติม..."
                rows="3"
              ></textarea>
            </div>

            {/* ========================================== */}
            {/* 📌 ส่วนแสดงผลรูปภาพเดิม (ถ้ามี) */}
            {/* ========================================== */}
            <div className="form-group" style={{ marginBottom: "15px" }}>
              <label>รูปภาพปัจจุบันของสินทรัพย์</label>
              {editingItem.image_current ? (
                <div style={{ margin: "5px 0" }}>
                  <a
                    href={editingItem.image_current}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={editingItem.image_current}
                      alt="Equipment"
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </a>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    คลิกที่รูปเพื่อดูภาพขนาดเต็ม
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#999",
                    fontStyle: "italic",
                  }}
                >
                  ยังไม่มีรูปภาพแนบ
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditImage(e.target.files[0])}
                className="form-control"
                style={{ marginTop: "8px" }}
              />
            </div>

            {/* ========================================== */}
            {/* 📌 ส่วนแสดงผลเอกสาร PDF เดิม (ถ้ามี) */}
            {/* ========================================== */}
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>เอกสารแนบ (PDF / รายงาน)</label>
              {editingItem.document_file ? (
                <div style={{ margin: "5px 0" }}>
                  <a
                    href={editingItem.document_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#007bff",
                      textDecoration: "underline",
                      fontSize: "14px",
                    }}
                  >
                    📄 เปิดดูเอกสารแนบเดิม
                  </a>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#999",
                    fontStyle: "italic",
                  }}
                >
                  ยังไม่มีเอกสารแนบ
                </div>
              )}

              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setEditDoc(e.target.files[0])}
                className="form-control"
                style={{ marginTop: "8px" }}
              />
            </div>

            <div
              className="modal-actions"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditImage(null);
                  setEditDoc(null);
                }}
                className="btn-secondary"
              >
                ยกเลิก
              </button>
              <button onClick={handleSaveEdit} className="btn-upload">
                <FiCheck /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualEquipmentPage;
