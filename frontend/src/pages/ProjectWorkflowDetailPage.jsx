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

import { FiSearch, FiMinusCircle, FiMessageSquare } from "react-icons/fi";

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
        `/api/workflows/projects/${workflowId}/`
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
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setWorkflow((prev) => ({
        ...prev,
        step_statuses: prev.step_statuses.map((ss) =>
          ss.id === currentStep.id ? response.data : ss
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
        updatedData
      );
      setWorkflow((prevWorkflow) => ({
        ...prevWorkflow,
        ...response.data,
      }));
      toast.success("Workflow details updated successfully!");
      handleCloseEditModal();
    } catch (error) {
      console.error("Failed to update workflow", error);
      toast.error(error.response?.data?.detail || "Failed to update workflow.");
    }
  };

  const getSlaStatus = (dueDateStr) => {
    if (!dueDateStr) return { text: "No SLA", className: "sla-pending" };

    // Set both dates to midnight to compare the dates only, ignoring time
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
              <th style={{ width: "25%" }}>Step Name</th>
              <th style={{ width: "15%" }}>Responsible Group</th>
              <th style={{ width: "10%" }}>Due Date (SLA)</th>
              <th style={{ width: "10%" }}>Status</th>
              <th style={{ width: "5%" }}>Notes</th> {/* ✅ ADDED */}
              <th style={{ width: "10%" }}>Completed By</th>
              <th style={{ width: "10%" }}>Completed At</th>
              <th style={{ width: "12%" }}>Attachments</th>
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

                // user.groups is already an array of IDs, so we use it directly.
                const userGroupIds = user?.groups || [];

                return userGroupIds.some((userGroupId) =>
                  responsibleGroupIds.includes(userGroupId)
                );
              };
              const canUpdate = checkUserPermission();

              return (
                <tr key={status.id} className={`status-row-${status.status}`}>
                  <td>{status.step.order}</td>
                  <td>
                    {status.step.name}
                    {canUpdate && (
                      <button
                        className="action-button-link"
                        onClick={() => handleOpenStepModal(status)}
                        disabled={status.status === "COMPLETED"}
                      >
                        Update
                      </button>
                    )}
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
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={status.status} />
                  </td>
                  <td className="notes-cell">
                    {/* --- ✅ THIS IS THE FIX --- */}
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
            readOnly={currentStep.status === "COMPLETED"}
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
