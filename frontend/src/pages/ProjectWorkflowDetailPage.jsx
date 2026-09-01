// frontend/src/pages/ProjectWorkflowDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api";
import Modal from "../components/Modal";
import UpdateStepStatusForm from "../components/workflows/UpdateStepStatusForm";
import EditWorkflowForm from "../components/workflows/EditWorkflowForm";
import "./Workflows.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ✅ 1. เพิ่ม FiEdit icon
import {
  FiSearch,
  FiMinusCircle,
  FiMessageSquare,
  FiEdit,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/formatDate";

// Helper component to display main workflow details neatly
const WorkflowDetails = ({ workflow }) => {
  const formattedBudget = workflow.budget_amount
    ? parseFloat(workflow.budget_amount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "---";

  return (
    <div className="workflow-details-grid">
      <div>
        <span>Category</span>
        <strong>{workflow.category?.name || "---"}</strong>
      </div>
      <div>
        <span>PR Number</span>
        <strong>{workflow.pr_number || "---"}</strong>
      </div>
      <div>
        <span>Budget Amount</span>
        <strong>{formattedBudget}</strong>
      </div>
      <div>
        <span>Fiscal Year</span>
        <strong>{workflow.fiscal_year || "---"}</strong>
      </div>
      <div>
        <span>Created By</span>
        <strong>
          <Link to={`/profile/${workflow.created_by}`} className="profile-link">
            {workflow.created_by_details.first_name}{" "}
            {workflow.created_by_details.last_name}
          </Link>
        </strong>
      </div>
      <div>
        <span>Start Date</span>
        <strong>{formatDate(workflow.start_date)}</strong>
      </div>
    </div>
  );
};

function ProjectWorkflowDetailPage() {
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const { workflowId } = useParams();

  // State for the "Update Step" modal
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);

  // State for the "Edit Workflow" modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const fetchWorkflowDetails = async () => {
    try {
      const response = await apiClient.get(
        `/api/workflows/projects/${workflowId}/`,
      );
      setWorkflow(response.data);
    } catch (error) {
      console.error("Failed to fetch workflow details", error);
      toast.error("Failed to load workflow details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchWorkflowDetails();
  }, [workflowId]);

  // Handlers for the "Update Step" Modal
  const handleOpenStepModal = (stepStatus) => {
    setCurrentStep(stepStatus);
    setIsStepModalOpen(true);
  };
  const handleCloseStepModal = () => {
    setIsStepModalOpen(false);
    setCurrentStep(null);
  };
  const handleUpdateStepSubmit = async (formData) => {
    if (!currentStep) return;
    try {
      const response = await apiClient.post(
        `/api/workflows/step-statuses/${currentStep.id}/update-status/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // อัปเดต State ของ workflow เพื่อให้ข้อมูลในตารางเปลี่ยนตาม
      setWorkflow((prev) => ({
        ...prev,
        step_statuses: prev.step_statuses.map((ss) =>
          ss.id === currentStep.id ? response.data : ss,
        ),
      }));
      toast.success(`Step "${response.data.step.name}" updated successfully!`);
      handleCloseStepModal();
    } catch (error) {
      console.error("Failed to update step status", error);
      toast.error(error.response?.data?.detail || "Failed to update status.");
    }
  };

  // Handlers for the "Edit Workflow" Modal
  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);

  const handleEditWorkflowSubmit = async (updatedData) => {
    try {
      const response = await apiClient.patch(
        `/api/workflows/projects/${workflowId}/`,
        updatedData,
      );
      setWorkflow(response.data);
      toast.success("Workflow details updated successfully!");
      handleCloseEditModal();
    } catch (error) {
      console.error("Failed to update workflow", error);
      toast.error(error.response?.data?.detail || "Failed to update workflow.");
    }
  };

  // --- ✅ 2. เพิ่ม HANDLERS สำหรับ DURATION OVERRIDE ---
  const handleOpenDurationModal = (stepStatus) => {
    // ดึงค่าปัจจุบัน (ถ้ามี override ใช้อันนั้น, ถ้าไม่มีใช้ค่าจาก template)
    const currentDuration =
      stepStatus.duration_override ?? stepStatus.step.duration_days;

    const newDuration = window.prompt(
      `Enter new duration (in days) for step:\n"${stepStatus.step.name}"\n\n(Leave blank to use template default: ${stepStatus.step.duration_days} days)`,
      currentDuration ?? "",
    );

    if (newDuration !== null) {
      // ผู้ใช้ไม่กด Cancel
      handleSetDurationSubmit(stepStatus, newDuration);
    }
  };

  const handleSetDurationSubmit = async (stepStatus, newDuration) => {
    try {
      const response = await apiClient.post(
        `/api/workflows/step-statuses/${stepStatus.id}/set-duration/`,
        { duration: newDuration },
      );

      // --- 🔴 THIS IS THE CRITICAL FIX 🔴 ---
      // API (views.py) จะส่ง workflow ทั้งก้อนที่คำนวณใหม่แล้วกลับมา
      // เราต้องใช้ข้อมูลนี้อัปเดต State เพื่อให้ React วาดตารางใหม่
      setWorkflow(response.data);
      // --- -------------------------- ---

      toast.success(`Duration updated. Due dates recalculated.`);
    } catch (error) {
      console.error("Failed to set duration", error);
      toast.error(error.response?.data?.error || "Failed to set duration.");
    }
  };

  const getSlaStatus = (dueDateStr) => {
    if (!dueDateStr) return { text: "No SLA", className: "sla-pending" };

    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Overdue ${Math.abs(diffDays)}d`,
        className: "sla-overdue",
      };
    }
    if (diffDays === 0) {
      return { text: "Due Today", className: "sla-due-soon" };
    }
    return { text: `${diffDays}d left`, className: "sla-on-time" };
  };

  if (loading) return <div>Loading workflow details...</div>;
  if (!workflow) return <div>Could not load workflow data.</div>;

  const StatusBadge = ({ status }) => {
    return (
      <span className={`status-badge-wf status-${status}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="title-with-toggle">
            <h1>{workflow.title}</h1>
            <button
              className="toggle-details-btn"
              onClick={() => setIsDetailsVisible(!isDetailsVisible)}
            >
              {isDetailsVisible ? (
                <>
                  <FiMinusCircle className="toggle-icon" /> Hide Details
                </>
              ) : (
                <>
                  <FiSearch className="toggle-icon" /> Show Details
                </>
              )}
            </button>
          </div>

          {/* 🌟 แสดง Handlers ใต้ Title */}
          <div
            style={{
              marginTop: "0.4rem",
              marginBottom: "0.6rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                color: "#6c757d",
                fontWeight: "600",
              }}
            >
              ผู้ได้รับมอบหมาย:
            </span>
            {workflow.handlers_details &&
            workflow.handlers_details.length > 0 ? (
              workflow.handlers_details.map((handler) => (
                <span key={handler.id} className="group-tag">
                  👤{" "}
                  {handler.first_name && handler.last_name
                    ? `${handler.first_name} ${handler.last_name}`
                    : handler.username}
                </span>
              ))
            ) : (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#888",
                  fontStyle: "italic",
                }}
              >
                ยังไม่ได้ระบุผู้รับผิดชอบ
              </span>
            )}
          </div>
          {isDetailsVisible && <WorkflowDetails workflow={workflow} />}
        </div>
        <button className="edit-workflow-btn" onClick={handleOpenEditModal}>
          Edit Workflow
        </button>
      </div>

      <div className="tasks-table-wrapper">
        <table className="tasks-table">
          <thead>
            <tr>
              <th style={{ width: "3%" }}>#</th>
              <th style={{ width: "22%" }}>Step Name</th>
              <th style={{ width: "15%" }}>Responsible Group</th>
              <th style={{ width: "10%" }}>
                Due Date (SLA)
                <small
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    color: "red",
                    fontWeight: "normal",
                  }}
                >
                  (นับเฉพาะวันทำการ)
                </small>
              </th>
              <th style={{ width: "10%" }}>Status</th>
              <th style={{ width: "5%" }}>Notes</th>
              <th style={{ width: "10%" }}>Completed By</th>
              <th style={{ width: "10%" }}>Actual Date</th>
              <th style={{ width: "10%" }}>System Date</th>
              <th style={{ width: "10%" }}>Attachments</th>
            </tr>
          </thead>
          <tbody>
            {workflow.step_statuses.map((status) => {
              const sla = getSlaStatus(status.due_date);

              const checkUserPermission = () => {
                if (user?.is_staff) return true;
                const responsibleGroupIds = status.step.responsible_groups;
                if (!responsibleGroupIds || responsibleGroupIds.length === 0) {
                  return true;
                }
                const userGroupIds = user?.groups || [];
                return userGroupIds.some((userGroupId) =>
                  responsibleGroupIds.includes(userGroupId),
                );
              };
              const canUpdate = checkUserPermission();

              return (
                <tr key={status.id} className={`status-row-${status.status}`}>
                  <td>{status.step.order}</td>
                  <td>
                    {canUpdate && (
                      <button
                        className="action-button-link"
                        onClick={() => handleOpenStepModal(status)}
                      >
                        Update
                      </button>
                    )}
                    {status.step.name}
                  </td>
                  <td>
                    {status.step.responsible_group_details?.length > 0
                      ? status.step.responsible_group_details.map((group) => (
                          <span key={group.id} className="group-tag">
                            {group.name}
                          </span>
                        ))
                      : "---"}
                  </td>

                  {/* --- ✅ 3. แก้ไข TD ของ DUE DATE --- */}
                  <td className={`sla-text ${sla.className}`}>
                    <div className="cell-content-wrapper">
                      {status.due_date ? (
                        <>
                          <span>{formatDate(status.due_date)}</span>
                          <small>{sla.text}</small>
                        </>
                      ) : (
                        "N/A"
                      )}
                      {/* เพิ่มปุ่มแก้ไข Duration */}
                      {canUpdate && (
                        <button
                          className="action-button-link"
                          style={{ marginLeft: "5px", fontSize: "1.1rem" }}
                          title="Set custom duration (days)"
                          onClick={() => handleOpenDurationModal(status)}
                        >
                          <FiEdit />
                        </button>
                      )}
                    </div>
                  </td>

                  <td>
                    <StatusBadge status={status.status} />
                  </td>
                  <td className="notes-cell">
                    {status.notes && (
                      <span
                        onClick={() => handleOpenStepModal(status)}
                        style={{ cursor: "pointer" }}
                      >
                        <FiMessageSquare
                          className="notes-icon"
                          title={status.notes}
                        />
                      </span>
                    )}
                  </td>
                  <td>{status.completed_by_details?.username || "---"}</td>
                  <td>{formatDate(status.actual_completed_date)}</td>
                  <td>{formatDate(status.completed_at)}</td>
                  <td>
                    <div className="cell-content-wrapper attachments-cell">
                      {status.attachments.length > 0
                        ? status.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.file}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              📎 {att.name}
                            </a>
                          ))
                        : "No files"}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link to="/workflows" className="nav-link">
          ← Back to Workflow List
        </Link>
      </div>

      <Modal
        isOpen={isStepModalOpen}
        onClose={handleCloseStepModal}
        title={`Update Step: ${currentStep?.step.name}`}
      >
        {currentStep && (
          <UpdateStepStatusForm
            stepStatus={currentStep}
            onSubmit={handleUpdateStepSubmit}
            onCancel={handleCloseStepModal}
          />
        )}
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Edit Workflow Details"
      >
        {workflow && (
          <EditWorkflowForm
            workflow={workflow}
            onSubmit={handleEditWorkflowSubmit}
            onCancel={handleCloseEditModal}
          />
        )}
      </Modal>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default ProjectWorkflowDetailPage;
