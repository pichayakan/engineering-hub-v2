// frontend/src/pages/ProcurementListPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api";
import SearchInput from "../components/SearchInput.jsx";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./AllTasksPage.css";
import "./ProcurementListPage.css";

function ProcurementListPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get("/api/procurement/categories/");
        setCategories(response.data.results || response.data);
      } catch (error) {
        console.error("Failed to fetch categories", error);
        toast.error("Could not load categories for filtering.");
      }
    };
    fetchCategories();
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        ordering: ordering,
      };
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      const response = await apiClient.get("/api/procurement/requests/", {
        params,
      });
      setRequests(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch procurement requests", error);
      toast.error(
        "Failed to fetch requests: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setLoading(false);
    }
  }, [searchTerm, ordering, selectedCategory]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRequests();
    }, 300);
    return () => clearTimeout(handler);
  }, [fetchRequests]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const calculateSLA = (dueDateStr) => {
    if (!dueDateStr) return { text: "-", className: "" };
    const today = new Date();
    const dueDate = new Date(dueDateStr);
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return {
        text: `Overdue ${Math.abs(diffDays)}d`,
        className: "sla-overdue",
      };
    if (diffDays === 0) return { text: "Due Today", className: "sla-due-soon" };
    return { text: `${diffDays}d left`, className: "sla-on-time" };
  };

  if (loading && requests.length === 0)
    return <div>Loading procurement requests...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>งานภายในส่วนงานวิศวกรรมฯ(วขตป.)</h1>
        <Link to="/procurement/new" className="create-request-btn">
          + Create New Request
        </Link>
      </div>
      <div className="list-controls">
        <SearchInput value={searchTerm} onChange={handleSearchChange} />
        <select
          className="sort-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Filter by: All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          className="sort-select"
          value={ordering}
          onChange={(e) => setOrdering(e.target.value)}
        >
          <option value="-created_at">Sort by: Newest First</option>
          <option value="created_at">Sort by: Oldest First</option>
          <option value="title">Sort by: Title (A-Z)</option>
          <option value="-title">Sort by: Title (Z-A)</option>
        </select>
      </div>
      <div className="tasks-table-wrapper">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Project</th>
              <th>Category</th>
              <th>Current Step</th>
              <th>SLA</th>
              <th>Created By</th>
              <th>Date Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map((req) => {
                const sla = calculateSLA(req.current_step_due_date);
                return (
                  <tr
                    key={req.id}
                    className={req.is_completed ? "is-completed" : ""}
                  >
                    {/* --- ✅ ADDED: data-label to all <td> tags --- */}
                    <td data-label="Title">
                      <Link
                        to={`/procurement/requests/${req.id}`}
                        className="task-title-link"
                      >
                        {req.title}
                      </Link>
                    </td>
                    <td data-label="Project">{req.project_name || "N/A"}</td>
                    <td data-label="Category">
                      <span className="category-badge">
                        {req.category_details?.name || "N/A"}
                      </span>
                    </td>
                    <td data-label="Current Step">
                      <span
                        className={`status-badge status-${
                          req.current_step_details?.name.replace(/\s+/g, "-") ||
                          "N-A"
                        }`}
                      >
                        {req.current_step_details?.name || "N/A"}
                      </span>
                    </td>
                    <td
                      data-label="SLA"
                      className={`sla-text ${sla.className}`}
                    >
                      {sla.text}
                    </td>
                    <td data-label="Created By">
                      {req.created_by_details?.username || "N/A"}
                    </td>
                    <td data-label="Date Created">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`status-badge ${
                          req.is_completed
                            ? "status-completed"
                            : "status-inprogress"
                        }`}
                      >
                        {req.is_completed ? "Completed" : "In Progress"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="8"
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  No procurement requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ToastContainer />
    </div>
  );
}

export default ProcurementListPage;
