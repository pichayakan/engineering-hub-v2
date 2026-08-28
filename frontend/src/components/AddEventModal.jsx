// frontend/src/components/AddEventModal.jsx
import React, { useState, useEffect } from "react";
import Select from "react-select";
import apiClient from "../api";
import "./AddProject.css";
import "./EditTaskModal.css";
import "./MultiSelect.css";
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
          setAllUsers(response.data);
        } catch (error) {
          console.error("Failed to fetch users", error);
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

  const userOptions = allUsers.map((user) => ({
    value: user.id,
    label: `${user.first_name} ${user.last_name} (${user.username})`,
  }));

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const participantIds = participants.map((p) => p.value);

    const eventData = {
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      participants: participantIds,
    };
    console.log("DEBUG 1: Data being sent from AddEventModal:", eventData);

    try {
      await onEventAdded(eventData);
      onClose();
    } catch (error) {
      console.error("Event creation failed in modal", error);
    } finally {
      setIsSubmitting(false);
    }

    try {
      const eventResponse = await apiClient.post("/api/events/", {
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        participants: participantIds,
      });
      const newEventId = eventResponse.data.id;

      if (files.length > 0) {
        const uploadPromises = Array.from(files).map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          return apiClient.post(
            `/api/events/${newEventId}/attachments/`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
        });
        await Promise.all(uploadPromises);
      }

      //-- เคลียร์ State ของฟอร์ม ---
      setTitle("");
      setDescription("");
      setParticipants([]);
      setFiles([]);

      onEventAdded();
      onClose();
    } catch (error) {
      console.error("Event creation failed", error);
      alert("Could not create the event. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        <div
          className="form-card"
          style={{ margin: 0, padding: 0, border: "none", boxShadow: "none" }}
        >
          <form onSubmit={handleSubmit}>
            <h2>Create New Event</h2>
            <div className="form-group">
              <label htmlFor="eventTitle">Event Title</label>
              <input
                id="eventTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="eventDescription">Description</label>
              <textarea
                id="eventDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="startTime">Start Time</label>
              <input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="endTime">End Time</label>
              <input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="participants">Participants</label>
              <Select
                id="participants"
                isMulti
                options={userOptions}
                className="multi-select-container"
                classNamePrefix="multi-select"
                value={participants}
                onChange={setParticipants}
              />
            </div>
            <div className="form-group">
              <label htmlFor="eventAttachments">Attach Files</label>
              <input
                id="eventAttachments"
                type="file"
                multiple
                onChange={handleFileChange}
                className="upload-input"
              />
            </div>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Event"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddEventModal;
