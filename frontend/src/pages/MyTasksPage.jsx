// frontend/src/pages/MyTasksPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { useAuth } from '../context/AuthContext';
import './MyTasksPage.css';
import NotificationIcon from '../components/NotificationIcon';

// --- ✅ ADDED: Helper function to group notifications by date ---
const groupNotificationsByDate = (notifications) => {
  const groups = {
    Today: [],
    Yesterday: [],
    Older: [],
  };

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  notifications.forEach(noti => {
    const notiDate = new Date(noti.created_at);
    if (notiDate.toDateString() === today.toDateString()) {
      groups.Today.push(noti);
    } else if (notiDate.toDateString() === yesterday.toDateString()) {
      groups.Yesterday.push(noti);
    } else {
      groups.Older.push(noti);
    }
  });

  return groups;
};

function MyTasksPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { fetchUnseenTaskCount } = useAuth();
  const navigate = useNavigate();

  // ✅ Fetch notifications without marking them as read automatically
  useEffect(() => {
    const getNotifications = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get('/api/notifications/');
        setNotifications(response.data.results || []);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      } finally {
        setLoading(false);
      }
    };
    getNotifications();
  }, []);

  // ✅ This function now marks the specific notification as read
  const handleNotificationClick = async (notification) => {
    // Mark as read on the backend if it's currently unread
    if (!notification.is_read) {
      try {
        await apiClient.post(`/api/notifications/${notification.id}/mark_as_read/`);

        // Update the state locally for instant visual feedback
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        // Refresh the badge count in the sidebar
        fetchUnseenTaskCount();
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
    }

    // Navigate to the link associated with the notification
    if (notification.link) {
      navigate(notification.link);
    }
  };

  if (loading) return <div>Loading tasks...</div>;

  const groupedNotifications = groupNotificationsByDate(notifications);

  return (
    <div className="notifications-container">
      <div className="page-header">
        <h1>My Tasks & Notifications</h1>
      </div>

      {notifications.length > 0 ? (
        // ✅ Render the grouped notifications
        Object.entries(groupedNotifications).map(([groupName, notis]) => (
          notis.length > 0 && (
            <div key={groupName} className="notification-group">
              <h2 className="group-header">{groupName}</h2>
              <div className="notification-list">
                {notis.map(noti => (
                  <div
                    key={noti.id}
                    className={`notification-item ${noti.is_read ? 'is-read' : 'is-unread'}`}
                    onClick={() => handleNotificationClick(noti)}
                  >
                    <NotificationIcon message={noti.message} />
                    <div>
                      <p className="notification-message">{noti.message}</p>
                      <p className="notification-meta">
                        Received on: {new Date(noti.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))
      ) : (
        <p>You have no new notifications.</p>
      )}
    </div>
  );
}

export default MyTasksPage;