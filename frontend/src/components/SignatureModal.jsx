// frontend/src/components/SignatureModal.jsx
import React, { useRef } from "react";
import Modal from "./Modal";
import SignatureCanvas from "react-signature-canvas";
import "./SignatureModal.css";

function SignatureModal({ isOpen, onClose, onSave }) {
  const sigPadRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for the file input

  const handleClear = () => {
    sigPadRef.current.clear();
  };

  const handleSave = () => {
    if (sigPadRef.current.isEmpty()) {
      alert("Please provide a signature first.");
      return;
    }
    const signatureDataUrl = sigPadRef.current.toDataURL("image/png");
    onSave(signatureDataUrl);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Please Sign Here">
      <div className="signature-pad-container">
        <SignatureCanvas
          ref={sigPadRef}
          penColor="black"
          canvasProps={{ className: "signature-canvas" }}
        />
      </div>
      <div className="signature-actions">
        <div>
          {/* --- ✅ ADDED: Upload Button --- */}
          <button onClick={triggerFileUpload} className="btn-upload">
            Upload Image
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleImageUpload}
            accept="image/png, image/jpeg"
          />
        </div>
        <div>
          <button onClick={handleClear} className="btn-clear">
            Clear
          </button>
          <button onClick={handleSave} className="btn-save">
            Save Signature
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default SignatureModal;
