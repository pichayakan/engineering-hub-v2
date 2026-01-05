// frontend/src/components/SignatureModal.jsx
import React, { useState, useRef, useEffect } from "react";
import Modal from "./Modal";
import SignatureCanvas from "react-signature-canvas";
import "./SignatureModal.css";
import { FiPenTool, FiRefreshCw, FiMinusCircle } from "react-icons/fi"; // เปลี่ยนไอคอนนิดหน่อย

function SignatureModal({
  isOpen,
  onClose,
  onSave,
  typedSignatureFont = "'Sarabun', sans-serif",
  initialData = null,
}) {
  const sigPadRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const [activeTab, setActiveTab] = useState(
    initialData?.type === "type" ? "type" : "draw"
  );
  const [typedName, setTypedName] = useState(
    initialData?.type === "type" ? initialData.text : ""
  );

  // --- ✅ State เครื่องมือและขนาดเส้น ---
  const [currentTool, setCurrentTool] = useState("pen"); // 'pen' | 'whiteout'
  const [brushSize, setBrushSize] = useState(2.5); // ขนาดเริ่มต้น
  // ------------------------------------

  const [typedSignatureUrl, setTypedSignatureUrl] = useState("");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const FIXED_SIGNATURE_URL = "/signature_worawitl-removebg.png";

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        if (initialData.type === "type") {
          setActiveTab("type");
          setTypedName(initialData.text || "");
        } else {
          setActiveTab("draw");
          // Reset default
          setCurrentTool("pen");
          setBrushSize(2.5);
        }
      } else {
        setTypedName("");
        setActiveTab("draw");
        setCurrentTool("pen");
        setBrushSize(2.5);
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen && canvasContainerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]) {
          const { width, height } = entries[0].contentRect;
          setContainerSize({ width, height });
        }
      });
      resizeObserver.observe(canvasContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [isOpen]);

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    if (tabName === "draw" && sigPadRef.current) {
      sigPadRef.current.clear();
      setCurrentTool("pen");
      setBrushSize(2.5);
    }
  };

  // --- ✅ ฟังก์ชันเปลี่ยนเครื่องมือ ---
  const handleToolChange = (tool) => {
    setCurrentTool(tool);
    // ตั้งค่าขนาดเริ่มต้นให้เหมาะสมกับเครื่องมือ
    if (tool === "whiteout") {
      setBrushSize(15); // ลบคำผิดควรเส้นใหญ่
    } else {
      setBrushSize(2.5); // ปากกาควรเส้นเล็ก
    }
  };

  // ... (Logic วาดข้อความ type mode เหมือนเดิม) ...
  useEffect(() => {
    if (activeTab === "type" && typedName) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const fontSize = 40;
      const lineHeight = fontSize * 1.5;
      const lines = typedName.split("\n");
      ctx.font = `normal ${fontSize}px ${typedSignatureFont}`;
      let maxWidth = 0;
      lines.forEach((line) => {
        const metrics = ctx.measureText(line);
        if (metrics.width > maxWidth) maxWidth = metrics.width;
      });
      canvas.width = Math.max(600, maxWidth + 100);
      canvas.height = Math.max(200, lines.length * lineHeight + 60);
      ctx.font = `normal ${fontSize}px ${typedSignatureFont}`;
      ctx.fillStyle = "blue";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const totalTextHeight = lines.length * lineHeight;
      const startY = (canvas.height - totalTextHeight) / 2;
      const startX = (canvas.width - maxWidth) / 2;
      lines.forEach((line, index) => {
        ctx.fillText(line, startX, startY + index * lineHeight);
      });
      setTypedSignatureUrl(canvas.toDataURL("image/png"));
    }
  }, [typedName, activeTab, typedSignatureFont]);

  const handleClear = () => {
    if (activeTab === "draw") {
      sigPadRef.current.clear();
      // ไม่ต้อง reset tool ก็ได้ ให้ใช้ tool เดิมต่อ
    } else if (activeTab === "type") {
      setTypedName("");
    }
  };

  const handleSave = () => {
    let signatureData = null;
    let textData = null;

    if (activeTab === "draw") {
      if (sigPadRef.current.isEmpty()) return alert("Please draw a signature.");
      signatureData = sigPadRef.current.toDataURL("image/png");
    } else if (activeTab === "type") {
      if (!typedName) return alert("Please type your text.");
      signatureData = typedSignatureUrl;
      textData = typedName;
    } else if (activeTab === "fixed") {
      signatureData = FIXED_SIGNATURE_URL;
    }

    onSave({
      image: signatureData,
      type: activeTab,
      text: textData,
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onSave({ image: event.target.result, type: "upload" });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Signature" : "Provide Your Signature"}
    >
      <div className="signature-tabs">
        <button
          onClick={() => handleTabClick("draw")}
          className={activeTab === "draw" ? "active" : ""}
        >
          Draw
        </button>
        <button
          onClick={() => handleTabClick("type")}
          className={activeTab === "type" ? "active" : ""}
        >
          Type
        </button>
        <button
          onClick={() => handleTabClick("fixed")}
          className={activeTab === "fixed" ? "active" : ""}
        >
          ลายเซ็น ผส.วขตป.(FIX)
        </button>
        <button onClick={triggerFileUpload} className="upload-tab-btn">
          Upload
        </button>
      </div>

      {activeTab === "draw" && (
        <>
          {/* --- ✅ Toolbar พร้อมตัวปรับขนาด --- */}
          <div className="draw-toolbar">
            <div className="tool-group">
              <button
                className={`tool-btn ${currentTool === "pen" ? "active" : ""}`}
                onClick={() => handleToolChange("pen")}
                title="ปากกาสีดำ"
              >
                <FiPenTool /> ปากกา
              </button>
              <button
                className={`tool-btn ${
                  currentTool === "whiteout" ? "active" : ""
                }`}
                onClick={() => handleToolChange("whiteout")}
                title="น้ำยาลบคำผิด (ระบายสีขาว)"
              >
                <span className="color-dot white"></span> ลบคำผิด
              </button>
            </div>

            {/* --- ✅ Slider ปรับขนาด --- */}
            <div className="size-control-group">
              <span className="size-label">ขนาด: {brushSize}px</span>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="size-slider"
              />
            </div>
            {/* ------------------------- */}

            <button
              onClick={handleClear}
              className="tool-btn clear-tool"
              title="ล้างกระดาน"
            >
              <FiRefreshCw /> ล้าง
            </button>
          </div>

          <div className="signature-pad-container" ref={canvasContainerRef}>
            {containerSize.width > 0 && (
              <SignatureCanvas
                ref={sigPadRef}
                // กำหนดสีตามเครื่องมือ
                penColor={currentTool === "whiteout" ? "white" : "black"}
                // ✅ กำหนดขนาดเส้นตาม State (ใช้ min/max เท่ากันเพื่อให้เส้นสม่ำเสมอ)
                minWidth={brushSize}
                maxWidth={brushSize}
                dotSize={brushSize}
                canvasProps={{
                  width: containerSize.width,
                  height: containerSize.height,
                  className: "signature-canvas",
                }}
              />
            )}
          </div>
          <p className="draw-hint">
            {currentTool === "whiteout"
              ? "💡 ใช้ระบายทับส่วนที่ต้องการลบ (สีขาวจะบังข้อความเดิม)"
              : "💡 เซ็นชื่อลงในกรอบ"}
          </p>
        </>
      )}

      {activeTab === "type" && (
        <div className="type-signature-container">
          <textarea
            className="type-signature-input"
            placeholder="Type your text here... (e.g. เรียน ..., อนุมัติ)"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            rows={5}
            style={{ whiteSpace: "pre-wrap" }}
          />
          {typedName && (
            <div className="type-signature-preview">
              <img src={typedSignatureUrl} alt="Signature preview" />
            </div>
          )}
        </div>
      )}

      {activeTab === "fixed" && (
        <div className="fixed-signature-info">
          <p>Using the following fixed signature:</p>
          <div className="fixed-signature-preview">
            <img
              src={FIXED_SIGNATURE_URL}
              alt="Fixed Signature Preview"
              style={{ maxWidth: "100%", maxHeight: "50px" }}
            />
          </div>
        </div>
      )}

      <div className="signature-actions">
        {activeTab !== "draw" && (
          <button onClick={handleClear} className="btn-clear">
            Clear
          </button>
        )}
        <button onClick={handleSave} className="btn-save">
          {initialData ? "Update Signature" : "Save Signature"}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleImageUpload}
        accept="image/png, image/jpeg"
      />
    </Modal>
  );
}

export default SignatureModal;
