// frontend/src/pages/SystemLogsPage.jsx
import React, { useState, useEffect } from "react";
import apiClient from "../api";
import { formatDate } from "../utils/formatDate";
import "./SystemLogsPage.css";

const LogLevelBadge = ({ level }) => {
  return <span className={`log-badge log-level-${level}`}>{level}</span>;
};

function SystemLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/api/logs/");
        setLogs(response.data.results || []);
      } catch (error) {
        console.error("Failed to fetch logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <div>Loading logs...</div>;

  return (
    <div className="logs-container">
      <div className="page-header">
        <h1>System Logs</h1>
      </div>
      <div className="logs-table-wrapper">
        <table className="logs-table">
          <thead>
            <tr>
              <th style={{ width: "10%" }}>Level</th>
              <th>Message</th>
              <th style={{ width: "15%" }}>User</th>
              <th style={{ width: "20%" }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  <LogLevelBadge level={log.level} />
                </td>
                <td className="log-message">{log.message}</td>
                <td>{log.user?.username || "System"}</td>
                <td>{formatDate(log.timestamp, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SystemLogsPage;
