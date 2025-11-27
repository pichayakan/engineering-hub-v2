// frontend/src/pages/ProcurementListPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api";
import SearchInput from "../components/SearchInput.jsx";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./AllTasksPage.css";
import "./ProcurementListPage.css";
import { formatDate } from "../utils/formatDate";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

function ProcurementListPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- PAGINATION STATES ---
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [prevPageUrl, setPrevPageUrl] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10; // ต้องตรงกับ Backend (StandardResultsSetPagination)

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("-created_at");

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // --- 1. Fetch Filter Data (Categories & Departments) ---
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [catRes, deptRes] = await Promise.all([
          apiClient.get("/api/procurement/categories/"),
          apiClient.get("/api/auth/departments/"),
        ]);
        setCategories(catRes.data.results || catRes.data);
        setDepartments(deptRes.data.results || deptRes.data);
      } catch (error) {
        console.error("Failed to fetch filters", error);
        toast.error("Could not load filter options.");
      }
    };
    fetchFilters();
  }, []);

  // --- 2. Main Fetch Function ---
  const fetchRequests = useCallback(
    async (url = null) => {
      setLoading(true);
      try {
        let fetchUrl = url;
        let requestParams = {};

        // กรณีที่ 1: โหลดหน้าแรก หรือ เปลี่ยน Filter (url เป็น null)
        if (!url) {
          setCurrentPage(1); // รีเซ็ตไปหน้า 1
          fetchUrl = "/api/procurement/requests/";

          // สร้าง params ใหม่
          requestParams = {
            search: searchTerm,
            ordering: ordering,
          };

          if (selectedCategory) requestParams.category = selectedCategory;
          if (selectedDepartment)
            requestParams.requesting_department = selectedDepartment; // ✅ ส่งค่าแผนก

          if (statusFilter === "completed") requestParams.is_completed = true;
          else if (statusFilter === "cancelled")
            requestParams.is_cancelled = true;
          else if (statusFilter === "inprogress") {
            requestParams.is_completed = false;
            requestParams.is_cancelled = false;
          }
        }
        // กรณีที่ 2: กด Next/Prev (มี url ส่งมาแล้ว)
        else {
          // พยายามแกะเลขหน้าจาก URL เพื่อแสดงผล
          try {
            const urlObj = new URL(url);
            const pageParam = urlObj.searchParams.get("page");
            setCurrentPage(pageParam ? parseInt(pageParam) : 1);
          } catch {
            setCurrentPage(1);
          }
          // ไม่ต้อง set requestParams เพราะ URL มี query string ครบแล้ว
        }

        const response = await apiClient.get(fetchUrl, {
          params: requestParams,
        });

        setRequests(response.data.results);
        setNextPageUrl(response.data.next);
        setPrevPageUrl(response.data.previous);
        setTotalCount(response.data.count);
      } catch (error) {
        console.error("Failed to fetch procurement requests", error);
        toast.error(
          "Failed to fetch requests: " +
            (error.response?.data?.error || error.message)
        );
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, ordering, selectedCategory, statusFilter, selectedDepartment] // ✅ dependency ครบ
  );

  // --- 3. Debounce Search & Auto Fetch on Filter Change ---
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRequests();
    }, 300);
    return () => clearTimeout(handler);
  }, [fetchRequests]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // --- Helpers ---
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

  const getStatus = (req) => {
    if (req.is_cancelled)
      return { text: "Cancelled", className: "status-cancelled" };
    if (req.is_completed)
      return { text: "Completed", className: "status-completed" };
    return { text: "In Progress", className: "status-inprogress" };
  };

  // --- Calculation for "Showing X-Y of Z" ---
  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(startItem + requests.length - 1, totalCount);

  if (loading && requests.length === 0) {
    return <LoadingSpinner message="Loading procurement requests..." />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>งานส่งถึง : ส่วนงานวิศวกรรมฯ(วขตป.)</h1>
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

        {/* --- ✅ Dropdown เลือกแผนก --- */}
        <select
          className="sort-select"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="">Filter by: All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.name}>
              {dept.name}
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
              <th>template</th>
              <th>Project</th>
              <th>เลขที่หนังสือ</th>
              <th>Category</th>
              <th>Department</th> {/* ✅ เพิ่มหัวตาราง */}
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
                const status = getStatus(req);

                return (
                  <tr
                    key={req.id}
                    className={
                      req.is_completed
                        ? "is-completed"
                        : req.is_cancelled
                        ? "is-cancelled"
                        : ""
                    }
                  >
                    <td data-label="Title">
                      <Link
                        to={`/procurement/requests/${req.id}`}
                        className="task-title-link"
                      >
                        {req.title}
                      </Link>
                    </td>
                    <td data-label="Template">
                      <span className="template-name-cell">
                        {req.template_name || "N/A"}
                      </span>
                    </td>
                    <td data-label="Project">{req.project_name || "N/A"}</td>
                    <td data-label="เลขที่เอกสารอ้างอิง">
                      {req.history_document_numbers || "N/A"}
                    </td>
                    <td data-label="Category">
                      <span className="category-badge">
                        {req.category_details?.name || "N/A"}
                      </span>
                    </td>

                    {/* ✅ เพิ่มข้อมูลแผนก */}
                    <td data-label="Department">
                      {req.requesting_department || "-"}
                    </td>

                    <td data-label="Current Step">
                      <span
                        className={`status-badge status-${
                          req.current_step_details?.name.replace(/\s+/g, "-") ||
                          "N-A"
                        }`}
                      >
                        {req.is_cancelled
                          ? "---"
                          : req.current_step_details?.name || "N/A"}
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
                      {formatDate(req.created_at, true) || "N/A"}
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge ${status.className}`}>
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="10"
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  No procurement requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button
          onClick={() => fetchRequests(prevPageUrl)}
          disabled={!prevPageUrl}
          className="pagination-button"
        >
          Previous
        </button>

        <span>
          {totalCount > 0
            ? `Showing ${startItem}-${endItem} of ${totalCount} items`
            : "No items found"}
        </span>

        <button
          onClick={() => fetchRequests(nextPageUrl)}
          disabled={!nextPageUrl}
          className="pagination-button"
        >
          Next
        </button>
      </div>
      <ToastContainer />
    </div>
  );
}

export default ProcurementListPage;
