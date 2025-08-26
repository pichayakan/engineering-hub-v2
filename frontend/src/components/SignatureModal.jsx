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
}) {
  const sigPadRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for the file input

  const [activeTab, setActiveTab] = useState("draw");
  const [typedName, setTypedName] = useState("");
  const [typedSignatureUrl, setTypedSignatureUrl] = useState("");

  const FIXED_SIGNATURE_URL = "/worawitl_sign-removebg.png";

  useEffect(() => {
    if (activeTab === "type" && typedName) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 400;
      canvas.height = 100;
      ctx.font = `normal 40px ${typedSignatureFont}`;
      ctx.fillStyle = "blue";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
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
    if (activeTab === "draw") {
      if (sigPadRef.current.isEmpty()) return alert("Please draw a signature.");
      onSave(sigPadRef.current.toDataURL("image/png"));
    } else if (activeTab === "type") {
      if (!typedName) return alert("Please type your name.");
      onSave(typedSignatureUrl);
    } else if (activeTab === "fixed") {
      onSave(FIXED_SIGNATURE_URL);
    }
  };

  // --- ✅ ADDED: Handle image upload ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        // The result is a base64 Data URL, just like from the signature pad
        onSave(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provide Your Signature">
      {/* --- ✅ ADDED: Tab Buttons --- */}
      <div className="signature-tabs">
        <button
          onClick={() => setActiveTab("draw")}
          className={activeTab === "draw" ? "active" : ""}
        >
          Draw
        </button>
        <button
          onClick={() => setActiveTab("type")}
          className={activeTab === "type" ? "active" : ""}
        >
          Type
        </button>
        <button
          onClick={() => setActiveTab("fixed")}
          className={activeTab === "fixed" ? "active" : ""}
        >
          ลายเซ็น ผส.วขตป.(FIX)
        </button>
        <button onClick={triggerFileUpload} className="upload-tab-btn">
          Upload
        </button>
      </div>

      {/* --- ✅ MODIFIED: Conditionally render the correct input --- */}
      {activeTab === "draw" && (
        <div className="signature-pad-container">
          <SignatureCanvas
            ref={sigPadRef}
            penColor="black"
            canvasProps={{ className: "signature-canvas" }}
          />
        </div>
      )}

      {activeTab === "type" && (
        <div className="type-signature-container">
          <input
            type="text"
            className="type-signature-input"
            placeholder="Type your full name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
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
          Save Signature
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
