// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api";

// --- Import FullCalendar and its plugins ---
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// --- Import Components ---
import AddEventModal from "../components/AddEventModal.jsx";
import EventDetailModal from "../components/EventDetailModal.jsx";
import EditEventModal from "../components/EditEventModal.jsx";

// --- Import CSS for the page ---
import "./HomePage.css";

// ===================================================================
// --- Widget Components (defined in the same file for simplicity) ---
// ===================================================================

function AnnouncementsWidget({ announcements }) {
  return (
    <div className="widget">
      <div className="widget-header">
        <h3 className="widget-title">📢 Announcements</h3>
      </div>
      <div className="widget-content announcement-list">
        {announcements && announcements.length > 0 ? (
          announcements.map((item) => (
            <div key={item.id} className="announcement-item">
              <p className="announcement-title">{item.title}</p>
              <p className="announcement-meta">
                by {item.author_details?.username || "N/A"} on{" "}
                {new Date(item.created_at).toLocaleDateString()}
              </p>
              <div className="announcement-attachments">
                {item.attachments?.map((att) => (
                  <a
                    key={att.id}
                    href={att.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-link"
                  >
                    📎 {att.name}
                  </a>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p>No recent announcements.</p>
        )}
      </div>
    </div>
  );
}

// --- Widget ใหม่สำหรับ Recently Completed Tasks ที่มี Slider ---
function CompletedTasksWidget({ tasks }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const tasksPerPage = 3;
  const totalPages = tasks ? Math.ceil(tasks.length / tasksPerPage) : 0;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < totalPages - 1 ? prev + 1 : prev));
  };

  return (
    <div className="widget">
      <div className="widget-header">
        <h3 className="widget-title">✅ Recently Completed Tasks</h3>
        <div className="widget-header-actions">
          <Link to="/tasks/all">View All</Link>
        </div>
      </div>
      <div className="widget-content">
        <div className="slider-container">
          <div className="slider-track-wrapper">
            <div
              className="slider-track"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {Array.from({ length: totalPages }).map((_, pageIndex) => (
                <div key={pageIndex} className="slider-item">
                  <div className="file-card-group">
                    {tasks
                      .slice(
                        pageIndex * tasksPerPage,
                        (pageIndex + 1) * tasksPerPage
                      )
                      .map((task) => (
                        <div key={task.id} className="file-card">
                          <Link
                            to={`/projects/${task.project}`}
                            className="file-title"
                          >
                            {task.title}
                          </Link>
                          <p className="file-meta">
                            In Project: {task.project_name || "N/A"}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {totalPages > 1 && (
            <div className="slider-nav">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="slider-nav-button"
              >
                ‹
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === totalPages - 1}
                className="slider-nav-button"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentFilesWidget({ files }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const filesPerPage = 3;
  const totalPages = files ? Math.ceil(files.length / filesPerPage) : 0;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < totalPages - 1 ? prev + 1 : prev));
  };

  return (
    <div className="widget">
      <div className="widget-header">
        <h3 className="widget-title">📁 Recent Shared Files</h3>
        <div className="widget-header-actions">
          <Link to="/share">View All</Link>
        </div>
      </div>
      <div className="widget-content">
        <div className="slider-container">
          <div className="slider-track-wrapper">
            <div
              className="slider-track"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {Array.from({ length: totalPages }).map((_, pageIndex) => (
                <div key={pageIndex} className="slider-item">
                  <div className="file-card-group">
                    {files
                      .slice(
                        pageIndex * filesPerPage,
                        (pageIndex + 1) * filesPerPage
                      )
                      .map((file) => (
                        <div key={file.id} className="file-card">
                          {file.category_details && (
                            <span className="file-category-badge">
                              {file.category_details.name}
                            </span>
                          )}
                          <a
                            href={file.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-title"
                          >
                            {file.title}
                          </a>
                          <p className="file-meta">
                            Uploaded by{" "}
                            {file.uploaded_by_details?.username || "N/A"} on{" "}
                            {new Date(file.uploaded_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {totalPages > 1 && (
            <div className="slider-nav">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="slider-nav-button"
              >
                ‹
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === totalPages - 1}
                className="slider-nav-button"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarWidget({ events, tasks, onDateClick, onEventClick }) {
  const now = new Date();
  const calendarEvents = [
    ...(events || []).map((e) => ({
      id: `event-${e.id}`,
      title: e.title,
      start: e.start_time,
      end: e.end_time,
      backgroundColor: new Date(e.end_time) < now ? "#6c757d" : "#d9534f",
      borderColor: new Date(e.end_time) < now ? "#6c757d" : "#d9534f",
      extendedProps: { type: "event", originalEvent: e },
    })),
    ...(tasks || [])
      .filter((t) => t.due_date)
      .map((t) => {
        const dueDate = new Date(t.due_date);
        dueDate.setHours(23, 59, 59, 999);
        const isOverdue = dueDate < now && t.status !== "Done";
        return {
          id: `task-${t.id}`,
          title: `Due: ${t.title}`,
          start: t.due_date,
          allDay: true,
          backgroundColor: isOverdue ? "#8B0000" : "#f0ad4e",
          borderColor: isOverdue ? "#8B0000" : "#f0ad4e",
          url: `/projects/${t.project}`,
        };
      }),
  ];

  return (
    <div className="widget calendar-widget">
      <div
        className="widget-content"
        style={{ padding: "0.5rem", height: "75vh" }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,addEventButton",
          }}
          customButtons={{
            addEventButton: {
              text: "+ Add Event",
              click: () => onDateClick({ dateStr: new Date().toISOString() }),
            },
          }}
          events={calendarEvents}
          height="100%"
          eventDisplay="block"
          dateClick={onDateClick}
          eventClick={onEventClick}
          displayEventTime={false}
        />
      </div>
    </div>
  );
}

// ===================================================================
// --- Main Page Component ---
// ===================================================================

function HomePage() {
  const [data, setData] = useState({
    announcements: [],
    events: [],
    recentFiles: [],
    completedTasks: [],
    myTasks: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [
        announcementsRes,
        eventsRes,
        filesRes,
        completedTasksRes,
        myTasksRes,
      ] = await Promise.all([
        apiClient.get("/api/announcements/"),
        apiClient.get("/api/events/"),
        apiClient.get("/api/recent-files/"),
        apiClient.get("/api/recently-completed-tasks/"),
        apiClient.get("/api/my-tasks/"),
      ]);
      setData({
        announcements: announcementsRes.data.results || announcementsRes.data,
        events: eventsRes.data.results || eventsRes.data,
        recentFiles: filesRes.data,
        completedTasks: completedTasksRes.data,
        myTasks: myTasksRes.data,
      });
    } catch (error) {
      console.error("Failed to load dashboard hub data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAllData();
  }, [fetchAllData]);

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    setIsAddEventModalOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    if (clickInfo.event.extendedProps.type === "event") {
      clickInfo.jsEvent.preventDefault();
      setViewingEvent(clickInfo.event.extendedProps.originalEvent);
    }
  };

  const handleEventChange = () => {
    fetchAllData();
  };

  if (loading) return <div>Loading Home Hub...</div>;

  return (
    <>
      <div className="home-dashboard-layout">
        <CalendarWidget
          events={data.events}
          tasks={data.myTasks}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
        <AnnouncementsWidget announcements={data.announcements} />
        <CompletedTasksWidget tasks={data.completedTasks} />
        <RecentFilesWidget files={data.recentFiles} />
      </div>

      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onEventAdded={handleEventChange}
        initialDate={selectedDate}
      />
      <EventDetailModal
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={(eventToEdit) => {
          setViewingEvent(null);
          setEditingEvent(eventToEdit);
        }}
        onDelete={handleEventChange}
      />
      <EditEventModal
        isOpen={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onEventUpdated={handleEventChange}
        onDeleteEvent={handleEventChange}
      />
    </>
  );
}

export default HomePage;
