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
  const [statusFilter, setStatusFilter] = useState("");

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

      if (statusFilter === 'completed') {
        params.is_completed = true;
      } else if (statusFilter === 'cancelled') {
        params.is_cancelled = true;
      } else if (statusFilter === 'inprogress') {
        params.is_completed = false;
        params.is_cancelled = false;
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
  }, [searchTerm, ordering, selectedCategory, statusFilter]);

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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Filter by: All Statuses</option>
          <option value="inprogress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
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

                // --- ✅ THIS IS THE FIX ---
                // Helper function to get status text and class
                const getStatus = () => {
                  if (req.is_cancelled) {
                    return { text: "Cancelled", className: "status-cancelled" };
                  }
                  if (req.is_completed) {
                    return { text: "Completed", className: "status-completed" };
                  }
                  return { text: "In Progress", className: "status-inprogress" };
                };
                const status = getStatus();

                return (
                  <tr
                    key={req.id}
                    // ✅ Apply a class for cancelled rows as well
                    className={req.is_completed ? "is-completed" : req.is_cancelled ? "is-cancelled" : ""}
                  >
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
                      {/* Show 'Cancelled' if applicable */}
                      <span
                        className={`status-badge status-${req.current_step_details?.name.replace(/\s+/g, "-") ||
                          "N-A"
                          }`}
                      >
                        {req.is_cancelled ? "---" : (req.current_step_details?.name || "N/A")}
                      </span>
                    </td>
                    <td data-label="SLA" className={`sla-text ${sla.className}`}>
                      {sla.text}
                    </td>
                    <td data-label="Created By">
                      {req.created_by_details?.username || "N/A"}
                    </td>
                    <td data-label="Date Created">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td data-label="Status">
                      {/* ✅ Use the new getStatus function */}
                      <span className={`status-badge ${status.className}`}>
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "2rem" }}>
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
