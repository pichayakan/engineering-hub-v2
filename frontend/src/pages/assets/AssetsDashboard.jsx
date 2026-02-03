// frontend/src/pages/assets/AssetsDashboard.jsx

import React, { useState, useEffect } from "react";
import { assetApi } from "../../assetApi";
import { useAuth } from "../../context/AuthContext";
import {
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiEdit,
  FiEye,
  FiDownload,
  FiFilter,
  FiXCircle,
} from "react-icons/fi";
import "./AssetsDashboard.css";
import AssetFormModal from "./AssetFormModal";
import { SERVER_URL } from "../../api";

const AssetsDashboard = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // State สำหรับ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [viewOnly, setViewOnly] = useState(false); // ✅ State ใหม่: โหมดดูอย่างเดียว

  const [filterCategory, setFilterCategory] = useState("ALL");

  // ... (useEffect และ functions อื่นๆ เหมือนเดิม) ...

  // ✅ 2. สร้างตัวแปรสำหรับข้อมูลที่กรองแล้ว
  const filteredAssets = assets.filter((item) => {
    if (filterCategory === "ALL") return true;
    return item.category === filterCategory;
  });

  // ✅ 3. ฟังก์ชันคลิกเลือก Filter
  const handleFilterClick = (category) => {
    if (filterCategory === category) {
      setFilterCategory("ALL"); // ถ้ากดซ้ำให้ยกเลิก Filter (แสดงทั้งหมด)
    } else {
      setFilterCategory(category); // กรองตามประเภทที่เลือก
    }
  };

  // Stats State
  const [stats, setStats] = useState({
    AIR: 0,
    BATTERY: 0,
    UPS: 0,
    RECTIFIER: 0,
    OTHER: 0,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const campRes = await assetApi.getCampaigns();
      setCampaigns(campRes.data);

      if (campRes.data.length > 0) {
        setSelectedCampaign(campRes.data[0].id);
        fetchAssets(campRes.data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      setLoading(false);
    }
  };

  const fetchAssets = async (campaignId) => {
    if (!campaignId) return;
    try {
      setLoading(true);
      const res = await assetApi.getAssets({ campaign: campaignId });
      setAssets(res.data);
      calculateStats(res.data);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const newStats = { AIR: 0, BATTERY: 0, UPS: 0, RECTIFIER: 0, OTHER: 0 };
    data.forEach((item) => {
      if (newStats.hasOwnProperty(item.category)) {
        newStats[item.category]++;
      } else {
        newStats.OTHER++;
      }
    });
    setStats(newStats);
  };

  const handleCampaignChange = (e) => {
    const campaignId = e.target.value;
    setSelectedCampaign(campaignId);
    fetchAssets(campaignId);
  };

  const handleSuccess = () => {
    if (selectedCampaign) {
      fetchAssets(selectedCampaign);
    }
  };

  // ✅ ฟังก์ชันเปิด Modal พร้อมกำหนดโหมด
  const handleOpenModal = (asset = null, isView = false) => {
    setEditingAsset(asset);
    setViewOnly(isView); // Set view mode
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setViewOnly(false); // Reset view mode
  };

  const handleSubmit = async (id) => {
    if (
      !window.confirm(
        "ยืนยันการส่งข้อมูล? \nเมื่อส่งแล้วสถานะจะเปลี่ยนเป็น 'Submitted' และจะไม่สามารถแก้ไขข้อมูลได้",
      )
    )
      return;
    try {
      await assetApi.submitAsset(id);
      fetchAssets(selectedCampaign);
    } catch (error) {
      console.error("Submit Error:", error);
      alert(
        "เกิดข้อผิดพลาด: " +
          (error.response?.data?.detail || "ส่งข้อมูลไม่สำเร็จ"),
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ต้องการลบรายการนี้ใช่หรือไม่?")) return;
    try {
      await assetApi.deleteAsset(id);
      fetchAssets(selectedCampaign);
    } catch (error) {
      console.error("Delete Error:", error);
      alert("ลบไม่สำเร็จ");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return <span className="status-badge status-approved">Approved</span>;
      case "REJECTED":
        return <span className="status-badge status-rejected">Rejected</span>;
      case "SUBMITTED":
        return <span className="status-badge status-submitted">Submitted</span>;
      default:
        return <span className="status-badge status-draft">Draft</span>;
    }
  };

  // ✅ แสดงรายละเอียดเฉพาะ (BTU / Amp) ในตาราง
  const renderSpecifics = (item) => {
    // สร้าง Badge: NEW หรือ REPLACE
    const reqBadge =
      item.request_type === "NEW" ? (
        <span className="req-badge new">✨ NEW</span>
      ) : (
        <span className="req-badge replace">🔄 REPLACE</span>
      );

    let categoryColor = "#333";
    let content = null;

    switch (item.category) {
      case "AIR":
        categoryColor = "#0d6efd"; // ฟ้า
        content = (
          <>
            {item.air_type && <div>{item.air_type}</div>}
            {item.air_btu && (
              <div>{parseInt(item.air_btu).toLocaleString()} BTU</div>
            )}
          </>
        );
        break;
      case "BATTERY":
        categoryColor = "#198754"; // เขียว
        content = item.battery_amp ? (
          <div>{item.battery_amp} Ah</div>
        ) : (
          <div>-</div>
        );
        break;
      case "UPS":
        categoryColor = "#6f42c1"; // ม่วง
        content = item.ups_kva ? <div>{item.ups_kva} kVA</div> : <div>-</div>;
        break;
      case "RECTIFIER":
        categoryColor = "#fd7e14"; // ส้ม
        content = item.rectifier_amp ? (
          <div>{item.rectifier_amp} A</div>
        ) : (
          <div>-</div>
        );
        break;
      default:
        content = <div>-</div>;
    }

    return (
      <div className="spec-container">
        <div className="spec-title" style={{ color: categoryColor }}>
          {reqBadge} {item.category}
        </div>
        <div className="spec-detail">{content}</div>
      </div>
    );
  };

  const handleExport = async () => {
    if (!selectedCampaign) return;
    try {
      const res = await assetApi.exportAssets(selectedCampaign);

      // สร้าง Blob และลิงก์ดาวน์โหลด
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `my_assets_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed:", error);
      alert("ไม่สามารถดาวน์โหลดไฟล์ได้");
    }
  };

  const renderImageCell = (item) => {
    const getImageUrl = (path) => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      return `${SERVER_URL}${path}`;
    };

    const img1Url = getImageUrl(item.image_1);
    const img2Url = getImageUrl(item.image_2);

    return (
      <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
        {img1Url ? (
          <a
            href={img1Url}
            target="_blank"
            rel="noreferrer"
            title="คลิกเพื่อดูรูปใหญ่"
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                backgroundImage: `url(${img1Url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "6px",
                border: "1px solid #dee2e6",
                cursor: "pointer",
                transition: "transform 0.1s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "scale(1.1)")
              }
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </a>
        ) : (
          <span style={{ fontSize: "0.8em", color: "#ccc" }}>-</span>
        )}

        {img2Url && (
          <a href={img2Url} target="_blank" rel="noreferrer">
            <div
              style={{
                width: "50px",
                height: "50px",
                backgroundImage: `url(${img2Url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "6px",
                border: "1px solid #dee2e6",
                cursor: "pointer",
              }}
            />
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="assets-dashboard-container">
      {/* Header */}
      <div className="assets-header">
        <div>
          <h1>สำรวจครุภัณฑ์สายงานกำลัง</h1>
          <p className="subtitle">
            หน่วยงาน: {user?.department_name || "ไม่ระบุ"} | ผู้ใช้งาน:{" "}
            {user?.username}
          </p>
        </div>
        <div className="assets-actions">
          {campaigns.length > 0 ? (
            <select
              className="campaign-select"
              value={selectedCampaign || ""}
              onChange={handleCampaignChange}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="no-campaign-alert">⚠️ ไม่มีรอบสำรวจ</span>
          )}

          <button
            className="btn-add-asset"
            style={{ backgroundColor: "#198754", marginRight: "10px" }} // สีเขียวให้ต่างจากปุ่มเพิ่ม
            onClick={handleExport}
            disabled={!selectedCampaign}
          >
            <FiDownload /> Export CSV
          </button>

          <button
            className="btn-add-asset"
            onClick={() => handleOpenModal(null, false)} // สร้างใหม่ (แก้ไขได้)
            disabled={!selectedCampaign}
          >
            <FiPlus /> เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div
          className={`stat-card blue ${filterCategory === "AIR" ? "active-filter" : ""}`}
          onClick={() => handleFilterClick("AIR")}
          style={{
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <h3>แอร์ (Air)</h3>
          <div className="stat-value">{stats.AIR}</div>
          {filterCategory === "AIR" && (
            <div className="filter-indicator">Viewing</div>
          )}
        </div>

        <div
          className={`stat-card green ${filterCategory === "BATTERY" ? "active-filter" : ""}`}
          onClick={() => handleFilterClick("BATTERY")}
          style={{
            cursor: "pointer",
            transition: "all 0.2s",
            border:
              filterCategory === "BATTERY"
                ? "2px solid #198754"
                : "1px solid transparent",
          }}
        >
          <h3>แบตเตอรี่ (Batt)</h3>
          <div className="stat-value">{stats.BATTERY}</div>
          {filterCategory === "BATTERY" && (
            <div className="filter-indicator">Viewing</div>
          )}
        </div>

        <div
          className={`stat-card orange ${filterCategory === "RECTIFIER" ? "active-filter" : ""}`}
          onClick={() => handleFilterClick("RECTIFIER")}
          style={{
            cursor: "pointer",
            transition: "all 0.2s",
            border:
              filterCategory === "RECTIFIER"
                ? "2px solid #fd7e14"
                : "1px solid transparent",
          }}
        >
          <h3>Rectifier</h3>
          <div className="stat-value">{stats.RECTIFIER}</div>
          {filterCategory === "RECTIFIER" && (
            <div className="filter-indicator">Viewing</div>
          )}
        </div>

        <div
          className={`stat-card purple ${filterCategory === "UPS" ? "active-filter" : ""}`}
          onClick={() => handleFilterClick("UPS")}
          style={{
            cursor: "pointer",
            transition: "all 0.2s",
            border:
              filterCategory === "UPS"
                ? "2px solid #6f42c1"
                : "1px solid transparent",
          }}
        >
          <h3>UPS</h3>
          <div className="stat-value">{stats.UPS}</div>
          {filterCategory === "UPS" && (
            <div className="filter-indicator">Viewing</div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="assets-table-card">
        <div className="table-header-row">
          {/* ✅ 5. แสดงหัวข้อว่ากำลังดูอะไรอยู่ และปุ่มเคลียร์ */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2>
              รายการที่บันทึก ({filteredAssets.length})
              {filterCategory !== "ALL" && (
                <span
                  style={{
                    fontSize: "0.6em",
                    marginLeft: "10px",
                    color: "#666",
                    fontWeight: "normal",
                  }}
                >
                  Filter: {filterCategory}
                </span>
              )}
            </h2>

            {filterCategory !== "ALL" && (
              <button
                onClick={() => setFilterCategory("ALL")}
                style={{
                  background: "#f8d7da",
                  color: "#842029",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <FiXCircle /> ล้างตัวกรอง
              </button>
            )}
          </div>

          <button
            className="btn-refresh"
            onClick={() => fetchAssets(selectedCampaign)}
          >
            <FiRefreshCw />
          </button>
        </div>

        {loading ? (
          <div className="loading-state">กำลังโหลดข้อมูล...</div>
        ) : filteredAssets.length === 0 ? (
          // ✅ 6. ปรับ Empty State กรณี Filter แล้วไม่เจอ
          <div className="empty-state">
            {filterCategory !== "ALL"
              ? `ไม่พบรายการประเภท ${filterCategory}`
              : "ยังไม่มีข้อมูลในรอบสำรวจนี้"}
          </div>
        ) : (
          <div className="table-responsive">
            {" "}
            {/* ✅ Class นี้จะจัดการ Scroll */}
            <table className="data-table">
              <thead>
                <tr>
                  {/* ✅ เพิ่มคอลัมน์ให้ครบ */}
                  <th style={{ width: "60px" }}>จัดการ</th>{" "}
                  {/* ย้ายมาซ้ายสุดเพื่อให้กดง่าย (Optional) หรือไว้ขวาสุดก็ได้ */}
                  <th>สถานะ</th>
                  <th>ประเภทคำขอ</th>
                  <th>รูปภาพ</th>
                  <th>หมวดหมู่</th>
                  <th>สเปค / ขนาด</th>
                  <th>ชื่อสถานที่</th>
                  <th>ประเภทสถานที่</th>
                  <th>ยี่ห้อ/รุ่น</th>
                  <th>เลขสินทรัพย์</th>
                  <th>ปีติดตั้ง</th>
                  <th>อายุ (ปี)</th>
                  <th>สภาพ</th>
                  <th>ผลกระทบ (ราย)</th>
                  <th>จังหวัด/แผนก</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((item) => (
                  <tr key={item.id}>
                    {/* 1. ปุ่มจัดการ (Action) */}
                    <td
                      style={{
                        textAlign: "center",
                        position: "sticky",
                        left: 0,
                        background: "#fff",
                        zIndex: 2,
                        borderRight: "1px solid #eee",
                      }}
                    >
                      {item.status === "DRAFT" ? (
                        <div className="action-buttons" style={{ gap: "5px" }}>
                          <button
                            className="btn-icon-action edit"
                            onClick={() => handleOpenModal(item, false)}
                            title="แก้ไข"
                          >
                            <FiEdit size={14} />
                          </button>
                          <button
                            className="btn-icon-action delete"
                            onClick={() => handleDelete(item.id)}
                            title="ลบ"
                          >
                            <FiTrash2 size={14} />
                          </button>
                          <button
                            className="btn-icon-action submit"
                            onClick={() => handleSubmit(item.id)}
                            title="ส่ง"
                          >
                            <FiSend size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-icon-action view"
                          style={{
                            backgroundColor: "#17a2b8",
                            color: "white",
                            padding: "4px 8px",
                          }}
                          onClick={() => handleOpenModal(item, true)}
                        >
                          <FiEye size={14} />
                        </button>
                      )}
                    </td>

                    {/* 2. สถานะ */}
                    <td>{getStatusBadge(item.status)}</td>

                    {/* 3. ประเภทคำขอ (NEW/REPLACE) */}
                    <td>
                      {item.request_type === "NEW" ? (
                        <span className="req-badge new">✨ ขอใหม่</span>
                      ) : (
                        <span className="req-badge replace">🔄 ทดแทน</span>
                      )}
                    </td>

                    {/* 4. รูปภาพ */}
                    <td>{renderImageCell(item)}</td>

                    {/* 5. หมวดหมู่ (AIR, BATT...) */}
                    <td>
                      <strong style={{ color: "#333" }}>{item.category}</strong>
                    </td>

                    {/* 6. สเปค (ดึงเฉพาะค่ามาโชว์) */}
                    <td>
                      {item.category === "AIR" && item.air_btu && (
                        <span>
                          {parseInt(item.air_btu).toLocaleString()} BTU{" "}
                          {item.air_type}
                        </span>
                      )}
                      {item.category === "BATTERY" && item.battery_amp && (
                        <span>{item.battery_amp} Ah</span>
                      )}
                      {item.category === "UPS" && item.ups_kva && (
                        <span>{item.ups_kva} kVA</span>
                      )}
                      {item.category === "RECTIFIER" && item.rectifier_amp && (
                        <span>{item.rectifier_amp} A</span>
                      )}
                      {!["AIR", "BATTERY", "UPS", "RECTIFIER"].includes(
                        item.category,
                      ) && <span>-</span>}
                    </td>

                    {/* 7. ชื่อสถานที่ */}
                    <td>
                      <div className="location-name">{item.location_name}</div>
                    </td>

                    {/* 8. ประเภทสถานที่ */}
                    <td>
                      <span style={{ color: "#666" }}>
                        {item.location_type}
                      </span>
                    </td>

                    {/* 9. ยี่ห้อ/รุ่น */}
                    <td>{item.brand_model || "-"}</td>

                    {/* 10. เลขสินทรัพย์ */}
                    <td>{item.asset_number || "-"}</td>

                    {/* 11. ปีติดตั้ง */}
                    <td>{item.install_year || "-"}</td>

                    {/* 12. อายุ */}
                    <td className={item.age > 10 ? "text-danger" : ""}>
                      {item.age > 0 ? `${item.age}` : "-"}
                    </td>

                    {/* 13. สภาพ */}
                    <td>{item.condition || "-"}</td>

                    {/* 14. ผลกระทบ */}
                    <td>
                      {item.customer_impact > 0 ? item.customer_impact : "-"}
                    </td>

                    {/* 15. แผนก */}
                    <td>{item.province || item.department_name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AssetFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        campaignId={selectedCampaign}
        initialData={editingAsset}
        isReadOnly={viewOnly}
      />
    </div>
  );
};

export default AssetsDashboard;
