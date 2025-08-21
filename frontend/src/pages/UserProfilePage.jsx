// frontend/src/pages/UserProfilePage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api";
import "./UserProfilePage.css";
import { FiBriefcase, FiUsers, FiCreditCard, FiPhone } from "react-icons/fi";

function UserProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { userId } = useParams();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/api/auth/profile/${userId}/`);
        setProfile(response.data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (loading) return <div>Loading profile...</div>;
  if (!profile) return <div>Could not load user profile.</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>
          {profile.first_name} {profile.last_name}
        </h1>
        <p className="profile-username">
          @{profile.username} | {profile.email}
        </p>

        <div className="profile-meta-grid">
          <div className="meta-item">
            <h4>
              <FiCreditCard /> Employee ID
            </h4>
            <p className="meta-content">{profile.employee_id || "N/A"}</p>
          </div>
          <div className="meta-item">
            <h4>
              <FiPhone /> Phone Number
            </h4>
            <p className="meta-content">{profile.phone_number || "N/A"}</p>
          </div>
          <div className="meta-item">
            <h4>
              <FiBriefcase /> Department
            </h4>
            <p className="meta-content">{profile.department_name || "N/A"}</p>
          </div>
          <div className="meta-item">
            <h4>
              <FiUsers /> Responsible Groups
            </h4>
            <div className="profile-groups">
              {profile.groups.length > 0 ? (
                profile.groups.map((group) => (
                  <span key={group.id} className="group-tag">
                    {group.name}
                  </span>
                ))
              ) : (
                <p className="meta-content-subtle">
                  Not a member of any groups.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h2>Workflows Created ({profile.created_workflows.length})</h2>
        <div className="work-list">
          {profile.created_workflows.length > 0 ? (
            profile.created_workflows.map((wf) => (
              <div className="work-item" key={wf.id}>
                <Link to={`/workflows/${wf.id}`}>{wf.title}</Link>
                <span className="work-date">
                  Created on {new Date(wf.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <p>This user has not created any workflows.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfilePage;
