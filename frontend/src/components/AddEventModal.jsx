// frontend/src/components/AddEventModal.jsx
import React, { useState, useEffect } from "react";
import Select from "react-select";
import apiClient from "../api";
import "./AddEventModal.css";

function AddEventModal({ isOpen, onClose, onEventAdded, initialDate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const response = await apiClient.get("/api/auth/users/");
          // 🟢 แก้ไขสกัดเอาเฉพาะ Array (รองรับทั้ง Paginated Response และ Array ปกติ)
          const userList = response.data.results || response.data || [];
          setAllUsers(Array.isArray(userList) ? userList : []);
        } catch (error) {
          console.error("Failed to fetch users", error);
          setAllUsers([]);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialDate) {
      const start = new Date(initialDate);
      start.setHours(8, 0, 0, 0);
      const end = new Date(initialDate);
      end.setHours(9, 0, 0, 0);
      const toLocalISOString = (date) =>
        new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      setStartTime(toLocalISOString(start));
      setEndTime(toLocalISOString(end));
    }
  }, [initialDate]);

  if (!isOpen) return null;

  // 🟢 แก้ไขบรรทัดที่ 48: ครอบเช็ค Array.isArray() ป้องกัน Error .map is not a function
  const userOptions = (Array.isArray(allUsers) ? allUsers : []).map((user) => ({
    value: user.id,
    label: `${user.first_name || user.username} ${user.last_name || ""} (${user.username})`,
  }));

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const participantIds = participants.map((p) => p.value);

    try {
      // 1. ยิง API สร้าง Event
      const eventResponse = await apiClient.post("/api/events/", {
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        participants: participantIds,
      });
      const newEventId = eventResponse.data.id;

      // 2. อัปโหลดไฟล์แนบ (ถ้ามี)
      if (files.length > 0) {
        const uploadPromises = Array.from(files).map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          return apiClient.post(
            `/api/events/${newEventId}/attachments/`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
        });
        await Promise.all(uploadPromises);
      }

      // 3. เคลียร์ Form State
      setTitle("");
      setDescription("");
      setParticipants([]);
      setFiles([]);

      // 4. แจ้ง Parent Component เพื่อรีเฟรชหน้าเว็บแล้วปิด Modal
      if (onEventAdded) {
        await onEventAdded(eventResponse.data);
      }
      onClose();
    } catch (error) {
      console.error("Event creation failed", error);
      alert("ไม่สามารถสร้างนัดหมายได้ กรุณาตรวจสอบข้อมูลอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📅 เพิ่มนัดหมายใหม่</h2>
          <button className="modal-close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body-scrollable">
            <div className="form-group">
              <label htmlFor="eventTitle">ชื่อกิจกรรม / เรื่องนัดหมาย *</label>
              <input
                id="eventTitle"
                type="text"
                placeholder="เช่น ประชุมสรุปงานประจำสัปดาห์"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* 2 Column Grid สำหรับวันที่เริ่ม - สิ้นสุด */}
            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="startTime">เวลาเริ่ม *</label>
                <input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endTime">เวลาสิ้นสุด *</label>
                <input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="eventDescription">รายละเอียดเพิ่มเติม</label>
              <textarea
                id="eventDescription"
                placeholder="ระบุห้องประชุม หรือรายละเอียดงาน..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="participants">ผู้เข้าร่วม</label>
              <Select
                id="participants"
                isMulti
                options={userOptions}
                placeholder="ค้นหาและเลือกผู้เข้าร่วม..."
                className="multi-select-container"
                classNamePrefix="multi-select"
                value={participants}
                onChange={setParticipants}
              />
            </div>

            <div className="form-group">
              <label htmlFor="eventAttachments">ไฟล์แนบประกอบ (ถ้ามี)</label>
              <input
                id="eventAttachments"
                type="file"
                multiple
                onChange={handleFileChange}
                className="upload-input"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกนัดหมาย"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEventModal;
