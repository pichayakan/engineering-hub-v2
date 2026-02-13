// frontend/src/pages/assets/AssetsAdminDashboard.jsx

import React, { useState, useEffect, useMemo } from "react";
import { assetApi } from "../../assetApi";
import { SERVER_URL } from "../../api";

import {
  FiDownload,
  FiPieChart,
  FiBarChart2,
  FiCheckCircle,
  FiXCircle,
  FiChevronLeft,
  FiChevronRight,
  FiList,
  FiHash,
  FiMessageSquare,
  FiDollarSign, // ✅ เพิ่มไอคอนเงิน
  FiSave, // ✅ เพิ่มไอคอนบันทึก
} from "react-icons/fi";
import "./AssetsDashboard.css";

const AIR_TYPE_MAP = {
  WALL_FIXED: "ติดผนัง (Fixed Speed)",
  WALL_INVERTER: "ติดผนัง (Inverter)",
  CEILING_FIXED: "ตั้งพื้น/แขวน (Fixed Speed)",
  CEILING_INVERTER: "ตั้งพื้น/แขวน (Inverter)",
  CABINET: "ตู้ตั้งพื้น (Cabinet)",
  OTHER: "อื่นๆ",
};

const AssetsAdminDashboard = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [stats, setStats] = useState(null);
  const [pendingAssets, setPendingAssets] = useState([]);
  const [allAssets, setAllAssets] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");

  const [loading, setLoading] = useState(false);

  // Pagination States
  const [pendingPage, setPendingPage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ State สำหรับเก็บราคา (Key = Spec Name, Value = Price)
  const [priceList, setPriceList] = useState(() => {
    // โหลดราคาเดิมที่เคยกรอกไว้จาก LocalStorage (ถ้ามี)
    const saved = localStorage.getItem("assetPrices");
    return saved ? JSON.parse(saved) : {};
  });

  // Initial Load
  useEffect(() => {
    fetchCampaigns();
    fetchDepartments();
  }, []);

  // Fetch Data
  useEffect(() => {
    if (selectedCampaign) {
      fetchStats(selectedCampaign);
      fetchPendingAssets(selectedCampaign);
      fetchAllAssets(selectedCampaign);
    }
  }, [selectedCampaign, selectedDept]);

  // Reset Page
  useEffect(() => {
    setPendingPage(1);
    setAllPage(1);
  }, [selectedCampaign, selectedDept, filterCategory]);

  // ✅ บันทึกราคาลง LocalStorage ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    localStorage.setItem("assetPrices", JSON.stringify(priceList));
  }, [priceList]);

  // --- API Calls (คงเดิม) ---
  const fetchCampaigns = async () => {
    try {
      const res = await assetApi.getCampaigns();
      setCampaigns(res.data);
      if (res.data.length > 0) setSelectedCampaign(res.data[0].id);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await assetApi.getAllDepartments();
      if (res.data.results) setDepartments(res.data.results);
      else if (Array.isArray(res.data)) setDepartments(res.data);
      else setDepartments([]);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStats = async (id) => {
    setLoading(true);
    try {
      const res = await assetApi.getCampaignStats(id);
      setStats(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAssets = async (campaignId) => {
    try {
      const params = { campaign: campaignId, status: "SUBMITTED" };
      if (selectedDept) params.department = selectedDept;
      const res = await assetApi.getAssets(params);
      setPendingAssets(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllAssets = async (campaignId) => {
    try {
      const params = { campaign: campaignId };
      if (selectedDept) params.department = selectedDept;
      const res = await assetApi.getAssets(params);
      const data = res.data.results || res.data;
      if (Array.isArray(data)) setAllAssets(data);
      else setAllAssets([]);
    } catch (error) {
      console.error(error);
    }
  };

  // --- Actions ---
  const handleExportMain = async () => {
    /* ... คงเดิม ... */
    if (!selectedCampaign) return;
    try {
      const res = await assetApi.exportAssets(selectedCampaign);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `assets_full_export_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Export failed");
    }
  };

  const handleApprove = async (id) => {
    /* ... คงเดิม ... */
    if (!window.confirm("ยืนยันการอนุมัติ?")) return;
    try {
      await assetApi.approveAsset(id);
      fetchStats(selectedCampaign);
      fetchPendingAssets(selectedCampaign);
      fetchAllAssets(selectedCampaign);
    } catch (error) {
      alert("Error approving asset");
    }
  };

  const handleReject = async (id) => {
    /* ... คงเดิม ... */
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

  // ✅ ฟังก์ชันอัปเดตราคา
  const handlePriceChange = (specName, value) => {
    setPriceList((prev) => ({
      ...prev,
      [specName]: parseFloat(value) || 0,
    }));
  };

  // Helpers
  const getCount = (list, key, val) =>
    list?.find((item) => item[key] === val)?.count || 0;

  const getStatusBadge = (status) => {
    /* ... คงเดิม ... */
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
    return Math.max(0, currentYear - parseInt(installYear));
  };

  const getFilteredAssets = (assetsList) => {
    if (filterCategory === "ALL") return assetsList;
    return assetsList.filter((item) => item.category === filterCategory);
  };

  // Detailed Breakdown Logic
  const getDetailedStats = () => {
    const groups = {};
    const dataToAnalyze = getFilteredAssets(allAssets);

    dataToAnalyze.forEach((item) => {
      let specLabel = "";
      let categoryLabel = "";

      switch (item.category) {
        case "AIR":
          categoryLabel = "❄️ เครื่องปรับอากาศ";
          const airTypeName =
            AIR_TYPE_MAP[item.air_type] || item.air_type || "ไม่ระบุชนิด";
          specLabel = `${airTypeName} - ${item.air_btu ? parseInt(item.air_btu).toLocaleString() : "?"} BTU`;
          break;
        case "BATTERY":
          categoryLabel = "🔋 แบตเตอรี่";
          specLabel = `${item.battery_amp} Ah`;
          break;
        case "UPS":
          categoryLabel = "⚡ UPS";
          specLabel = `${item.ups_kva} kVA`;
          break;
        case "RECTIFIER":
          categoryLabel = "🔌 Rectifier";
          specLabel = `${item.rectifier_amp} A`;
          break;
        default:
          categoryLabel = "📦 อื่นๆ";
          specLabel = item.brand_model || "ไม่ระบุรุ่น";
      }

      if (!groups[categoryLabel]) groups[categoryLabel] = {};
      if (!groups[categoryLabel][specLabel]) {
        groups[categoryLabel][specLabel] = {
          total: 0,
          departments: {},
        };
      }

      groups[categoryLabel][specLabel].total += 1;
      const deptName =
        item.department_name || item.province || "ไม่ระบุหน่วยงาน";

      if (!groups[categoryLabel][specLabel].departments[deptName]) {
        groups[categoryLabel][specLabel].departments[deptName] = {
          count: 0,
          asset_numbers: [],
          reasons: [],
        };
      }

      groups[categoryLabel][specLabel].departments[deptName].count += 1;
      groups[categoryLabel][specLabel].departments[deptName].asset_numbers.push(
        item.asset_number || "-",
      );
      groups[categoryLabel][specLabel].departments[deptName].reasons.push(
        item.reason || "-",
      );
    });

    return groups;
  };

  const detailedStats = getDetailedStats();

  // ✅ คำนวณยอดรวมทั้งหมด (Grand Total)
  const grandTotalBudget = useMemo(() => {
    let total = 0;
    Object.values(detailedStats).forEach((specs) => {
      Object.entries(specs).forEach(([specName, data]) => {
        const price = priceList[specName] || 0;
        total += data.total * price;
      });
    });
    return total;
  }, [detailedStats, priceList]);

  // ✅ Export Breakdown Logic (รวมราคาและยอดเงิน)
  const handleExportBreakdown = () => {
    if (Object.keys(detailedStats).length === 0) {
      alert("ไม่มีข้อมูลสำหรับ Export");
      return;
    }

    // เพิ่มคอลัมน์ ราคา/หน่วย และ รวมเงิน
    const rows = [
      [
        "หมวดหมู่",
        "รายการ/สเปก",
        "หน่วยงาน",
        "จำนวน",
        "ราคา/หน่วย",
        "รวมเงิน",
        "เลขสินทรัพย์",
        "เหตุผล",
      ],
    ];

    Object.entries(detailedStats).forEach(([category, specs]) => {
      const cleanCategory = category
        .replace(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu,
          "",
        )
        .trim();

      Object.entries(specs).forEach(([specName, data]) => {
        const price = priceList[specName] || 0; // ดึงราคา

        Object.entries(data.departments).forEach(([deptName, info]) => {
          const assetsStr = info.asset_numbers.join(", ");
          const reasonsStr = info.reasons.join(", ");
          const totalPrice = info.count * price; // คำนวณยอดเงิน

          rows.push([
            cleanCategory,
            specName,
            deptName,
            info.count,
            price,
            totalPrice,
            assetsStr,
            reasonsStr,
          ]);
        });
      });
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      rows
        .map((row) =>
          row
            .map((field) => {
              const stringField = String(field);
              if (stringField.search(/("|,|\n)/g) >= 0) {
                return `"${stringField.replace(/"/g, '""')}"`;
              }
              return stringField;
            })
            .join(","),
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    const date = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `budget_breakdown_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Render Functions (ImageCell, Specifics, Pagination) - คงเดิมเพื่อความกระชับ
  const renderImageCell = (item) => {
    const getImageUrl = (path) =>
      path?.startsWith("http") ? path : `${SERVER_URL}${path}`;
    const img1Url = getImageUrl(item.image_1);
    const img2Url = getImageUrl(item.image_2);
    return (
      <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
        {img1Url ? (
          <a href={img1Url} target="_blank" rel="noreferrer">
            <div
              style={{
                width: "50px",
                height: "50px",
                backgroundImage: `url(${img1Url})`,
                backgroundSize: "cover",
                borderRadius: "6px",
                border: "1px solid #dee2e6",
              }}
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
                borderRadius: "6px",
                border: "1px solid #dee2e6",
              }}
            />
          </a>
        )}
      </div>
    );
  };

  const renderSpecifics = (item) => {
    const reqBadge =
      item.request_type === "NEW" ? (
        <span className="req-badge new">✨ NEW</span>
      ) : (
        <span className="req-badge replace">🔄 REPLACE</span>
      );
    let content = null;
    let color = "#333";
    switch (item.category) {
      case "AIR":
        color = "#0d6efd";
        content = (
          <>
            {AIR_TYPE_MAP[item.air_type] || item.air_type} -{" "}
            {item.air_btu ? parseInt(item.air_btu).toLocaleString() : "?"} BTU
          </>
        );
        break;
      case "BATTERY":
        color = "#198754";
        content = <>{item.battery_amp} Ah</>;
        break;
      case "UPS":
        color = "#6f42c1";
        content = <>{item.ups_kva} kVA</>;
        break;
      case "RECTIFIER":
        color = "#fd7e14";
        content = <>{item.rectifier_amp} A</>;
        break;
      default:
        content = "-";
    }
    return (
      <div className="spec-container">
        <div className="spec-title" style={{ color }}>
          {reqBadge} {item.category}
        </div>
        <div className="spec-detail">{content}</div>
      </div>
    );
  };

  const PaginationControls = ({ currentPage, totalItems, paginate }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "5px",
          marginTop: "15px",
          paddingBottom: "10px",
        }}
      >
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "6px 12px",
            border: "1px solid #dee2e6",
            borderRadius: "4px",
            background: currentPage === 1 ? "#e9ecef" : "#fff",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FiChevronLeft /> ก่อนหน้า
        </button>
        <span style={{ margin: "0 10px", fontSize: "0.9rem", color: "#666" }}>
          หน้า <strong>{currentPage}</strong> จาก {totalPages}
        </span>
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: "6px 12px",
            border: "1px solid #dee2e6",
            borderRadius: "4px",
            background: currentPage === totalPages ? "#e9ecef" : "#fff",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          ถัดไป <FiChevronRight />
        </button>
      </div>
    );
  };

  // Pagination Logic
  const filteredPending = getFilteredAssets(pendingAssets);
  const currentPendingItems = filteredPending.slice(
    (pendingPage - 1) * itemsPerPage,
    pendingPage * itemsPerPage,
  );

  const filteredAll = getFilteredAssets(allAssets);
  const currentAllItems = filteredAll.slice(
    (allPage - 1) * itemsPerPage,
    allPage * itemsPerPage,
  );

  if (!stats) return <div className="p-4">Loading Admin Dashboard...</div>;

  return (
    <div className="assets-dashboard-container">
      {/* Header */}
      <div className="assets-header">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FiPieChart /> ภาพรวมการสำรวจ (Admin)
          </h1>
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
          <select
            className="campaign-select"
            style={{ marginLeft: "10px", minWidth: "150px" }}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">-- ทุกแผนก --</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            className="btn-add-asset"
            style={{ backgroundColor: "#198754" }}
            onClick={handleExportMain}
          >
            <FiDownload /> CSV (All)
          </button>
        </div>
      </div>

      {/* Stats Cards + ✅ Budget Card */}
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

        {/* ✅ การ์ดงบประมาณรวม (เพิ่มใหม่) */}
        <div className="stat-card budget-card">
          <h3>💰 งบประมาณรวม (Estimate)</h3>
          <div className="stat-value text-primary">
            ฿{grandTotalBudget.toLocaleString()}
          </div>
          <div className="stat-desc">คำนวณจากราคาที่กำหนด</div>
        </div>
      </div>

      {/* ... Filter Buttons & Tables (Pending/All) ... คงเดิม ... */}
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
            }}
          >
            {cat === "ALL" ? "ทั้งหมด" : cat}
          </button>
        ))}
      </div>

      <div
        className="assets-table-card"
        style={{ marginBottom: "20px", borderTop: "4px solid #fd7e14" }}
      >
        <h2
          className="mb-4 text-lg font-semibold flex items-center gap-2"
          style={{ color: "#fd7e14" }}
        >
          ⏳ รายการรอตรวจสอบ ({filteredPending.length})
        </h2>
        {filteredPending.length === 0 ? (
          <div className="empty-state">ไม่มีรายการรอตรวจสอบ</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>จัดการ</th>
                    <th>วันที่</th>
                    <th>หน่วยงาน/จังหวัด</th>
                    <th>รูปภาพ</th>
                    <th>ประเภท/สเปค</th>
                    <th>สถานที่</th>
                    <th>รายการ</th>
                    <th>อายุ</th>
                    <th>เหตุผล</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPendingItems.map((item) => {
                    const currentAge = calculateCurrentAge(item.install_year);
                    return (
                      <tr key={item.id}>
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
                            >
                              <FiCheckCircle />
                            </button>
                            <button
                              className="btn-icon-action delete"
                              onClick={() => handleReject(item.id)}
                            >
                              <FiXCircle />
                            </button>
                          </div>
                        </td>
                        <td>
                          {new Date(item.created_at).toLocaleDateString(
                            "th-TH",
                          )}
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
                        <td>{renderSpecifics(item)}</td>
                        <td>
                          <div className="location-name">
                            {item.location_name}
                          </div>
                          <div className="location-sub">
                            {item.location_type}
                          </div>
                        </td>
                        <td>{item.brand_model}</td>
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
            <PaginationControls
              currentPage={pendingPage}
              totalItems={filteredPending.length}
              paginate={setPendingPage}
            />
          </>
        )}
      </div>

      <div
        className="assets-table-card"
        style={{ marginTop: "30px", borderTop: "4px solid #0d6efd" }}
      >
        <h2
          className="text-lg font-semibold flex items-center gap-2 mb-4"
          style={{ color: "#0d6efd" }}
        >
          📋 รายการครุภัณฑ์ทั้งหมด ({filteredAll.length})
        </h2>
        {filteredAll.length === 0 ? (
          <div className="empty-state">ยังไม่มีข้อมูลในระบบ</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>สถานะ</th>
                    <th>ประเภทคำขอ</th>
                    <th>วันที่</th>
                    <th>หน่วยงาน/จังหวัด</th>
                    <th>รูปภาพ</th>
                    <th>ประเภท/สเปค</th>
                    <th>สถานที่</th>
                    <th>ยี่ห้อ/รุ่น</th>
                    <th>อายุ</th>
                    <th>สภาพ</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAllItems.map((item) => {
                    const currentAge = calculateCurrentAge(item.install_year);
                    return (
                      <tr key={item.id}>
                        <td>{getStatusBadge(item.status)}</td>
                        <td>
                          {item.request_type === "NEW" ? (
                            <span className="req-badge new">✨ ขอใหม่</span>
                          ) : (
                            <span className="req-badge replace">🔄 ทดแทน</span>
                          )}
                        </td>
                        <td>
                          {new Date(item.created_at).toLocaleDateString(
                            "th-TH",
                          )}
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
                        <td>{renderSpecifics(item)}</td>
                        <td>
                          <div className="location-name">
                            {item.location_name}
                          </div>
                          <div className="location-sub">
                            {item.location_type}
                          </div>
                        </td>
                        <td>{item.brand_model}</td>
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
            <PaginationControls
              currentPage={allPage}
              totalItems={filteredAll.length}
              paginate={setAllPage}
            />
          </>
        )}
      </div>

      {/* ... Charts ... คงเดิม ... */}
      <div className="admin-dashboard-layout" style={{ marginTop: "20px" }}>
        <div className="assets-table-card">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <FiPieChart /> แยกตามอุปกรณ์
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

      {/* ✅ Detailed Breakdown + Price Input */}
      <div
        className="assets-table-card"
        style={{ marginTop: "20px", borderTop: "4px solid #6f42c1" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "#6f42c1", margin: 0 }}
          >
            <FiDollarSign /> สรุปงบประมาณและรายละเอียด
          </h2>
          <button
            onClick={handleExportBreakdown}
            style={{
              backgroundColor: "#6f42c1",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.9rem",
            }}
          >
            <FiDownload /> Export รายละเอียด + ราคา
          </button>
        </div>

        {Object.keys(detailedStats).length === 0 ? (
          <div className="empty-state">ไม่มีข้อมูลสำหรับสรุป</div>
        ) : (
          <div className="detailed-breakdown-grid">
            {Object.entries(detailedStats).map(([category, specs]) => (
              <div key={category} className="breakdown-category-card">
                <h3 className="category-title">{category}</h3>
                <div className="specs-list">
                  {Object.entries(specs).map(([specName, data]) => {
                    const price = priceList[specName] || 0;
                    const subtotal = data.total * price;

                    return (
                      <div key={specName} className="spec-item">
                        {/* Header: ชื่อสเปก + ช่องกรอกราคา */}
                        <div
                          className="spec-header"
                          style={{ flexWrap: "wrap", gap: "10px" }}
                        >
                          <div style={{ flex: 1 }}>
                            <span className="spec-name">{specName}</span>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "#666",
                                marginTop: "4px",
                              }}
                            >
                              จำนวน: <strong>{data.total}</strong> หน่วย
                            </div>
                          </div>

                          {/* Input ราคา */}
                          <div className="price-input-group">
                            <span className="currency-symbol">฿</span>
                            <input
                              type="number"
                              className="price-input"
                              placeholder="ระบุราคา"
                              value={priceList[specName] || ""}
                              onChange={(e) =>
                                handlePriceChange(specName, e.target.value)
                              }
                            />
                          </div>
                        </div>

                        {/* ยอดรวมย่อย */}
                        <div className="spec-subtotal">
                          รวมเงิน: <strong>฿{subtotal.toLocaleString()}</strong>
                        </div>

                        {/* รายการหน่วยงาน (ย่อ) */}
                        <div className="dept-breakdown-list">
                          {Object.entries(data.departments).map(
                            ([deptName, info]) => (
                              <div key={deptName} className="dept-item">
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: "500",
                                      color: "#495057",
                                    }}
                                  >
                                    {deptName}
                                  </span>
                                  <span
                                    style={{
                                      backgroundColor: "#e9ecef",
                                      padding: "2px 8px",
                                      borderRadius: "10px",
                                      fontSize: "0.85rem",
                                      fontWeight: "bold",
                                      color: "#495057",
                                    }}
                                  >
                                    {info.count}
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetsAdminDashboard;
