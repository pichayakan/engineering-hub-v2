// frontend/src/pages/ProcurementDetailPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api";
import { useAuth } from "../context/AuthContext";
import ProcessStepper from "../components/ProcessStepper.jsx";
import SignatureModal from "../components/SignatureModal.jsx";
import "./ProcurementDetailPage.css";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { PDFDocument } from "pdf-lib";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiZoomIn, FiZoomOut, FiRefreshCw } from "react-icons/fi";

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

const download = (blob, filename) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function ProcurementDetailPage() {
  const [request, setRequest] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestId } = useParams();
  const { user } = useAuth();

  // PDF & Signature State
  const [numPages, setNumPages] = useState(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  const [canSignCurrentPdf, setCanSignCurrentPdf] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureSize, setSignatureSize] = useState({
    width: 200,
    height: 100,
  });
  const [signatureImage, setSignatureImage] = useState(null);
  const [pdfPageDetails, setPdfPageDetails] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [signaturePosition, setSignaturePosition] = useState(null);

  const signatureRef = useRef(null);
  const pdfWrapperRef = useRef(null);
  const pdfContainerRef = useRef(null);

  const [pdfScale, setPdfScale] = useState(1.0);

  const fetchRequestDetails = useCallback(async () => {
    try {
      const reqRes = await apiClient.get(
        `/api/procurement/requests/${requestId}/`
      );
      setRequest(reqRes.data);
      if (reqRes.data.workflow_template) {
        const wfRes = await apiClient.get(
          `/api/procurement/templates/${reqRes.data.workflow_template}/`
        );
        setWorkflow(wfRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch details", error);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    setLoading(true);
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [selectedPdfUrl]);

  const handleCancelRequest = async () => {
    if (
      window.confirm(
        "Are you sure you want to cancel this request? This action cannot be undone."
      )
    ) {
      try {
        const response = await apiClient.post(
          `/api/procurement/requests/${requestId}/cancel/`
        );
        setRequest(response.data); // Update the state with the cancelled status
        toast.success("Request has been cancelled successfully.");
      } catch (error) {
        console.error("Failed to cancel request", error);
        toast.error(
          error.response?.data?.error || "Could not cancel the request."
        );
      }
    }
  };

  const onDocumentLoadSuccess = (pdf) => {
    setNumPages(pdf.numPages);
    pdf.getPage(1).then((page) => {
      setPdfPageDetails({
        originalWidth: page.originalWidth,
        originalHeight: page.originalHeight,
      });
    });
  };

  const handleOpenSignatureModal = () => setIsSignatureModalOpen(true);
  const handleCloseSignatureModal = () => setIsSignatureModalOpen(false);
  const handleSaveSignature = (signatureDataUrl) => {
    const img = new Image();
    img.src = signatureDataUrl;
    img.onload = () => {
      const initialWidth = 200;
      const aspectRatio = img.height / img.width;
      setSignatureSize({
        width: initialWidth,
        height: initialWidth * aspectRatio,
      });
    };
    const container = pdfWrapperRef.current;
    if (container) {
      setSignaturePosition({ x: 50, y: container.scrollTop + 50 });
    } else {
      setSignaturePosition({ x: 50, y: 50 });
    }
    setSignatureImage(signatureDataUrl);
    handleCloseSignatureModal();
  };

  const handleResize = (event, { size }) => {
    setSignatureSize({ width: size.width, height: size.height });
  };

  const handleApprove = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("notes", notes);
    filesToUpload.forEach((file) => {
      formData.append("files", file);
    });
    try {
      const response = await apiClient.post(
        `/api/procurement/requests/${requestId}/advance-step/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setRequest(response.data);
      setNotes("");
      setFilesToUpload([]);
    } catch (error) {
      console.error("Failed to approve step", error);
      alert(error.response?.data?.error || "Could not approve step.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFilesToUpload((prevFiles) => [
        ...prevFiles,
        ...Array.from(e.target.files),
      ]);
    }
  };

  const handleRemoveFile = (fileNameToRemove) => {
    setFilesToUpload((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileNameToRemove)
    );
  };

  const calculateSLA = (dueDateStr) => {
    if (!dueDateStr) return { text: "Not set", className: "" };
    const today = new Date();
    const dueDate = new Date(dueDateStr);
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0)
      return {
        text: `Overdue by ${Math.abs(diffDays)} days`,
        className: "overdue",
      };
    if (diffDays === 0) return { text: "Due today", className: "due-soon" };
    return { text: `${diffDays}d left`, className: "on-time" };
  };

  const handleEmbedSignature = async () => {
    if (!selectedPdfUrl || !signatureImage || !signatureRef.current) {
      alert("Please select a PDF and place your signature before saving.");
      return;
    }

    try {
      // โหลด PDF เดิม
      const existingPdfBytes = await fetch(selectedPdfUrl).then((res) =>
        res.arrayBuffer()
      );

      // โหลดไฟล์ลายเซ็น
      const sigResponse = await fetch(signatureImage);
      const contentType = sigResponse.headers.get("Content-Type") || "";
      const signatureImageBytes = await sigResponse.arrayBuffer();

      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // ✅ เลือก embed ตามชนิดไฟล์
      let signatureImg;
      if (contentType.includes("png")) {
        signatureImg = await pdfDoc.embedPng(signatureImageBytes);
      } else if (contentType.includes("jpg") || contentType.includes("jpeg")) {
        signatureImg = await pdfDoc.embedJpg(signatureImageBytes);
      } else {
        throw new Error(
          "Unsupported signature format. Please upload PNG or JPG."
        );
      }

      // ใช้หน้าแรก (แก้ได้ถ้าอยากรองรับหลายหน้า)
      const page = pdfDoc.getPages()[0];
      const pageDimensions = page.getSize();

      // หา canvas ของ react-pdf
      const pageWrapper =
        pdfWrapperRef.current?.querySelector(".react-pdf__Page");
      if (!pageWrapper) {
        alert("Error: Cannot find the rendered PDF page wrapper.");
        return;
      }

      const pageCanvas =
        pageWrapper.querySelector("canvas") ||
        pageWrapper.querySelector(".react-pdf__Page__canvas canvas");

      if (!pageCanvas) {
        alert("Error: Cannot find PDF canvas for coordinate mapping.");
        return;
      }

      // ขนาดจริงบน DOM
      const canvasRect = pageCanvas.getBoundingClientRect();
      const signatureRect = signatureRef.current.getBoundingClientRect();

      const relX = signatureRect.left - canvasRect.left;
      const relY = signatureRect.top - canvasRect.top;

      // สัดส่วน pixel → point
      const pointsPerPx = pageDimensions.width / canvasRect.width;

      const sigWidthPts = signatureRect.width * pointsPerPx;
      const sigHeightPts = signatureRect.height * pointsPerPx;

      let xPts = relX * pointsPerPx;
      let yPts = pageDimensions.height - relY * pointsPerPx - sigHeightPts;

      // clamp กันไม่ให้หลุดขอบ
      const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
      xPts = clamp(xPts, 0, pageDimensions.width - sigWidthPts);
      yPts = clamp(yPts, 0, pageDimensions.height - sigHeightPts);

      console.log("Signature placement (canvas-based)", {
        contentType,
        canvasCssWidth: canvasRect.width,
        canvasCssHeight: canvasRect.height,
        pageWidthPoints: pageDimensions.width,
        pageHeightPoints: pageDimensions.height,
        relX,
        relY,
        xPts,
        yPts,
        sigWidthPts,
        sigHeightPts,
      });

      // วาดลายเซ็น
      page.drawImage(signatureImg, {
        x: xPts,
        y: yPts,
        width: sigWidthPts,
        height: sigHeightPts,
      });

      // บันทึก PDF ใหม่
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const originalFileName = decodeURIComponent(
        selectedPdfUrl.split("/").pop().replace(".pdf", "")
      );
      const newFilename = `signed_${originalFileName}_${timestamp}.pdf`;

      const signedFile = new File([blob], newFilename, {
        type: "application/pdf",
      });
      setFilesToUpload((prev) => [...prev, signedFile]);
      setSignatureImage(null);
      setSelectedPdfUrl(null);
      toast.success(
        "Signed PDF has been added. Please press 'Approve' to submit."
      );
    } catch (error) {
      console.error("Failed to embed signature:", error);
      alert("Could not create signed PDF.");
    }
  };

  if (loading) return <div>Loading details...</div>;
  if (!request || !workflow) return <div>Could not load data.</div>;

  const signatureScale = pdfPageDetails
    ? containerWidth / pdfPageDetails.originalWidth
    : 1;

  const checkUserPermission = () => {
    if (request.is_completed) return false;
    if (user?.is_staff) return true;
    const responsibleGroupIds =
      request.current_step_details?.responsible_groups || [];
    if (responsibleGroupIds.length === 0) {
      return true;
    }
    const userGroupIds = user?.groups || [];
    return userGroupIds.some((userGroupId) =>
      responsibleGroupIds.includes(userGroupId)
    );
  };
  const canApprove = checkUserPermission();

  const handleViewPdf = (attachment) => {
    const latestHistoryId =
      request.history.length > 0
        ? request.history[request.history.length - 1].id
        : null;
    if (canApprove && attachment.history_entry === latestHistoryId) {
      setCanSignCurrentPdf(true);
    } else {
      setCanSignCurrentPdf(false);
    }
    setSelectedPdfUrl(attachment.file);
  };

  const sla = calculateSLA(request.current_step_due_date);
  const responsibleGroupNames =
    request.current_step_details?.responsible_group_details
      ?.map((g) => g.name)
      .join(", ") || "";

  const latestHistoryEntryId =
    request.history.length > 0
      ? request.history[request.history.length - 1].id
      : null;
  const isPdfFromLastStep = request.history.some(
    (h) =>
      h.id === latestHistoryEntryId &&
      h.attachments.some((att) => att.file === selectedPdfUrl)
  );
  const showSignButton = canApprove && isPdfFromLastStep;

  const isSigningCompleted = () => {
    if (!selectedPdfUrl) {
      return true;
    }
    return filesToUpload.some((file) => file.name.startsWith("signed_"));
  };

  const signingIsDone = isSigningCompleted();

  const showCancelButton =
    user &&
    user.id === request.created_by &&
    !request.is_completed &&
    !request.is_cancelled;
  console.log(request.created_by);

  return (
    <div className="procurement-detail-container">
      <div className="detail-header">
        <h1>{request.title}</h1>
        <p>
          Created by: {request.created_by_details.username} on{" "}
          {new Date(request.created_at).toLocaleDateString()}
          {request.is_cancelled && (
            <div className="status-banner is-cancelled">Cancelled</div>
          )}
        </p>
      </div>
      <ProcessStepper
        steps={workflow.steps}
        currentStepId={request.current_step}
        history={request.history}
      />
      {selectedPdfUrl && (
        <div className="document-viewer-section">
          <div className="document-header">
            <h2>Document Viewer</h2>
            <div className="document-controls">
              <div className="zoom-controls">
                <button
                  onClick={() => setPdfScale((prev) => prev - 0.1)}
                  disabled={pdfScale <= 0.5}
                >
                  <FiZoomOut />
                </button>
                <span
                  onClick={() => setPdfScale(1.0)}
                  style={{ cursor: "pointer" }}
                >
                  {Math.round(pdfScale * 100)}%
                </span>
                <button
                  onClick={() => setPdfScale((prev) => prev + 0.1)}
                  disabled={pdfScale >= 2.0}
                >
                  <FiZoomIn />
                </button>
              </div>
              <div>
                {showSignButton && (
                  <button
                    className="sign-document-btn"
                    onClick={handleOpenSignatureModal}
                  >
                    Sign Document
                  </button>
                )}
                <button
                  className="apply-signature-btn"
                  onClick={handleEmbedSignature}
                  disabled={!signatureImage}
                >
                  Apply & Save Signature
                </button>
                <button
                  className="close-viewer-btn"
                  onClick={() => setSelectedPdfUrl(null)}
                >
                  &times; Close Viewer
                </button>
              </div>
            </div>
          </div>

          <div className="pdf-viewer-wrapper" ref={pdfWrapperRef}>
            {signatureImage && (
              <Draggable
                nodeRef={signatureRef}
                bounds="parent"
                position={signaturePosition}
                onStop={(e, data) =>
                  setSignaturePosition({ x: data.x, y: data.y })
                }
              >
                <div
                  ref={signatureRef}
                  className="signature-container"
                  style={{
                    position: "absolute",
                    cursor: "move",
                    width: `${signatureSize.width}px`,
                    height: `${signatureSize.height}px`,
                  }}
                >
                  <ResizableBox
                    width={signatureSize.width}
                    height={signatureSize.height}
                    onResize={handleResize}
                    lockAspectRatio={true}
                    minConstraints={[50, 25]}
                    maxConstraints={[600, 300]}
                    className="signature-resizable-box"
                  >
                    <img
                      src={signatureImage}
                      alt="Your Signature"
                      draggable="false"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </ResizableBox>
                </div>
              </Draggable>
            )}
            <div className="pdf-container" ref={pdfContainerRef}>
              <Document
                file={selectedPdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
              >
                {containerWidth > 0 &&
                  Array.from(new Array(numPages || 0), (el, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={containerWidth}
                      scale={pdfScale}
                    />
                  ))}
              </Document>
            </div>
          </div>
        </div>
      )}
      <div className="approval-section">
        <div className="history-card">
          <h2>Approval History</h2>
          <div className="history-timeline">
            {request.history.map((h) => (
              <div key={h.id} className="history-item">
                <p className="history-step-name">{h.step.name}</p>
                <div className="history-meta">
                  Approved by{" "}
                  <strong>
                    {" "}
                    {h.approved_by_details.first_name}{" "}
                    {h.approved_by_details.last_name}{" "}
                  </strong>{" "}
                  on {new Date(h.timestamp).toLocaleString()}
                </div>
                <div className="approver-details">
                  <span>
                    Dept: {h.approved_by_details.department_name || "N/A"}
                  </span>
                  {h.approved_by_details.groups.map((g) => (
                    <span key={g.id} className="group-badge">
                      {g.name}
                    </span>
                  ))}
                </div>
                {h.notes && <p className="history-notes">{h.notes}</p>}
                <div className="history-attachments">
                  {h.attachments.map((att) => (
                    <div key={att.id} className="attachment-item">
                      <a
                        href={att.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-link"
                      >
                        📎 {att.name}
                      </a>
                      {att.file.toLowerCase().endsWith(".pdf") && (
                        <button
                          className="view-pdf-btn"
                          onClick={() => setSelectedPdfUrl(att.file)}
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="action-card">
          <h2>
            Current Step: {request.current_step_details?.name || "Completed"}
          </h2>
          {request.is_completed && <p>This request is fully completed.</p>}
          {request.is_cancelled && <p>This request has been cancelled.</p>}
          {!request.is_completed && !request.is_cancelled && (
            <div>
              <div className="sla-info">
                <p className="sla-title">Step Due Date</p>
                <p className="sla-date">
                  {request.current_step_due_date
                    ? new Date(
                        request.current_step_due_date
                      ).toLocaleDateString("en-GB")
                    : "N/A"}
                </p>
                <p className={`sla-remaining ${sla.className}`}>{sla.text}</p>
              </div>
              <div className="form-group">
                <label htmlFor="approval_notes">
                  Approval Notes (Optional)
                </label>
                <textarea
                  id="approval_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                ></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="approval_attachments">Attach Files</label>
                <input
                  type="file"
                  id="approval_attachments"
                  multiple
                  onChange={handleFileChange}
                  className="upload-input"
                />
              </div>
              {filesToUpload.length > 0 && (
                <div className="file-preview-list">
                  {filesToUpload.map((file, index) => (
                    <div key={index} className="file-preview-item">
                      <span className="file-preview-name">
                        {decodeURIComponent(file.name)}
                      </span>
                      <button
                        onClick={() => handleRemoveFile(file.name)}
                        className="remove-file-btn"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleApprove}
                className="approve-button"
                disabled={!canApprove || isSubmitting || !signingIsDone}
              >
                {isSubmitting ? "Submitting..." : "Approve & Advance"}
              </button>

              {!signingIsDone && (
                <p className="signing-required-message">
                  Please "Apply & Save Signature" to the document before
                  approving.
                </p>
              )}
              {!canApprove &&
                request.current_step_details?.responsible_group_details && (
                  <details className="potential-approvers">
                    <summary>
                      Requires approval from "{responsibleGroupNames}"
                    </summary>
                    {request.current_step_details.responsible_group_details.map(
                      (group) => (
                        <div key={group.id}>
                          <strong>{group.name}:</strong>
                          <ul>
                            {group.members?.map((member) => (
                              <li key={member.id}>
                                - {member.first_name} {member.last_name} (
                                {member.username})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    )}
                  </details>
                )}
            </div>
          )}
        </div>
      </div>
      {showCancelButton && (
        <div className="cancel-section">
          <p>If you created this request in error, you can cancel it.</p>
          <button onClick={handleCancelRequest} className="cancel-button">
            Cancel This Request
          </button>
        </div>
      )}
      <div style={{ marginTop: "2rem" }}>
        <Link to="/procurement" className="nav-link">
          ← Back to Procurement List
        </Link>
      </div>
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={handleCloseSignatureModal}
        onSave={handleSaveSignature}
        typedSignatureFont="'Sarabun', sans-serif"
      />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default ProcurementDetailPage;
