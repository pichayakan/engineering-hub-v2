// frontend/src/components/SignatureModal.jsx
import React, { useState, useRef, useEffect } from "react";
import Modal from "./Modal";
import SignatureCanvas from "react-signature-canvas";
import "./SignatureModal.css";

function SignatureModal({
  isOpen,
  onClose,
  onSave,
  typedSignatureFont = "'Sarabun', sans-serif",
  initialData = null, // ✅ 1. รับข้อมูลเริ่มต้น (ถ้ามี)
}) {
  const sigPadRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // ✅ 2. ตั้งค่าเริ่มต้นจาก initialData
  const [activeTab, setActiveTab] = useState(
    initialData?.type === "type" ? "type" : "draw"
  );
  const [typedName, setTypedName] = useState(
    initialData?.type === "type" ? initialData.text : ""
  );

  const [typedSignatureUrl, setTypedSignatureUrl] = useState("");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const FIXED_SIGNATURE_URL = "/signature_worawitl-removebg.png";

  // ✅ 3. Reset state เมื่อเปิด Modal ใหม่ หรือ initialData เปลี่ยน
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        if (initialData.type === "type") {
          setActiveTab("type");
          setTypedName(initialData.text || "");
        } else {
          setActiveTab("draw");
        }
      } else {
        // กรณีสร้างใหม่
        setTypedName("");
        setActiveTab("draw");
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
    }
  };

  // --- Logic วาดข้อความ (เหมือนเดิม) ---
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
    } else if (activeTab === "type") {
      setTypedName("");
    }
  };

  const handleSave = () => {
    let signatureData = null;
    let textData = null; // ✅ เก็บข้อความด้วย

    if (activeTab === "draw") {
      if (sigPadRef.current.isEmpty()) return alert("Please draw a signature.");
      signatureData = sigPadRef.current.toDataURL("image/png");
    } else if (activeTab === "type") {
      if (!typedName) return alert("Please type your text.");
      signatureData = typedSignatureUrl;
      textData = typedName; // ✅ เก็บข้อความที่พิมพ์
    } else if (activeTab === "fixed") {
      signatureData = FIXED_SIGNATURE_URL;
    }

    // ✅ ส่งกลับเป็น Object ที่มีข้อมูลครบถ้วน
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
      title={initialData ? "Edit Signature" : "Provide Your Signature"} // เปลี่ยน Title ตามสถานะ
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
        <div className="signature-pad-container" ref={canvasContainerRef}>
          {containerSize.width > 0 && (
            <SignatureCanvas
              ref={sigPadRef}
              penColor="black"
              canvasProps={{
                width: containerSize.width,
                height: containerSize.height,
                className: "signature-canvas",
              }}
            />
          )}
        </div>
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
        <button onClick={handleClear} className="btn-clear">
          Clear
        </button>
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
