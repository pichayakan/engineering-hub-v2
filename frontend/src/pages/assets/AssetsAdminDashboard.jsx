// frontend/src/pages/assets/AssetsAdminDashboard.jsx

import React, { useState, useEffect } from "react";
import { assetApi } from "../../assetApi";
import { SERVER_URL } from "../../api";

import {
  FiDownload,
  FiPieChart,
  FiBarChart2,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiEye,
  FiFilter, // ✅ เพิ่ม
  FiTrash2, // ✅ เพิ่ม (เผื่อใช้)
} from "react-icons/fi";
import "./AssetsDashboard.css"; // ใช้ CSS ร่วมกัน

const AssetsAdminDashboard = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Stats & Data
  const [stats, setStats] = useState(null);
  const [pendingAssets, setPendingAssets] = useState([]);
  const [allAssets, setAllAssets] = useState([]);

  // Filters
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");

  // ✅ เพิ่ม Filter ประเภทอุปกรณ์ (เหมือนหน้า User)
  const [filterCategory, setFilterCategory] = useState("ALL");

  const [loading, setLoading] = useState(false);

  // 1. Initial Load (Campaigns & Departments)
  useEffect(() => {
    fetchCampaigns();
    fetchDepartments();
  }, []);

  // 2. Fetch Data when Filters Change
  useEffect(() => {
    if (selectedCampaign) {
      fetchStats(selectedCampaign);
      fetchPendingAssets(selectedCampaign);
      fetchAllAssets(selectedCampaign);
    }
  }, [selectedCampaign, selectedDept]);

  // --- API Calls ---

  const fetchCampaigns = async () => {
    try {
      const res = await assetApi.getCampaigns();
      setCampaigns(res.data);
      if (res.data.length > 0) setSelectedCampaign(res.data[0].id);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await assetApi.getAllDepartments();
      if (res.data.results && Array.isArray(res.data.results)) {
        setDepartments(res.data.results);
      } else if (Array.isArray(res.data)) {
        setDepartments(res.data);
      } else {
        setDepartments([]);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchStats = async (id) => {
    setLoading(true);
    try {
      const res = await assetApi.getCampaignStats(id);
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAssets = async (campaignId) => {
    try {
      const params = {
        campaign: campaignId,
        status: "SUBMITTED",
      };
      if (selectedDept) params.department = selectedDept;

      const res = await assetApi.getAssets(params);
      setPendingAssets(res.data);
    } catch (error) {
      console.error("Error fetching pending assets:", error);
    }
  };

  const fetchAllAssets = async (campaignId) => {
    try {
      const params = {
        campaign: campaignId,
      };
      if (selectedDept) params.department = selectedDept;

      const res = await assetApi.getAssets(params);
      const data = res.data.results || res.data;

      if (Array.isArray(data)) {
        setAllAssets(data);
      } else {
        setAllAssets([]);
      }
    } catch (error) {
      console.error("Error fetching all assets:", error);
    }
  };

  // --- Actions ---

  const handleExport = async () => {
    if (!selectedCampaign) return;
    try {
      const res = await assetApi.exportAssets(selectedCampaign);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `assets_export_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed");
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("ยืนยันการอนุมัติ?")) return;
    try {
      await assetApi.approveAsset(id);
      fetchStats(selectedCampaign);
      fetchPendingAssets(selectedCampaign);
      fetchAllAssets(selectedCampaign); // Refresh All List too
    } catch (error) {
      alert("Error approving asset");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("ต้องการส่งกลับแก้ไขใช่หรือไม่?")) return;
    try {
      await assetApi.rejectAsset(id);
      fetchStats(selectedCampaign);
      fetchPendingAssets(selectedCampaign);
      fetchAllAssets(selectedCampaign);
    } catch (error) {
      alert("Error rejecting asset");
    }
  };

  // --- Helper Functions ---

  const getCount = (list, key, val) => {
    const found = list?.find((item) => item[key] === val);
    return found ? found.count : 0;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="status-badge status-approved">อนุมัติแล้ว</span>
        );
      case "REJECTED":
        return (
          <span className="status-badge status-rejected">ส่งกลับแก้ไข</span>
        );
      case "SUBMITTED":
        return <span className="status-badge status-submitted">รอตรวจสอบ</span>;
      default:
        return <span className="status-badge status-draft">แบบร่าง</span>;
    }
  };

  const calculateCurrentAge = (installYear) => {
    if (!installYear) return 0;
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(installYear);
    return age < 0 ? 0 : age;
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

  // ✅ ฟังก์ชันแสดงรายละเอียด (เหมือนหน้า User)
  const renderSpecifics = (item) => {
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
        categoryColor = "#0d6efd";
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
        categoryColor = "#198754";
        content = item.battery_amp ? (
          <div>{item.battery_amp} Ah</div>
        ) : (
          <div>-</div>
        );
        break;
      case "UPS":
        categoryColor = "#6f42c1";
        content = item.ups_kva ? <div>{item.ups_kva} kVA</div> : <div>-</div>;
        break;
      case "RECTIFIER":
        categoryColor = "#fd7e14";
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

  // ✅ Filter Logic
  const getFilteredAssets = (assetsList) => {
    if (filterCategory === "ALL") return assetsList;
    return assetsList.filter((item) => item.category === filterCategory);
  };

  if (!stats) return <div className="p-4">Loading Admin Dashboard...</div>;

  return (
    <div className="assets-dashboard-container">
      {/* Header */}
      <div className="assets-header">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FiPieChart /> ภาพรวมการสำรวจ (Admin)
          </h1>
          <p className="subtitle">
            ติดตามสถานะ ตรวจสอบข้อมูล และ Export Report
          </p>
        </div>
        <div className="assets-actions">
          <select
            className="campaign-select"
            value={selectedCampaign || ""}
            onChange={(e) => setSelectedCampaign(e.target.value)}
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filter แผนก */}
          <select
            className="campaign-select"
            style={{ marginLeft: "10px", minWidth: "150px" }}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">-- ทุกแผนก --</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          <button
            className="btn-add-asset"
            style={{ backgroundColor: "#198754" }}
            onClick={handleExport}
          >
            <FiDownload /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats Grid (Summary) */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <h3>📦 ทั้งหมด (Total)</h3>
          <div className="stat-value">
            {stats.status_summary.reduce((acc, curr) => acc + curr.count, 0)}
          </div>
        </div>
        <div className="stat-card orange">
          <h3>⏳ รอตรวจสอบ (Submitted)</h3>
          <div className="stat-value">
            {getCount(stats.status_summary, "status", "SUBMITTED")}
          </div>
        </div>
        <div className="stat-card green">
          <h3>✅ อนุมัติแล้ว (Approved)</h3>
          <div className="stat-value">
            {getCount(stats.status_summary, "status", "APPROVED")}
          </div>
        </div>
        <div className="stat-card purple">
          <h3>📝 แบบร่าง (Draft)</h3>
          <div className="stat-value">
            {getCount(stats.status_summary, "status", "DRAFT")}
          </div>
        </div>
      </div>

      {/* ✅ Filter Bar (เหมือนหน้า User) */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {["ALL", "AIR", "BATTERY", "RECTIFIER", "UPS"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: "6px 15px",
              borderRadius: "20px",
              border: "1px solid #ddd",
              background: filterCategory === cat ? "#0d6efd" : "#fff",
              color: filterCategory === cat ? "#fff" : "#666",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
          >
            {cat === "ALL" ? "ทั้งหมด" : cat}
          </button>
        ))}
      </div>

      {/* ✅ ตารางรอตรวจสอบ (Pending Review) - ปรับปรุงใหม่ */}
      <div
        className="assets-table-card"
        style={{ marginBottom: "20px", borderTop: "4px solid #fd7e14" }}
      >
        <h2
          className="mb-4 text-lg font-semibold flex items-center gap-2"
          style={{ color: "#fd7e14" }}
        >
          ⏳ รายการรอตรวจสอบ ({getFilteredAssets(pendingAssets).length})
        </h2>

        {getFilteredAssets(pendingAssets).length === 0 ? (
          <div className="empty-state">ไม่มีรายการรอตรวจสอบ</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: "100px" }}>จัดการ</th>
                  <th>วันที่</th>
                  <th>หน่วยงาน/จังหวัด</th>
                  <th>รูปภาพ</th>
                  <th>ประเภท/สเปค</th> {/* ✅ รวมคอลัมน์ */}
                  <th>สถานที่</th>
                  <th>รายการ</th>
                  <th>อายุ</th>
                  <th>เหตุผล</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAssets(pendingAssets).map((item) => {
                  // ✅ คำนวณอายุสดๆ
                  const currentAge = calculateCurrentAge(item.install_year);

                  return (
                    <tr key={item.id}>
                      {/* ปุ่มจัดการ */}
                      <td className="text-center">
                        <div
                          style={{
                            display: "flex",
                            gap: "5px",
                            justifyContent: "center",
                          }}
                        >
                          <button
                            className="btn-icon-action submit"
                            onClick={() => handleApprove(item.id)}
                            title="อนุมัติ"
                          >
                            <FiCheckCircle />
                          </button>
                          <button
                            className="btn-icon-action delete"
                            onClick={() => handleReject(item.id)}
                            title="ส่งกลับแก้ไข"
                          >
                            <FiXCircle />
                          </button>
                        </div>
                      </td>

                      <td>
                        {new Date(item.created_at).toLocaleDateString("th-TH")}
                      </td>
                      <td>
                        <div style={{ fontWeight: "bold" }}>
                          {item.department_name || "-"}
                        </div>
                        <div style={{ fontSize: "0.85em", color: "#666" }}>
                          {item.province || ""}
                        </div>
                      </td>
                      <td>{renderImageCell(item)}</td>

                      {/* แสดง Spec */}
                      <td>{renderSpecifics(item)}</td>

                      <td>
                        <div className="location-name">
                          {item.location_name}
                        </div>
                        <div className="location-sub">{item.location_type}</div>
                      </td>
                      <td>{item.brand_model}</td>

                      {/* แสดงอายุ (Real-time) */}
                      <td className={currentAge > 10 ? "text-danger" : ""}>
                        {currentAge > 0 ? `${currentAge} ปี` : "-"}
                      </td>

                      <td
                        style={{
                          maxWidth: "200px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={item.reason}
                      >
                        {item.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ✅ ตารางรายการทั้งหมด (All Assets) - ปรับปรุงให้เหมือนหน้า User */}
      <div
        className="assets-table-card"
        style={{ marginTop: "30px", borderTop: "4px solid #0d6efd" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "#0d6efd" }}
          >
            📋 รายการครุภัณฑ์ทั้งหมด ({getFilteredAssets(allAssets).length})
          </h2>
        </div>

        {getFilteredAssets(allAssets).length === 0 ? (
          <div className="empty-state">ยังไม่มีข้อมูลในระบบ</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>สถานะ</th>
                  <th>ประเภทคำขอ</th> {/* ✅ เพิ่ม */}
                  <th>วันที่</th>
                  <th>หน่วยงาน/จังหวัด</th>
                  <th>รูปภาพ</th>
                  <th>ประเภท/สเปค</th> {/* ✅ รวม */}
                  <th>สถานที่</th>
                  <th>ยี่ห้อ/รุ่น</th>
                  <th>อายุ</th>
                  <th>สภาพ</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAssets(allAssets).map((item) => {
                  // ✅ คำนวณอายุสดๆ
                  const currentAge = calculateCurrentAge(item.install_year);

                  return (
                    <tr key={item.id}>
                      <td>{getStatusBadge(item.status)}</td>

                      {/* แสดง Badge NEW/REPLACE */}
                      <td>
                        {item.request_type === "NEW" ? (
                          <span className="req-badge new">✨ ขอใหม่</span>
                        ) : (
                          <span className="req-badge replace">🔄 ทดแทน</span>
                        )}
                      </td>

                      <td>
                        {new Date(item.created_at).toLocaleDateString("th-TH")}
                      </td>
                      <td>
                        <div style={{ fontWeight: "bold" }}>
                          {item.department_name || "-"}
                        </div>
                        <div style={{ fontSize: "0.85em", color: "#666" }}>
                          {item.province}
                        </div>
                      </td>
                      <td>{renderImageCell(item)}</td>

                      {/* แสดง Spec */}
                      <td>{renderSpecifics(item)}</td>

                      <td>
                        <div className="location-name">
                          {item.location_name}
                        </div>
                        <div className="location-sub">{item.location_type}</div>
                      </td>

                      <td>{item.brand_model}</td>

                      {/* แสดงอายุ (Real-time) */}
                      <td className={currentAge > 10 ? "text-danger" : ""}>
                        {currentAge > 0 ? `${currentAge} ปี` : "-"}
                      </td>

                      <td>{item.condition}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="admin-dashboard-layout" style={{ marginTop: "20px" }}>
        <div className="assets-table-card">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <FiPieChart /> แยกตามอุปกรณ์ (ภาพรวมแคมเปญ)
          </h2>
          <table className="data-table" style={{ minWidth: "auto" }}>
            <thead>
              <tr>
                <th>ประเภท</th>
                <th className="text-right">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {stats.category_summary.map((cat, idx) => (
                <tr key={idx}>
                  <td>{cat.category}</td>
                  <td className="text-right font-bold">{cat.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="assets-table-card">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <FiBarChart2 /> สรุปรายจังหวัด/ส่วนงาน
          </h2>
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: "auto" }}>
              <thead>
                <tr>
                  <th>จังหวัด / หน่วยงาน</th>
                  <th className="text-center">ส่งมาแล้ว</th>
                  <th className="text-center text-orange-500">รอตรวจ</th>
                  <th className="text-center text-green-600">อนุมัติ</th>
                </tr>
              </thead>
              <tbody>
                {stats.province_summary.map((prov, idx) => (
                  <tr key={idx}>
                    <td>{prov.province || "(ไม่ระบุ)"}</td>
                    <td className="text-center font-bold">{prov.total}</td>
                    <td className="text-center" style={{ color: "#fd7e14" }}>
                      {prov.submitted}
                    </td>
                    <td className="text-center" style={{ color: "#198754" }}>
                      {prov.approved}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsAdminDashboard;
