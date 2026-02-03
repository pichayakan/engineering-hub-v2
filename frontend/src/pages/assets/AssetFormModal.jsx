// frontend/src/pages/assets/AssetFormModal.jsx

import React, { useState, useEffect } from "react";
import { assetApi } from "../../assetApi";
import { FiX, FiImage } from "react-icons/fi";
import "./AssetFormModal.css";

// ค่าตัวเลือกมาตรฐาน
const SPEC_OPTIONS = {
  RECTIFIER: [100, 150, 400],
  BATTERY: [100, 200, 300, 400, 600],
  UPS: [10, 30, 60],
};

const AssetFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  campaignId,
  initialData = null,
  isReadOnly = false,
}) => {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const isEditMode = !!initialData;

  // State ข้อมูล Form
  const [formData, setFormData] = useState({
    request_type: "REPLACE",
    category: "AIR",
    location_type: "EXCHANGE",
    location_name: "",
    brand_model: "",
    install_year: currentYear,
    asset_number: "",
    condition: "FAIR",
    customer_impact: 0,
    reason: "",
    air_type: "",
    air_btu: "",
    battery_amp: "",
    ups_kva: "",
    rectifier_amp: "",
  });

  // ✅ เพิ่ม state นี้เพื่อจำว่า Field ไหนกำลังใช้โหมด "ระบุเอง"
  const [customModeMap, setCustomModeMap] = useState({
    battery_amp: false,
    ups_kva: false,
    rectifier_amp: false,
  });

  const [files, setFiles] = useState({ image_1: null, image_2: null });
  const [previews, setPreviews] = useState({ image_1: null, image_2: null });
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState(0);

  // Load Data
  useEffect(() => {
    if (initialData) {
      setFormData({
        request_type: initialData.request_type || "REPLACE",
        category: initialData.category,
        location_type: initialData.location_type,
        location_name: initialData.location_name,
        brand_model: initialData.brand_model || "",
        install_year: initialData.install_year || currentYear,
        asset_number: initialData.asset_number || "",
        condition: initialData.condition || "FAIR",
        customer_impact: initialData.customer_impact || 0,
        reason: initialData.reason || "",
        air_type: initialData.air_type || "",
        air_btu: initialData.air_btu || "",
        battery_amp: initialData.battery_amp || "",
        ups_kva: initialData.ups_kva ? parseFloat(initialData.ups_kva) : "",
        rectifier_amp: initialData.rectifier_amp || "",
      });
      setPreviews({
        image_1: initialData.image_1,
        image_2: initialData.image_2,
      });

      // ✅ เช็ค initial data ว่าเป็นค่า Custom หรือไม่ เพื่อเปิดโหมด Custom อัตโนมัติ
      const checkIsCustom = (val, options) => {
        if (val === "" || val === null) return false;
        return !options.includes(Number(val)); // แปลงเป็น Number ก่อนเทียบ
      };

      setCustomModeMap({
        battery_amp: checkIsCustom(
          initialData.battery_amp,
          SPEC_OPTIONS.BATTERY,
        ),
        ups_kva: checkIsCustom(initialData.ups_kva, SPEC_OPTIONS.UPS),
        rectifier_amp: checkIsCustom(
          initialData.rectifier_amp,
          SPEC_OPTIONS.RECTIFIER,
        ),
      });
    } else {
      // Reset Form
      setFormData({
        request_type: "REPLACE",
        category: "AIR",
        location_type: "EXCHANGE",
        location_name: "",
        brand_model: "",
        install_year: currentYear,
        asset_number: "",
        condition: "FAIR",
        customer_impact: 0,
        reason: "",
        air_type: "",
        air_btu: "",
        battery_amp: "",
        ups_kva: "",
        rectifier_amp: "",
      });
      setPreviews({ image_1: null, image_2: null });
      setCustomModeMap({
        battery_amp: false,
        ups_kva: false,
        rectifier_amp: false,
      });
    }
    setFiles({ image_1: null, image_2: null });
  }, [initialData, isOpen, currentYear]);

  // Calculate Age
  useEffect(() => {
    if (formData.install_year) {
      const calculatedAge = currentYear - parseInt(formData.install_year);
      setAge(calculatedAge < 0 ? 0 : calculatedAge);
    }
  }, [formData.install_year, currentYear]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ ฟังก์ชันจัดการเมื่อเลือก Dropdown Spec
  const handleSpecSelect = (e, name) => {
    const val = e.target.value;
    if (val === "CUSTOM") {
      setCustomModeMap((prev) => ({ ...prev, [name]: true })); // เปิดโหมด Custom
      setFormData((prev) => ({ ...prev, [name]: "" })); // เคลียร์ค่ารอพิมพ์
    } else {
      setCustomModeMap((prev) => ({ ...prev, [name]: false })); // ปิดโหมด Custom
      setFormData((prev) => ({ ...prev, [name]: val })); // ใส่ค่าตามที่เลือก
    }
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [fieldName]: file }));
      setPreviews((prev) => ({
        ...prev,
        [fieldName]: URL.createObjectURL(file),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);
    try {
      const payload = new FormData();
      if (!isEditMode) payload.append("campaign", campaignId);

      Object.keys(formData).forEach((key) => {
        if (formData.request_type === "NEW") {
          const skipFields = [
            "asset_number",
            "install_year",
            "condition",
            "customer_impact",
            "brand_model",
          ];
          if (skipFields.includes(key)) return;
        }
        if (formData[key] !== null && formData[key] !== undefined) {
          payload.append(key, formData[key]);
        }
      });

      if (files.image_1) payload.append("image_1", files.image_1);
      if (files.image_2) payload.append("image_2", files.image_2);

      if (isEditMode) {
        await assetApi.updateAsset(initialData.id, payload);
        alert("แก้ไขข้อมูลเรียบร้อย");
      } else {
        await assetApi.createAsset(payload);
        alert("บันทึกข้อมูลเรียบร้อย");
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Save Error:", error);
      alert(
        "เกิดข้อผิดพลาด: " +
          (error.response?.data?.detail || "โปรดลองอีกครั้ง"),
      );
    } finally {
      setLoading(false);
    }
  };

  const isReplace = formData.request_type === "REPLACE";

  // ✅ Helper Function สำหรับ Render Spec Dropdown (เขียน Inline เพื่อลดความซับซ้อน)
  const renderSpecInput = (label, name, unit, options) => {
    const currentValue = formData[name];
    const isCustom = customModeMap[name]; // ใช้ตัวแปร state ที่สร้างไว้

    return (
      <div className="form-group">
        <label>
          {label} <span className="text-danger">*</span>
        </label>
        <div style={{ display: "flex", gap: "10px" }}>
          <select
            // ถ้าเป็น Custom ให้ dropdown โชว์ค่า "CUSTOM"
            value={isCustom ? "CUSTOM" : currentValue}
            onChange={(e) => handleSpecSelect(e, name)}
            disabled={isReadOnly}
            required
            style={{ flex: 1 }}
          >
            <option value="">-- เลือกขนาด --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt} {unit}
              </option>
            ))}
            <option value="CUSTOM">✎ ระบุขนาดเอง (Other)</option>
          </select>

          {/* แสดงช่องกรอกเมื่อเป็น Custom */}
          {isCustom && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                animation: "fadeIn 0.2s",
              }}
            >
              <input
                type="number"
                name={name}
                value={currentValue}
                onChange={handleChange}
                placeholder="ระบุตัวเลข"
                step={name === "ups_kva" ? "0.1" : "1"}
                disabled={isReadOnly}
                required
                autoFocus
                style={{ flex: 1 }}
              />
              <span
                style={{
                  fontSize: "0.85em",
                  color: "#666",
                  whiteSpace: "nowrap",
                }}
              >
                {unit}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            {isReadOnly
              ? "👁️ รายละเอียดรายการ"
              : isEditMode
                ? "✏️ แก้ไขรายการ"
                : "📝 เพิ่มรายการครุภัณฑ์"}
          </h2>
          <button className="btn-close" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="asset-form">
          <div className="form-grid">
            {/* เลือกประเภทคำขอ */}
            <div
              className="form-section full-width"
              style={{
                background: "#e9ecef",
                padding: "10px 15px",
                borderRadius: "8px",
                marginBottom: "15px",
              }}
            >
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                ประเภทการขอ (Request Type):
              </label>
              <div style={{ display: "flex", gap: "20px" }}>
                <label
                  className={`radio-label ${formData.request_type === "NEW" ? "selected" : ""}`}
                  style={{ cursor: isReadOnly ? "default" : "pointer" }}
                >
                  <input
                    type="radio"
                    name="request_type"
                    value="NEW"
                    checked={formData.request_type === "NEW"}
                    onChange={handleChange}
                    disabled={isReadOnly}
                  />
                  <span style={{ marginLeft: "5px" }}>
                    ✨ ขอใหม่ (New Request)
                  </span>
                </label>
                <label
                  className={`radio-label ${formData.request_type === "REPLACE" ? "selected" : ""}`}
                  style={{ cursor: isReadOnly ? "default" : "pointer" }}
                >
                  <input
                    type="radio"
                    name="request_type"
                    value="REPLACE"
                    checked={formData.request_type === "REPLACE"}
                    onChange={handleChange}
                    disabled={isReadOnly}
                  />
                  <span style={{ marginLeft: "5px" }}>
                    🔄 ทดแทนของเดิม (Replacement)
                  </span>
                </label>
              </div>
            </div>

            {/* 1. ข้อมูลสถานที่ */}
            <div className="form-section full-width">
              <h3>1. ข้อมูลสถานที่</h3>
              <div className="grid-2">
                <div className="form-group">
                  <label>
                    ประเภทสถานที่ <span className="text-danger">*</span>
                  </label>
                  <select
                    name="location_type"
                    value={formData.location_type}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    required
                  >
                    <option value="EXCHANGE">อาคารชุมสาย (Exchange)</option>
                    <option value="SERVICE_CENTER">ศูนย์บริการลูกค้า</option>
                    <option value="OFFICE">อาคารสำนักงาน</option>
                    <option value="BASE_STATION">
                      สถานีฐาน (Base Station)
                    </option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    ชื่อสถานที่ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly}
                    placeholder="ระบุชื่ออาคาร หรือ สถานที่"
                  />
                </div>
              </div>
            </div>

            {/* 2. รายละเอียดอุปกรณ์ */}
            <div className="form-section full-width">
              <h3>2. รายละเอียดอุปกรณ์ที่ต้องการ</h3>
              <div className="grid-2">
                <div className="form-group">
                  <label>
                    ประเภทอุปกรณ์ <span className="text-danger">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly || isEditMode}
                  >
                    <option value="AIR">
                      เครื่องปรับอากาศ (Air Conditioner)
                    </option>
                    <option value="BATTERY">แบตเตอรี่ (Battery)</option>
                    <option value="UPS">UPS</option>
                    <option value="RECTIFIER">Rectifier</option>
                    <option value="OTHER">อื่นๆ</option>
                  </select>
                </div>

                {/* --- Spec Inputs --- */}
                {formData.category === "AIR" && (
                  <div className="spec-box air-spec">
                    <div className="form-group">
                      <label>
                        ชนิดเครื่องปรับอากาศ{" "}
                        <span className="text-danger">*</span>
                      </label>
                      <select
                        name="air_type"
                        value={formData.air_type}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        required
                      >
                        <option value="">-- เลือกชนิด --</option>
                        <option value="WALL">ติดผนัง (Wall)</option>
                        <option value="CEILING">แขวนใต้ฝ้า (Ceiling)</option>
                        <option value="CASSETTE">ฝังฝ้า (Cassette)</option>
                        <option value="FLOOR">ตั้งพื้น (Floor)</option>
                        <option value="OTHER">อื่นๆ</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        ขนาด (BTU) <span className="text-danger">*</span>
                      </label>
                      <select
                        name="air_btu"
                        value={formData.air_btu}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        required
                      >
                        <option value="">-- เลือกขนาด --</option>
                        <option value="9000">9,000 BTU</option>
                        <option value="12000">12,000 BTU</option>
                        <option value="18000">18,000 BTU</option>
                        <option value="24000">24,000 BTU</option>
                        <option value="30000">30,000 BTU</option>
                        <option value="36000">36,000 BTU</option>
                        <option value="40000+">40,000+ BTU</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* ✅ เรียกใช้ฟังก์ชัน renderSpecInput */}
                {formData.category === "BATTERY" && (
                  <div className="spec-box batt-spec">
                    {renderSpecInput(
                      "ขนาด (Ah)",
                      "battery_amp",
                      "Ah",
                      SPEC_OPTIONS.BATTERY,
                    )}
                  </div>
                )}
                {formData.category === "UPS" && (
                  <div className="spec-box ups-spec">
                    {renderSpecInput(
                      "ขนาด (kVA)",
                      "ups_kva",
                      "kVA",
                      SPEC_OPTIONS.UPS,
                    )}
                  </div>
                )}
                {formData.category === "RECTIFIER" && (
                  <div className="spec-box rect-spec">
                    {renderSpecInput(
                      "ขนาด (Amp)",
                      "rectifier_amp",
                      "A",
                      SPEC_OPTIONS.RECTIFIER,
                    )}
                  </div>
                )}

                {/* ข้อมูลสินทรัพย์เดิม (เฉพาะ REPLACE) */}
                {isReplace && (
                  <>
                    <div className="form-group">
                      <label>
                        เลขสินทรัพย์เดิม <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="asset_number"
                        value={formData.asset_number}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        required={isReplace}
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        ยี่ห้อ / รุ่นเดิม <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="brand_model"
                        value={formData.brand_model}
                        onChange={handleChange}
                        required={isReplace}
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="form-group highlight-group">
                      <label>
                        ปีที่ติดตั้ง (ค.ศ.){" "}
                        <span className="text-danger">*</span>
                      </label>
                      <div className="age-calculator">
                        <input
                          type="number"
                          name="install_year"
                          value={formData.install_year}
                          onChange={handleChange}
                          disabled={isReadOnly}
                          required={isReplace}
                        />
                        <span
                          className={`age-badge ${age > 10 ? "old" : "new"}`}
                        >
                          อายุ: <strong>{age}</strong> ปี
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. ข้อมูลประกอบ */}
            <div className="form-section full-width">
              <h3>3. ข้อมูลประกอบการพิจารณา</h3>
              <div className="grid-2">
                {isReplace && (
                  <>
                    <div className="form-group">
                      <label>
                        สภาพปัจจุบัน <span className="text-danger">*</span>
                      </label>
                      <select
                        name="condition"
                        value={formData.condition}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        required={isReplace}
                      >
                        <option value="GOOD">ใช้งานได้ปกติ</option>
                        <option value="FAIR">พอใช้ (เริ่มเสื่อม)</option>
                        <option value="POOR">ควรเปลี่ยน (เสื่อมมาก)</option>
                        <option value="DAMAGED">ชำรุด (ใช้งานไม่ได้)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        ผลกระทบลูกค้า (ราย){" "}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        name="customer_impact"
                        value={formData.customer_impact}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        required={isReplace}
                      />
                    </div>
                  </>
                )}
                <div className="form-group full-width">
                  <label>
                    เหตุผลความจำเป็น <span className="text-danger">*</span>
                  </label>
                  <textarea
                    name="reason"
                    rows="2"
                    value={formData.reason}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    required
                  ></textarea>
                </div>
              </div>

              <div className="form-group full-width">
                <label>รูปภาพประกอบ (ถ้ามี)</label>
                <div className="upload-grid">
                  <div className="upload-box">
                    {previews.image_1 ? (
                      <img src={previews.image_1} alt="p1" />
                    ) : (
                      <div className="placeholder">
                        <FiImage /> รูปที่ 1
                      </div>
                    )}
                    {!isReadOnly && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "image_1")}
                      />
                    )}
                  </div>
                  <div className="upload-box">
                    {previews.image_2 ? (
                      <img src={previews.image_2} alt="p2" />
                    ) : (
                      <div className="placeholder">
                        <FiImage /> รูปที่ 2
                      </div>
                    )}
                    {!isReadOnly && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "image_2")}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              {isReadOnly ? "ปิด" : "ยกเลิก"}
            </button>
            {!isReadOnly && (
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading
                  ? "กำลังบันทึก..."
                  : isEditMode
                    ? "บันทึกการแก้ไข"
                    : "บันทึกรายการ"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetFormModal;
