// frontend/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api'

// --- Import FullCalendar and its plugins ---
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

// --- Import Components ---
import AddEventModal from '../components/AddEventModal.jsx'
import EventDetailModal from '../components/EventDetailModal.jsx'
import EditEventModal from '../components/EditEventModal.jsx' // <-- เพิ่ม import ที่ขาดหายไป

// --- Import CSS for the page ---
import './HomePage.css'

// ===================================================================
// --- Widget Components (defined in the same file for simplicity) ---
// ===================================================================

function AnnouncementsWidget({ announcements }) {
  return (
    <div className='widget'>
      <div className='widget-header'>
        <h3 className='widget-title'>📢 Announcements</h3>
      </div>
      <div className='widget-content announcement-list'>
        {announcements && announcements.length > 0 ? (
          announcements.map((item) => (
            <div key={item.id} className='announcement-item'>
              <p className='announcement-title'>{item.title}</p>
              <p className='announcement-meta'>
                by {item.author_details?.username || 'N/A'} on{' '}
                {new Date(item.created_at).toLocaleDateString()}
              </p>
              <div className='announcement-attachments'>
                {item.attachments?.map((att) => (
                  <a
                    key={att.id}
                    href={att.file}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='attachment-link'
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
  )
}

function QuickAccessWidget({ title, items, icon, isFile = false }) {
  return (
    <div className='widget'>
      <div className='widget-header'>
        <h3 className='widget-title'>
          {icon} {title}
        </h3>
      </div>
      <div className='widget-content'>
        <ul className='quick-access-list'>
          {items && items.length > 0 ? (
            items.map((item) => (
              <li key={item.id}>
                <a
                  href={isFile ? item.file : `/projects/${item.project}`}
                  target={isFile ? '_blank' : '_self'}
                  rel='noopener noreferrer'
                >
                  {item.title || item.name}
                </a>
              </li>
            ))
          ) : (
            <p>No items to display.</p>
          )}
        </ul>
      </div>
    </div>
  )
}

function CalendarWidget({ events, tasks, onDateClick, onEventClick }) {
  const now = new Date()

  const calendarEvents = [
    ...(events || []).map((e) => {
      const isOverdue = new Date(e.end_time) < now
      return {
        id: `event-${e.id}`,
        title: e.title,
        start: e.start_time,
        end: e.end_time,
        backgroundColor: isOverdue ? '#6c757d' : '#d9534f', // สีเทาสำหรับ event ที่เลยกำหนด
        borderColor: isOverdue ? '#6c757d' : '#d9534f',
        extendedProps: { type: 'event', originalEvent: e },
      }
    }),
    ...(tasks || [])
      .filter((t) => t.due_date)
      .map((t) => {
        // สร้าง object วันที่โดยไม่สนใจเวลา เพื่อการเปรียบเทียบที่แม่นยำ
        const dueDate = new Date(t.due_date)
        dueDate.setHours(23, 59, 59, 999) // กำหนดให้ due date คือสิ้นสุดของวันนั้น
        const isOverdue = dueDate < now && t.status !== 'Done'
        return {
          id: `task-${t.id}`,
          title: `Due: ${t.title}`,
          start: t.due_date,
          allDay: true,
          backgroundColor: isOverdue ? '#8B0000' : '#f0ad4e', // สีแดงเข้มสำหรับ task ที่เลยกำหนด
          borderColor: isOverdue ? '#8B0000' : '#f0ad4e',
          url: `/projects/${t.project}`,
        }
      }),
  ]

  return (
    <div className='widget calendar-widget'>
      <div
        className='widget-content'
        style={{ padding: '0.5rem', height: '75vh' }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView='dayGridMonth'
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,addEventButton',
          }}
          customButtons={{
            addEventButton: {
              text: '+ Add Event',
              click: () => onDateClick({ dateStr: new Date().toISOString() }),
            },
          }}
          events={calendarEvents}
          height='100%'
          eventDisplay='block'
          dateClick={onDateClick}
          eventClick={onEventClick}
          displayEventTime={false}
        />
      </div>
    </div>
  )
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
  })
  const [loading, setLoading] = useState(true)
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewingEvent, setViewingEvent] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)

  const fetchAllData = useCallback(async () => {
    // We don't set loading here to allow for smoother background refreshes
    try {
      const [
        announcementsRes,
        eventsRes,
        filesRes,
        completedTasksRes,
        myTasksRes,
      ] = await Promise.all([
        apiClient.get('/api/announcements/'),
        apiClient.get('/api/events/'),
        apiClient.get('/api/recent-files/'),
        apiClient.get('/api/recently-completed-tasks/'),
        apiClient.get('/api/my-tasks/'),
      ])
      setData({
        announcements: announcementsRes.data.results || announcementsRes.data,
        events: eventsRes.data.results || eventsRes.data,
        recentFiles: filesRes.data,
        completedTasks: completedTasksRes.data,
        myTasks: myTasksRes.data,
      })
    } catch (error) {
      console.error('Failed to load dashboard hub data', error)
    } finally {
      setLoading(false) // This will only be set to false once
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAllData()
  }, [fetchAllData])

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr)
    setIsAddEventModalOpen(true)
  }

  const handleEventClick = (clickInfo) => {
    if (clickInfo.event.extendedProps.type === 'event') {
      clickInfo.jsEvent.preventDefault() // Prevent navigation for task URLs
      setViewingEvent(clickInfo.event.extendedProps.originalEvent)
    }
  }

  const handleEventAdded = () => {
    fetchAllData() // Refresh all data after adding a new event
  }

  const handleEventUpdated = async (updatedData) => {
    try {
      await apiClient.put(`/api/events/${editingEvent.id}/`, updatedData)
      setEditingEvent(null)
      fetchAllData()
    } catch (error) {
      console.error('Failed to update event', error)
      alert('Could not update event.')
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await apiClient.delete(`/api/events/${eventId}/`)
        setViewingEvent(null)
        setEditingEvent(null)
        fetchAllData()
      } catch (error) {
        console.error('Failed to delete event', error)
        alert('Could not delete event.')
      }
    }
  }

  if (loading) return <div>Loading Home Hub...</div>

  return (
    <>
      <div className='home-dashboard-layout'>
        <CalendarWidget
          events={data.events}
          tasks={data.myTasks}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
        <AnnouncementsWidget announcements={data.announcements} />
        <QuickAccessWidget
          title='Recently Completed Tasks'
          items={data.completedTasks}
          icon='✅'
        />
        <QuickAccessWidget
          title='Recent Shared Files'
          items={data.recentFiles}
          icon='📁'
          isFile={true}
        />
      </div>

      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onEventAdded={handleEventAdded}
        initialDate={selectedDate}
      />
      <EventDetailModal
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        onEdit={(eventToEdit) => {
          setViewingEvent(null)
          setEditingEvent(eventToEdit)
        }}
        onDelete={handleDeleteEvent}
      />
      <EditEventModal
        isOpen={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onEventUpdated={handleEventUpdated}
        onDeleteEvent={handleDeleteEvent}
      />
    </>
  )
}

export default HomePage
