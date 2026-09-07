// frontend/src/components/EventDetailModal.jsx
import React from "react";
import "./EventDetailModal.css";
import { useAuth } from "../context/AuthContext";

function EventDetailModal({ event, onClose, onEdit, onDelete }) {
  const { user } = useAuth();

  if (!event) return null;

  const isCreator =
    user && event.created_by_details && user.id === event.created_by_details.id;

  const handleDelete = () => {
    if (window.confirm("คุณต้องการลบนัดหมายนี้ใช่หรือไม่?")) {
      onDelete(event.id);
    }
  };

  return (
    <div className="event-detail-overlay" onClick={onClose}>
      <div
        className="event-detail-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="event-detail-header">
          <h2>📌 รายละเอียดนัดหมาย</h2>
          <button className="event-detail-close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="event-detail-body-scrollable">
          <div className="event-title-section">
            <h3 className="event-title-text">{event.title}</h3>

            {isCreator && (
              <div className="event-action-buttons">
                <button
                  className="event-btn-edit"
                  onClick={() => onEdit(event)}
                >
                  ✏️ แก้ไข
                </button>
                <button className="event-btn-delete" onClick={handleDelete}>
                  🗑️ ลบ
                </button>
              </div>
            )}
          </div>

          <div className="event-time-badge">
            <p>
              <strong>🕒 เวลาเริ่ม:</strong>{" "}
              {new Date(event.start_time).toLocaleString("th-TH")}
            </p>
            <p>
              <strong>⌛ เวลาสิ้นสุด:</strong>{" "}
              {new Date(event.end_time).toLocaleString("th-TH")}
            </p>
          </div>

          <div className="event-info-box">
            <p>
              <strong>📝 รายละเอียด:</strong>
              <br />
              {event.description || "ไม่มีรายละเอียดเพิ่มเติม"}
            </p>
            <p style={{ marginTop: "0.8rem" }}>
              <strong>👥 ผู้เข้าร่วม:</strong>
              <br />
              {event.participants_details?.length > 0
                ? event.participants_details
                    .map(
                      (p) =>
                        `${p.first_name || p.username} ${p.last_name || ""}`,
                    )
                    .join(", ")
                : "ไม่มีผู้เข้าร่วม"}
            </p>
          </div>

          <div className="event-attachment-section">
            <h4>📎 ไฟล์แนบประกอบ</h4>
            {event.attachments?.length > 0 ? (
              <ul className="event-attachment-list">
                {event.attachments.map((att) => (
                  <li key={att.id} className="event-attachment-item">
                    <a
                      href={att.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="event-attachment-link"
                    >
                      📄 {att.name || "ดาวน์โหลดไฟล์แนบ"}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-attachments-text">ไม่มีไฟล์แนบ</p>
            )}
          </div>
        </div>

        <div className="event-detail-footer">
          <button className="event-close-btn-bottom" onClick={onClose}>
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventDetailModal;
