// frontend/src/components/NotificationIcon.jsx
import React from 'react';
import { FiCheckCircle, FiInbox, FiThumbsUp, FiFileText } from 'react-icons/fi';
import './NotificationIcon.css';

function NotificationIcon({ message }) {
  let icon = <FiInbox />;
  let colorClass = 'default';

  if (message.toLowerCase().includes('new')) {
    icon = <FiInbox />;
    colorClass = 'new-task';
  } else if (message.toLowerCase().includes('successfully approved')) {
    icon = <FiThumbsUp />;
    colorClass = 'approved';
  } else if (message.toLowerCase().includes('advanced')) {
    icon = <FiCheckCircle />;
    colorClass = 'advanced';
  } else if (message.toLowerCase().includes('fully approved')) {
    icon = <FiCheckCircle />;
    colorClass = 'completed';
  }

  return (
    <div className={`notification-icon-container ${colorClass}`}>
      {icon}
    </div>
  );
}

export default NotificationIcon;