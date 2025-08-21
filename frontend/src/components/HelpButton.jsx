// frontend/src/components/HelpButton.jsx
import React, { useState } from "react";
import { FiHelpCircle, FiX } from "react-icons/fi"; // Import FiX for the close button
import "./HelpButton.css";
import lineQrCode from "../assets/151btwzd.png"; // ✅ IMPORT YOUR QR CODE IMAGE

function HelpButton() {
  // ✅ State to control the tooltip visibility
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Your Line OA link
  const lineOaLink = "https://line.me/R/ti/p/@151btwzd"; // 👈 REPLACE WITH YOUR ACTUAL LINK

  return (
    <div className="help-button-container">
      {/* --- ✅ The tooltip is now controlled by state --- */}
      <div className={`help-tooltip ${isOpen ? "is-visible" : ""}`}>
        <div className="tooltip-header">
          <strong>สอบถาม/แจ้งปัญหา</strong>
          <FiX className="tooltip-close" onClick={() => setIsOpen(false)} />
        </div>
        <div className="tooltip-body">
          <p>Admin: คุณพิชญกานต์ (วขตป.)</p>
          <p>Tel: 086-4501093</p>
          <div className="line-section">
            <img
              src={lineQrCode}
              alt="Line OA QR Code"
              className="line-qr-code"
            />
            <a
              href={lineOaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="line-add-button"
            >
              Add Friend on Line
            </a>
          </div>
        </div>
      </div>

      {/* --- ✅ Main button now toggles the state --- */}
      <div className="help-icon-wrapper" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FiX /> : <FiHelpCircle />}
      </div>
    </div>
  );
}

export default HelpButton;
