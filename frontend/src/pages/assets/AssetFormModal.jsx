// frontend/src/pages/assets/AssetFormModal.jsx

import React, { useState, useEffect } from "react";
import { assetApi } from "../../assetApi";
import { FiX, FiImage } from "react-icons/fi";
import "./AssetFormModal.css";

// ✅ 1. Config ข้อมูลแอร์ตามบัญชีราคามาตรฐาน
const AIR_SPECS_CONFIG = {
  WALL_FIXED: {
    label: "ติดผนัง (Fixed Speed)",
    btus: [12000, 15000, 18000, 24000],
  },
  WALL_INVERTER: {
    label: "ติดผนัง (ระบบ Inverter)",
    btus: [12000, 15000, 18000, 24000],
  },
  CEILING_FIXED: {
    label: "ตั้งพื้นหรือแขวน (Fixed Speed)",
    btus: [
      13000, 18000, 20000, 24000, 26000, 30000, 32000, 36000, 40000, 44000,
      48000, 50000,
    ],
  },
  CEILING_INVERTER: {
    label: "ตั้งพื้นหรือแขวน (ระบบ Inverter)",
    btus: [13000, 18000, 24000, 30000, 36000, 40000, 48000],
  },
  CABINET: {
    label: "ตู้ตั้งพื้น (Cabinet)",
    btus: [44000, 56000],
  },
  OTHER: {
    label: "อื่นๆ / ระบุเอง",
    btus: [], // ถ้าเลือกอันนี้จะให้กรอกมือ
  },
};

