// frontend/src/pages/ProjectWorkflowDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api";
import Modal from "../components/Modal";
import UpdateStepStatusForm from "../components/workflows/UpdateStepStatusForm";
import "./Workflows.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function ProjectWorkflowDetailPage() {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const { workflowId } = useParams();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);

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

  const handleOpenModal = (stepStatus) => {
    setCurrentStep(stepStatus);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(null);
  };

  const handleUpdateSubmit = async (formData) => {
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
      handleCloseModal();
    } catch (error) {
      console.error("Failed to update step status", error);
      toast.error(error.response?.data?.detail || "Failed to update status.");
    }
  };

  const calculateSLA = (currentStepStatus, allStatuses) => {
    const stepOrder = currentStepStatus.step.order;
    const duration = currentStepStatus.step.duration_days;
    if (duration === null || duration === undefined) return { text: "No SLA" };

    let startDate;
    if (stepOrder === 1) {
      startDate = new Date(workflow.created_at);
    } else {
      const prevStep = allStatuses.find((s) => s.step.order === stepOrder - 1);
      if (
        prevStep &&
        prevStep.status === "COMPLETED" &&
        prevStep.completed_at
      ) {
        startDate = new Date(prevStep.completed_at);
      } else {
        return { text: "Pending", className: "sla-pending" };
      }
    }

    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + duration);

    const today = new Date();
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
          <h1>{workflow.title}</h1>
          <p>
            Created by {workflow.created_by_details.username} on{" "}
            {new Date(workflow.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="tasks-table-wrapper">
        <table className="tasks-table">
          <thead>
            <tr>
              <th style={{ width: "3%" }}>#</th>
              <th style={{ width: "27%" }}>Step Name</th>
              <th style={{ width: "15%" }}>Responsible Group</th>
              <th style={{ width: "10%" }}>SLA</th>
              <th style={{ width: "10%" }}>Status</th>
              <th style={{ width: "10%" }}>Completed By</th>
              <th style={{ width: "10%" }}>Completed At</th>
              <th style={{ width: "15%" }}>Attachments</th>
            </tr>
          </thead>
          <tbody>
            {workflow.step_statuses.map((status) => {
              const sla = calculateSLA(status, workflow.step_statuses);
              return (
                <tr key={status.id} className={`status-row-${status.status}`}>
                  <td>{status.step.order}</td>
                  <td>
                    {status.step.name}
                    <button
                      className="action-button-link"
                      onClick={() => handleOpenModal(status)}
                    >
                      Update
                    </button>
                  </td>
                  <td>
                    {status.step.responsible_group_details?.name || "---"}
                  </td>
                  <td className={`sla-text ${sla.className}`}>{sla.text}</td>
                  <td>
                    <StatusBadge status={status.status} />
                  </td>
                  <td>{status.completed_by_details?.username || "---"}</td>
                  <td>
                    {status.completed_at
                      ? new Date(status.completed_at).toLocaleDateString()
                      : "---"}
                  </td>
                  <td className="attachments-cell">
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
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`Update Step: ${currentStep?.step.name}`}
      >
        {currentStep && (
          <UpdateStepStatusForm
            stepStatus={currentStep}
            onSubmit={handleUpdateSubmit}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default ProjectWorkflowDetailPage;
