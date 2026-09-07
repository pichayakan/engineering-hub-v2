// frontend/src/components/EditEventModal.jsx
import React, { useState, useEffect } from "react";
import Select from "react-select";
import apiClient from "../api";
import "./EditEventModal.css";

function EditEventModal({
  event,
  isOpen,
  onClose,
  onEventUpdated,
  onDeleteEvent,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const response = await apiClient.get("/api/auth/users/");
          setAllUsers(response.data);
        } catch (error) {
          console.error("Failed to fetch users", error);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  const userOptions = allUsers.map((user) => ({
    value: user.id,
    label: `${user.first_name || user.username} ${user.last_name || ""} (${user.username})`,
  }));

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      const toLocalISOString = (dateStr) =>
        new Date(
          new Date(dateStr).getTime() - new Date().getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16);
      setStartTime(toLocalISOString(event.start_time));
      setEndTime(toLocalISOString(event.end_time));

      const currentParticipants = (event.participants_details || []).map(
        (p) => ({
          value: p.id,
          label: `${p.first_name || p.username} ${p.last_name || ""} (${p.username})`,
        }),
      );
      setParticipants(currentParticipants);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const participantIds = participants.map((p) => p.value);
    try {
      await onEventUpdated({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        participants: participantIds,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update event", error);
      alert("ไม่สามารถแก้ไขนัดหมายได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm("คุณต้องการลบนัดหมายนี้ใช่หรือไม่?")) {
      onDeleteEvent(event.id);
    }
  };

  return (
    <div className="edit-event-overlay" onClick={onClose}>
      <div className="edit-event-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-event-header">
          <h2>✏️ แก้ไขนัดหมาย</h2>
          <button className="edit-event-close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-event-form">
          <div className="edit-event-body-scrollable">
            <div className="edit-event-form-group">
              <label htmlFor="editEventTitle">
                ชื่อกิจกรรม / เรื่องนัดหมาย *
              </label>
              <input
                id="editEventTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="edit-event-form-group">
              <label htmlFor="editStartTime">เวลาเริ่ม *</label>
              <input
                id="editStartTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="edit-event-form-group">
              <label htmlFor="editEndTime">เวลาสิ้นสุด *</label>
              <input
                id="editEndTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>

            <div className="edit-event-form-group">
              <label htmlFor="editEventDescription">รายละเอียดเพิ่มเติม</label>
              <textarea
                id="editEventDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="edit-event-form-group">
              <label htmlFor="editParticipants">ผู้เข้าร่วม</label>
              <Select
                id="editParticipants"
                isMulti
                options={userOptions}
                placeholder="ค้นหาและเลือกผู้เข้าร่วม..."
                className="multi-select-container"
                classNamePrefix="multi-select"
                value={participants}
                onChange={setParticipants}
              />
            </div>
          </div>

          <div className="edit-event-footer">
            <button
              type="button"
              className="edit-event-delete-button"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              🗑️ ลบนัดหมาย
            </button>
            <div className="edit-event-footer-right">
              <button
                type="button"
                className="edit-event-cancel-button"
                onClick={onClose}
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="edit-event-submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditEventModal;