// ✅ 2. Config ค่ามาตรฐานสำหรับอุปกรณ์อื่น
const SPEC_OPTIONS = {
  RECTIFIER: [30, 50, 100, 150, 400],
  BATTERY: [100, 150, 200, 300, 400, 600],
  UPS: [1, 3, 5, 10, 30, 60],
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

  // State
  const [formData, setFormData] = useState({
    request_type: "REPLACE", // Default
    category: "AIR",
    location_type: "EXCHANGE",
    location_name: "",
    brand_model: "",
    install_year: currentYear,
    asset_number: "",
    condition: "FAIR",
    customer_impact: 0,
    reason: "",
    // Specs
    air_type: "",
    air_btu: "",
    battery_amp: "",
    ups_kva: "",
    rectifier_amp: "",
  });

  // State สำหรับจำว่า Field ไหนกำลังใช้โหมด "ระบุเอง"
  const [customModeMap, setCustomModeMap] = useState({
    air_btu: false,
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

        // แปลงเป็นตัวเลขเพื่อตัดทศนิยม .00 (เช่น "10.00" -> 10) จะได้ match กับ dropdown
        ups_kva: initialData.ups_kva ? parseFloat(initialData.ups_kva) : "",
        rectifier_amp: initialData.rectifier_amp || "",
      });

      setPreviews({
        image_1: initialData.image_1,
        image_2: initialData.image_2,
      });

      // Helper เช็คว่าเป็นค่า Custom หรือไม่
      const checkIsCustom = (val, options) =>
        val !== "" && val !== null && !options.includes(Number(val));

      // เช็ค Custom สำหรับ Air BTU (ซับซ้อนกว่าเพราะขึ้นกับ Type)
      let isAirCustom = false;
      if (initialData.category === "AIR" && initialData.air_type) {
        const config = AIR_SPECS_CONFIG[initialData.air_type];
        if (config) {
          isAirCustom = checkIsCustom(initialData.air_btu, config.btus);
        } else {
          isAirCustom = true; // ถ้า type ไม่ตรง config เลย ถือว่า custom
        }
      }

      setCustomModeMap({
        air_btu: isAirCustom,
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
        air_btu: false,
        battery_amp: false,
        ups_kva: false,
        rectifier_amp: false,
      });
    }
    setFiles({ image_1: null, image_2: null });
  }, [initialData, isOpen, currentYear]);

  // Calc Age
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

  // จัดการเมื่อเลือก Dropdown Spec (สำหรับอุปกรณ์อื่นที่ไม่ใช่แอร์)
  const handleSpecSelect = (e, name) => {
    const val = e.target.value;
    if (val === "CUSTOM") {
      setCustomModeMap((prev) => ({ ...prev, [name]: true }));
      setFormData((prev) => ({ ...prev, [name]: "" }));
    } else {
      setCustomModeMap((prev) => ({ ...prev, [name]: false }));
      setFormData((prev) => ({ ...prev, [name]: val }));
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
        // กรอง Field ที่ไม่ต้องส่งกรณี "ขอใหม่"
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

  // ✅ Helper: ฟังก์ชัน render ส่วนเลือกแอร์แบบใหม่ (ตาม Config)
  const renderAirSection = () => {
    const selectedTypeConfig =
      AIR_SPECS_CONFIG[formData.air_type] || AIR_SPECS_CONFIG["OTHER"];
    const availableBTUs = selectedTypeConfig.btus || [];

    // เช็คว่า BTU ที่มีอยู่เดิม เป็นค่า Custom หรือไม่
    const currentValue = formData.air_btu;
    const isCustomBTU =
      currentValue && !availableBTUs.includes(Number(currentValue));

    // เงื่อนไขการแสดงช่องกรอก: เลือก OTHER หรือ BTU เดิมเป็น Custom หรือ User กดเลือก Custom
    const showCustomInput =
      formData.air_type === "OTHER" ||
      customModeMap.air_btu ||
      (isCustomBTU && currentValue !== "");

    const handleBTUSelect = (e) => {
      const val = e.target.value;
      if (val === "CUSTOM") {
        setCustomModeMap((prev) => ({ ...prev, air_btu: true }));
        setFormData((prev) => ({ ...prev, air_btu: "" }));
      } else {
        setCustomModeMap((prev) => ({ ...prev, air_btu: false }));
        setFormData((prev) => ({ ...prev, air_btu: val }));
      }
    };

    return (
      <div className="spec-box air-spec">
        {/* 1. เลือกชนิดแอร์ */}
        <div className="form-group">
          <label>
            ชนิดเครื่องปรับอากาศ <span className="text-danger">*</span>
          </label>
          <select
            name="air_type"
            value={formData.air_type}
            onChange={(e) => {
              // เมื่อเปลี่ยนชนิด ให้ reset BTU
              setFormData((prev) => ({
                ...prev,
                air_type: e.target.value,
                air_btu: "",
              }));
              setCustomModeMap((prev) => ({ ...prev, air_btu: false }));
            }}
            disabled={isReadOnly}
            required
          >
            <option value="">-- เลือกชนิด --</option>
            {Object.keys(AIR_SPECS_CONFIG).map((key) => (
              <option key={key} value={key}>
                {AIR_SPECS_CONFIG[key].label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. เลือกขนาด BTU (Dynamic ตามชนิด) */}
        <div className="form-group">
          <label>
            ขนาด (BTU) <span className="text-danger">*</span>
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <select
              value={showCustomInput ? "CUSTOM" : formData.air_btu}
              onChange={handleBTUSelect}
              disabled={isReadOnly || !formData.air_type}
              required
              style={{ flex: 1 }}
            >
              <option value="">-- เลือกขนาด --</option>
              {availableBTUs.map((btu) => (
                <option key={btu} value={btu}>
                  {btu.toLocaleString()} BTU
                </option>
              ))}
              <option value="CUSTOM">✎ ระบุเอง (Other)</option>
            </select>

            {showCustomInput && (
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
                  name="air_btu"
                  value={formData.air_btu}
                  onChange={handleChange}
                  placeholder="ระบุ BTU"
                  disabled={isReadOnly}
                  required
                  autoFocus
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "0.85em", color: "#666" }}>BTU</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper สำหรับ Spec อื่นๆ
  const renderSpecInput = (label, name, unit, options) => {
    const currentValue = formData[name];
    const isCustom = customModeMap[name];

    return (
      <div className="form-group">
        <label>
          {label} <span className="text-danger">*</span>
        </label>
        <div style={{ display: "flex", gap: "10px" }}>
          <select
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
              <div
                style={{
                  fontSize: "0.85em",
                  color: "#666",
                  marginTop: "5px",
                  marginLeft: "5px",
                }}
              >
                {formData.request_type === "NEW"
                  ? "* สำหรับติดตั้งใหม่ในจุดที่ไม่เคยมีมาก่อน (ไม่ต้องกรอกข้อมูลสินทรัพย์เดิม)"
                  : "* สำหรับเปลี่ยนแทนอุปกรณ์เดิมที่ชำรุด (ต้องกรอกข้อมูลสินทรัพย์เดิมให้ครบถ้วน)"}
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

                {/* --- Spec Inputs Logic --- */}
                {/* 1. AIR: ใช้ Logic ใหม่ตาม Config */}
                {formData.category === "AIR" && renderAirSection()}

                {/* 2. BATTERY */}
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
                {/* 3. UPS */}
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
                {/* 4. RECTIFIER */}
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
