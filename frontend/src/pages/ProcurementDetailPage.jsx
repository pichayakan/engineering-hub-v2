// frontend/src/pages/ProcurementDetailPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api";
import { useAuth } from "../context/AuthContext";
import ProcessStepper from "../components/ProcessStepper.jsx";
import SignatureModal from "../components/SignatureModal.jsx";
import "./ProcurementDetailPage.css";
import ConfirmModal from "../components/ConfirmModal";

import SendBackModal from "../components/SendBackModal";
import Modal from "../components/Modal";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { PDFDocument } from "pdf-lib";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw, // ✅ ปุ่ม Reset
  FiSearch,
  FiEdit3,
  FiSave,
  FiPlus, // ✅ ปุ่ม Zoom +
  FiMinus, // ✅ ปุ่ม Zoom -
} from "react-icons/fi";

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
  // --- 1. State Declarations ---
  const [request, setRequest] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileUploadError, setFileUploadError] = useState("");
  const { requestId } = useParams();
  const { user } = useAuth();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [renderedPdfScale, setRenderedPdfScale] = useState(1);
  const signatureAspectRatio = useRef(1);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [documentNumber, setDocumentNumber] = useState("");

  // PDF & Signature State
  const [numPages, setNumPages] = useState(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  const [canSignCurrentPdf, setCanSignCurrentPdf] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [pdfPageDetails, setPdfPageDetails] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const [signatures, setSignatures] = useState([]);
  const [editingSignatureId, setEditingSignatureId] = useState(null);
  const [signatureToEdit, setSignatureToEdit] = useState(null);

  // preview เอกสารก่อนส่งต่อ //
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [hasViewedPdf, setHasViewedPdf] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [isSendBackModalOpen, setIsSendBackModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("วรวิ");
  const [pdfScale, setPdfScale] = useState(1.0);

  const signatureRef = useRef(null);
  const pdfWrapperRef = useRef(null);
  const pdfContainerRef = useRef(null);

  const viewerContainerRef = useRef(null);

  // --- 2. Effects & Data Fetching ---

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
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [selectedPdfUrl]);

  useEffect(() => {
    if (selectedPdfUrl && viewerContainerRef.current) {
      // รอให้ Render เสร็จนิดนึงแล้วค่อยเลื่อน (setTimeout ช่วยให้แม่นยำขึ้นในบาง Browser)
      setTimeout(() => {
        viewerContainerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [selectedPdfUrl]);

  // --- 3. Handlers ---

  const handleTestPdf = async () => {
    try {
      toast.info("Generating PDF...");
      const response = await apiClient.get(
        `/api/procurement/requests/${requestId}/test-generate-pdf/`,
        { responseType: "blob" }
      );
      download(response.data, `test_pdf_${requestId}.pdf`);
      toast.success("PDF Generated!");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleSaveSignature = (signatureData) => {
    const imageSrc = signatureData.image || signatureData;
    const sigType = signatureData.type || "draw";
    const sigText = signatureData.text || "";

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const initialWidth = 200;
      const aspectRatio = img.height / img.width;
      signatureAspectRatio.current = aspectRatio;

      if (editingSignatureId) {
        setSignatures((prev) =>
          prev.map((sig) =>
            sig.id === editingSignatureId
              ? {
                  ...sig,
                  image: imageSrc,
                  text: sigText,
                  type: sigType,
                  size: {
                    width: sig.size.width,
                    height: sig.size.width * aspectRatio,
                  },
                }
              : sig
          )
        );
        setEditingSignatureId(null);
        setSignatureToEdit(null);
      } else {
        const newSignature = {
          id: `sig-${Date.now()}`,
          page: currentPage,
          image: imageSrc,
          text: sigText,
          type: sigType,
          position: { x: 50, y: 50 },
          size: {
            width: initialWidth,
            height: initialWidth * aspectRatio,
          },
        };
        setSignatures((prev) => [...prev, newSignature]);
      }
      handleCloseSignatureModal();
    };
  };

  const handleEditSignature = (signature) => {
    if (signature.type === "type") {
      setEditingSignatureId(signature.id);
      setSignatureToEdit({
        type: signature.type,
        text: signature.text,
      });
      setIsSignatureModalOpen(true);
    } else {
      toast.info(
        "ลายเซ็นรูปแบบนี้ไม่รองรับการแก้ไขข้อความ (ต้องลบและสร้างใหม่)"
      );
    }
  };

  const handleResizeSignature = (id, scaleFactor) => {
    setSignatures((prev) =>
      prev.map((sig) => {
        if (sig.id === id) {
          const newWidth = Math.round(sig.size.width * scaleFactor);
          const newHeight = Math.round(sig.size.height * scaleFactor);

          if (newWidth < 30 || newWidth > 800) return sig;

          return {
            ...sig,
            size: { width: newWidth, height: newHeight },
          };
        }
        return sig;
      })
    );
  };

  const handleClearAllSignatures = () => {
    if (signatures.length === 0) return;
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบลายเซ็นทั้งหมด?")) {
      setSignatures([]);
      toast.info("ลบลายเซ็นทั้งหมดเรียบร้อยแล้ว");
    }
  };

  const handleCloseSignatureModal = () => {
    setIsSignatureModalOpen(false);
    setEditingSignatureId(null);
    setSignatureToEdit(null);
  };

  const handleSendBack = async (data) => {
    try {
      const response = await apiClient.post(
        `/api/procurement/requests/${requestId}/send-back/`,
        data
      );
      setRequest(response.data);
      setIsSendBackModalOpen(false);
      toast.success("ส่งงานกลับแก้ไขเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Failed to send back step", error);
      toast.error("ไม่สามารถส่งงานกลับได้");
    }
  };

  const handleCancelRequest = () => {
    setIsConfirmModalOpen(true);
  };

  const executeCancellation = async () => {
    try {
      const response = await apiClient.post(
        `/api/procurement/requests/${requestId}/cancel/`
      );
      setRequest(response.data);
      toast.success("Request has been cancelled successfully.");
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Could not cancel the request."
      );
    } finally {
      setIsConfirmModalOpen(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    setCurrentPage((prevPage) => (prevPage > 1 ? prevPage - 1 : prevPage));
  };

  const goToNextPage = () => {
    setCurrentPage((prevPage) =>
      prevPage < numPages ? prevPage + 1 : prevPage
    );
  };

  const handleOpenSignatureModal = () => setIsSignatureModalOpen(true);

  const handleResize = (event, { size }) => {
    // setSignatureSize({ width: size.width, height: size.height });
  };

  const onPageLoadSuccess = (page) => {
    setPdfPageDetails({
      originalWidth: page.originalWidth,
      originalHeight: page.originalHeight,
    });
    setRenderedPdfScale(page.scale);
  };

  const handleApprove = async () => {
    if (
      !window.confirm(
        "Are you sure you want to approve and advance to the next step?"
      )
    ) {
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("notes", notes);

    if (request.current_step_details?.requires_document_number) {
      if (documentNumber && documentNumber.trim() !== "") {
        formData.append("document_number", documentNumber);
      } else {
        alert("Please enter the required document number for this step.");
        setIsSubmitting(false);
        return;
      }
    }

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
      setDocumentNumber("");
    } catch (error) {
      console.error("Failed to approve step", error);
      alert(error.response?.data?.error || "Could not approve step.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const MAX_FILENAME_LENGTH = 150;

      const tooLongFiles = newFiles.filter(
        (file) => file.name.length > MAX_FILENAME_LENGTH
      );

      if (tooLongFiles.length > 0) {
        setFileUploadError(
          `ชื่อไฟล์ยาวเกิน ${MAX_FILENAME_LENGTH} ตัวอักษร: ${tooLongFiles
            .map((f) => f.name)
            .join(", ")}`
        );
        return;
      }

      setFileUploadError("");
      setFilesToUpload((prevFiles) => [...prevFiles, ...newFiles]);

      const pdfFile = newFiles.find((file) => file.type === "application/pdf");
      if (pdfFile) {
        const url = URL.createObjectURL(pdfFile);
        setSelectedPdfUrl(url);
        setHasViewedPdf(true);
      }
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
    if (signatures.length === 0) {
      alert("Please place at least one signature before saving.");
      return;
    }

    toast.info("Applying all signatures, please wait...", {
      autoClose: false,
      toastId: "signing",
    });

    try {
      const pagesToSign = Array.from(
        new Set(signatures.map((sig) => sig.page))
      );
      const existingPdfBytes = await fetch(selectedPdfUrl).then((res) =>
        res.arrayBuffer()
      );
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const allPages = pdfDoc.getPages();

      for (const pageNum of pagesToSign) {
        setCurrentPage(pageNum);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const pdfWrapper = pdfWrapperRef.current;
        const pageWrapper = pdfWrapper?.querySelector(".react-pdf__Page");
        const pageCanvas = pageWrapper?.querySelector("canvas");

        if (!pdfWrapper || !pageWrapper || !pageCanvas) {
          console.error(
            `Could not find PDF elements for page ${pageNum}. Skipping page.`
          );
          continue;
        }

        const wrapperRect = pdfWrapper.getBoundingClientRect();
        const canvasRect = pageCanvas.getBoundingClientRect();

        const wrapperStyle = window.getComputedStyle(pdfWrapper);
        const wrapperPaddingLeft = parseFloat(wrapperStyle.paddingLeft);
        const wrapperPaddingTop = parseFloat(wrapperStyle.paddingTop);

        const signaturesOnThisPage = signatures.filter(
          (sig) => sig.page === pageNum
        );

        for (const sig of signaturesOnThisPage) {
          const sigResponse = await fetch(sig.image);
          const contentType = sigResponse.headers.get("Content-Type") || "";
          const signatureImageBytes = await sigResponse.arrayBuffer();
          let signatureImg;
          if (contentType.includes("png")) {
            signatureImg = await pdfDoc.embedPng(signatureImageBytes);
          } else if (
            contentType.includes("jpg") ||
            contentType.includes("jpeg")
          ) {
            signatureImg = await pdfDoc.embedJpg(signatureImageBytes);
          } else {
            continue;
          }

          const page = allPages[sig.page - 1];
          const pageDimensions = page.getSize();

          const signatureScreenX =
            wrapperRect.left + wrapperPaddingLeft + sig.position.x;
          const signatureScreenY =
            wrapperRect.top + wrapperPaddingTop + sig.position.y;

          const signatureRelativeX_px = signatureScreenX - canvasRect.left;
          const signatureRelativeY_px = signatureScreenY - canvasRect.top;

          const pointsPerPixel = pageDimensions.width / canvasRect.width;
          const sigWidthPts = sig.size.width * pointsPerPixel;
          const sigHeightPts = sig.size.height * pointsPerPixel;

          const X_OFFSET_PIXELS = 50;
          const Y_OFFSET_PIXELS = 50;

          let xPts = (signatureRelativeX_px + X_OFFSET_PIXELS) * pointsPerPixel;
          let yPts =
            pageDimensions.height -
            (signatureRelativeY_px + Y_OFFSET_PIXELS) * pointsPerPixel -
            sigHeightPts;

          const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
          xPts = clamp(xPts, 0, pageDimensions.width - sigWidthPts);
          yPts = clamp(yPts, 0, pageDimensions.height - sigHeightPts);

          page.drawImage(signatureImg, {
            x: xPts,
            y: yPts,
            width: sigWidthPts,
            height: sigHeightPts,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      let fullFilename = decodeURIComponent(selectedPdfUrl.split("/").pop());
      let baseName = fullFilename
        .replace(/\.pdf$/i, "")
        .replace(/^signed_/, "")
        .replace(/\./g, "_");
      const newFilename = `signed_${baseName}_${timestamp}.pdf`;
      const signedFile = new File([blob], newFilename, {
        type: "application/pdf",
      });

      setFilesToUpload((prev) => [...prev, signedFile]);
      setSignatures([]);
      setSelectedPdfUrl(null);
      toast.dismiss("signing");
      toast.success(
        "All signatures have been applied. Please press 'Approve' to submit."
      );
    } catch (error) {
      toast.dismiss("signing");
      console.error("Failed to embed signatures:", error);
      alert(`Could not create signed PDF. Error: ${error.message}`);
    }
  };

  const handleFindAndPlace = () => {
    if (!searchText || searchText.trim() === "") {
      toast.error("กรุณาพิมพ์ข้อความในช่องค้นหาเพื่อระบุตำแหน่ง");
      return;
    }

    const unplacedSignatures = signatures.filter((sig) => !sig.placed);
    if (unplacedSignatures.length === 0) {
      toast.error("ไม่พบลายเซ็นที่รอการจัดวาง (กรุณาเพิ่มลายเซ็นใหม่)");
      return;
    }
    const targetSignature = unplacedSignatures[unplacedSignatures.length - 1];
    const targetSignatureId = targetSignature.id;

    setTimeout(() => {
      const pdfWrapper = pdfWrapperRef.current;
      if (!pdfWrapper) {
        toast.error("ไม่พบ PDF wrapper");
        return;
      }

      const pageElement = pdfWrapper.querySelector(".react-pdf__Page");

      if (!pageElement) {
        toast.error(
          `ไม่สามารถเข้าถึงองค์ประกอบของหน้า ${currentPage} บนจอได้ กรุณาลองอีกครั้ง`
        );
        return;
      }

      const wrapperRect = pdfWrapper.getBoundingClientRect();
      const flexibleSearchText = searchText.trim().split("").join("\\s*");
      const searchPattern = new RegExp(flexibleSearchText.trim(), "i");
      let foundDetails = null;

      const textLayer = pageElement.querySelector(
        ".react-pdf__Page__textContent"
      );

      if (textLayer) {
        const textSpans = textLayer.querySelectorAll("span");
        for (const span of textSpans) {
          if (searchPattern.test(span.innerText)) {
            const spanRect = span.getBoundingClientRect();
            if (spanRect.width === 0 && spanRect.height === 0) continue;

            const newSignatureHeight = spanRect.height * 4;
            const newSignatureWidth =
              newSignatureHeight / signatureAspectRatio.current;
            const targetCenterX =
              spanRect.left - wrapperRect.left + spanRect.width / 2;
            const targetCenterY =
              spanRect.top - wrapperRect.top + spanRect.height / 2;

            foundDetails = {
              page: currentPage,
              position: {
                x: targetCenterX - newSignatureWidth / 2,
                y: targetCenterY - newSignatureHeight / 2,
              },
              size: {
                width: newSignatureWidth,
                height: newSignatureHeight,
              },
            };
            break;
          }
        }
      }

      if (foundDetails) {
        setSignatures((prev) =>
          prev.map((sig) =>
            sig.id === targetSignatureId
              ? { ...sig, ...foundDetails, placed: true }
              : sig
          )
        );

        toast.success(`พบข้อความบนหน้า ${currentPage} และวางลายเซ็นแล้ว`);
        pageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        toast.error(
          `ไม่พบข้อความ "${searchText}" ในหน้าปัจจุบัน (หน้าที่ ${currentPage})`
        );
      }
    }, 300);
  };

  const handleDeleteSignature = (idToDelete) => {
    setSignatures((prevSignatures) =>
      prevSignatures.filter((signature) => signature.id !== idToDelete)
    );
  };

  // --- 4. Loading Guard (Placed after hooks and before data dependent logic) ---
  if (loading) return <div>Loading details...</div>;
  if (!request || !workflow) return <div>Could not load data.</div>;

  // --- 5. Derived State (Variables that depend on 'request' and 'user') ---
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
    setHasViewedPdf(true);
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

  const stepRequiresSignature =
    request.current_step_details?.is_signature_required;

  const stepRequiresAttachment =
    request.current_step_details?.requires_attachment;

  const isSignatureRequirementMet = () => {
    if (!stepRequiresSignature) {
      return true;
    }
    return filesToUpload.some((file) => file.name.startsWith("signed_"));
  };

  // ✅ 1. Logic ตรวจสอบไฟล์จากประวัติทั้งหมด (ไม่ว่าจะอยู่ Step ไหน)
  // ใช้ Optional Chaining ป้องกัน Error
  const isAnyHistoryAttachment = request?.history?.some((h) =>
    h.attachments.some((att) => att.file === selectedPdfUrl)
  );

  // ✅ 2. ตรวจสอบไฟล์ที่เพิ่งแนบใหม่ (Blob URL)
  const isNewUpload = selectedPdfUrl && selectedPdfUrl.startsWith("blob:");

  // ✅ 3. เงื่อนไขการแสดงปุ่มเซ็น (รองรับทั้งไฟล์เก่าและไฟล์ใหม่)
  const showSignButton =
    canApprove &&
    (isAnyHistoryAttachment || isNewUpload) &&
    stepRequiresSignature;

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

  // --- 6. Render ---
  return (
    <div className="procurement-detail-container">
      <div className="detail-header">
        <h1>{request.title}</h1>
        {request.category_details && (
          <span className="category-badge-detail">
            {request.category_details.name}
          </span>
        )}
        {/* <div style={{ marginTop: "1rem" }}>
          <button
            onClick={handleTestPdf}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            🛠️ Test Generate PDF
          </button>
        </div> */}
        {request.document_number && (
          <p>
            <strong>เลขที่หนังสือ:</strong> {request.document_number}
          </p>
        )}
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
        <div className="document-viewer-section" ref={viewerContainerRef}>
          <div
            className={`document-header ${
              isHeaderVisible ? "visible" : "hidden"
            }`}
          >
            {isHeaderVisible && (
              <>
                <div className="header-left-controls">
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
                  <div className="page-controls">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage <= 1}
                    >
                      &lsaquo;
                    </button>
                    <span className="page-indicator">
                      Page {currentPage} of {numPages || "--"}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= numPages}
                    >
                      &rsaquo;
                    </button>
                  </div>

                  {signatures.length > 0 && (
                    <div className="auto-place-controls">
                      <button onClick={handleFindAndPlace}>
                        <FiSearch /> ค้นหา & วางตำแหน่ง
                      </button>
                    </div>
                  )}
                </div>

                <div className="header-right-actions">
                  {showSignButton && (
                    <button
                      className="sign-document-btn"
                      onClick={handleOpenSignatureModal}
                    >
                      <FiEdit3
                        style={{ marginRight: "8px", verticalAlign: "middle" }}
                      />
                      ใส่ลายเซ็น
                    </button>
                  )}

                  {signatures.length > 0 && (
                    <button
                      className="clear-all-btn"
                      onClick={handleClearAllSignatures}
                      title="ลบลายเซ็นทั้งหมด"
                    >
                      <FiRefreshCw style={{ marginRight: "5px" }} />
                      ลบลายเซ็นทั้งหมด
                    </button>
                  )}

                  <button
                    className="apply-signature-btn"
                    onClick={handleEmbedSignature}
                    disabled={signatures.length === 0}
                  >
                    <FiSave
                      style={{ marginRight: "8px", verticalAlign: "middle" }}
                    />
                    บันทึก
                  </button>
                  <button
                    className="close-viewer-btn"
                    onClick={() => setSelectedPdfUrl(null)}
                  >
                    &times; ปิดมุมมอง
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            className="header-toggle-btn"
            onClick={() => setIsHeaderVisible((prev) => !prev)}
          >
            {isHeaderVisible ? "▲ ซ่อนเมนู pdf" : "▼ แสดงเมนู pdf"}
          </button>

          <div className="pdf-viewer-wrapper" ref={pdfWrapperRef}>
            {signatures
              .filter((sig) => sig.page === currentPage)
              .map((sig) => {
                const nodeRef = React.createRef();
                return (
                  <Draggable
                    key={sig.id}
                    nodeRef={nodeRef}
                    bounds="parent"
                    position={sig.position}
                    /* ✅ (สำคัญ) ป้องกันการลากเมื่อกดโดนจุดย่อขยาย */
                    cancel=".custom-handle"
                    onStop={(e, data) => {
                      setSignatures((prev) =>
                        prev.map((s) =>
                          s.id === sig.id
                            ? { ...s, position: { x: data.x, y: data.y } }
                            : s
                        )
                      );
                    }}
                  >
                    <div
                      ref={nodeRef}
                      className="signature-container"
                      style={{
                        position: "absolute",
                        cursor: "move",
                        width: `${sig.size.width}px`,
                        height: `${sig.size.height}px`,
                      }}
                    >
                      <button
                        className="delete-signature-btn"
                        onClick={() => handleDeleteSignature(sig.id)}
                        title="ลบลายเซ็นนี้"
                      >
                        &times;
                      </button>

                      {sig.type === "type" && (
                        <button
                          onClick={() => handleEditSignature(sig)}
                          title="แก้ไขข้อความ"
                          className="edit-signature-btn"
                          style={{
                            position: "absolute",
                            top: "-12px",
                            left: "28px",
                            zIndex: 12,
                            width: "24px",
                            height: "24px",
                            backgroundColor: "#0d6efd",
                            color: "white",
                            border: "1px solid white",
                            borderRadius: "50%",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          }}
                        >
                          <FiEdit3 size={12} />
                        </button>
                      )}

                      {/* --- ✅ ปุ่ม Zoom In/Out (จะถูกซ่อนบนมือถือโดย CSS) --- */}
                      <div className="signature-zoom-controls">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResizeSignature(sig.id, 1.1);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          // ✅ ป้องกัน Touch Event ไม่ให้ทะลุ
                          onTouchStart={(e) => e.stopPropagation()}
                          className="zoom-btn"
                          title="ขยาย"
                        >
                          <FiPlus size={10} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResizeSignature(sig.id, 0.9);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          // ✅ ป้องกัน Touch Event ไม่ให้ทะลุ
                          onTouchStart={(e) => e.stopPropagation()}
                          className="zoom-btn"
                          title="ย่อ"
                        >
                          <FiMinus size={10} />
                        </button>
                      </div>

                      <ResizableBox
                        width={sig.size.width}
                        height={sig.size.height}
                        /* ✅ เปิดใช้งานจุดลากที่มุมขวาล่าง */
                        resizeHandles={["se"]}
                        onResize={(event, { size }) => {
                          setSignatures((prev) =>
                            prev.map((s) =>
                              s.id === sig.id
                                ? {
                                    ...s,
                                    size: {
                                      width: size.width,
                                      height: size.height,
                                    },
                                  }
                                : s
                            )
                          );
                        }}
                        lockAspectRatio={true}
                        className="signature-resizable-box"
                        /* ✅ สร้างจุดลากและหยุด Event เมื่อแตะโดน */
                        handle={(h, ref) => (
                          <span
                            className={`custom-handle custom-handle-${h}`}
                            ref={ref}
                            onTouchStart={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                        )}
                      >
                        <img
                          src={sig.image}
                          alt="Your Signature"
                          draggable="false"
                          style={{ width: "100%", height: "100%" }}
                        />
                      </ResizableBox>
                    </div>
                  </Draggable>
                );
              })}

            <div className="pdf-viewer-container" ref={pdfContainerRef}>
              <Document
                file={selectedPdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
              >
                {numPages && containerWidth > 0 && (
                  <div className="pdf-page">
                    <Page
                      key={`page_${currentPage}`}
                      pageNumber={currentPage}
                      width={containerWidth}
                      scale={pdfScale}
                      onLoadSuccess={onPageLoadSuccess}
                      renderTextLayer={true}
                    />
                  </div>
                )}
              </Document>
            </div>
          </div>
        </div>
      )}
      <div className="approval-section">
        <div className="history-card">
          <h2>Approval History</h2>
          <div className="history-timeline">
            {request.history.map((h, index) => {
              // ✅ 1. ตรวจสอบว่าเป็น History รายการล่าสุดหรือไม่
              const isLatestHistory = index === request.history.length - 1;

              return (
                <div key={h.id} className={`history-item action-${h.action}`}>
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
                      สังกัด: {h.approved_by_details.department_name || "N/A"}
                    </span>
                    {h.approved_by_details.groups.map((g) => (
                      <span key={g.id} className="group-badge">
                        {g.name}
                      </span>
                    ))}
                  </div>
                  {h.notes && <p className="history-notes">{h.notes}</p>}
                  {h.document_number && (
                    <p className="history-step-doc-number">
                      <strong>เลขที่เอกสารอ้างอิง:</strong> {h.document_number}
                    </p>
                  )}
                  <div className="history-attachments">
                    {h.attachments.map((att) => (
                      <div
                        key={att.id}
                        // ✅ 2. เพิ่ม Class highlight-latest ถ้าเป็นรายการล่าสุด
                        className={`attachment-item ${
                          isLatestHistory ? "highlight-latest" : ""
                        }`}
                      >
                        <a
                          href={att.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="attachment-link"
                        >
                          📎 {att.name}
                          {/* ✅ 3. เพิ่ม Badge ย้ำเตือน User */}
                          {isLatestHistory && (
                            <span className="latest-file-badge">
                              เอกสารปัจจุบัน
                            </span>
                          )}
                        </a>
                        {att.file.toLowerCase().endsWith(".pdf") && (
                          <button
                            // ✅ 4. เปลี่ยน Style ปุ่ม View ให้เด่นขึ้น
                            className={`view-pdf-btn ${
                              isLatestHistory ? "btn-highlight" : ""
                            }`}
                            onClick={() => handleViewPdf(att)}
                          >
                            {/* ✅ 5. เปลี่ยนข้อความปุ่มเพื่อกระตุ้น Action */}
                            {isLatestHistory ? "View & Sign" : "View"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!request.is_completed &&
              !request.is_cancelled &&
              request.current_step_details && (
                <div className="history-item current-step-item">
                  <p className="history-step-name">
                    {request.current_step_details.name}
                    <span className="status-badge-pending">Current Step</span>
                  </p>

                  <div className="current-step-info">
                    <div
                      className="history-meta"
                      style={{ marginBottom: "0.5rem" }}
                    >
                      Status: <strong>Waiting for Approval</strong>
                    </div>

                    <div className="approver-details">
                      <span>รอการอนุมัติจาก: </span>
                      {request.current_step_details.responsible_group_details &&
                      request.current_step_details.responsible_group_details
                        .length > 0 ? (
                        request.current_step_details.responsible_group_details.map(
                          (g) => (
                            <span key={g.id} className="waiting-badge">
                              {g.name}
                            </span>
                          )
                        )
                      ) : (
                        <span className="waiting-badge">N/A</span>
                      )}
                    </div>

                    {request.current_step_due_date && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.85rem",
                          color: "#dc3545",
                        }}
                      >
                        📅 Due Date:{" "}
                        {new Date(
                          request.current_step_due_date
                        ).toLocaleDateString("en-GB")}
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* ✅ 3. (แถม) กรณีงานจบแล้ว Show Completed */}
            {request.is_completed && (
              <div className="history-item" style={{ marginBottom: 0 }}>
                <style>{`.history-item.completed-final::before { content: "🏁"; background-color: #0d6efd; }`}</style>
                <div
                  className="history-item completed-final"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                  }}
                ></div>{" "}
                {/* Trick for style styling via css class if needed, or inline below */}
                <div style={{ position: "relative" }}>
                  {/* Override dot manually for simple finish */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-2.2rem",
                      top: 0,
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: "#0d6efd",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.9rem",
                    }}
                  >
                    🏁
                  </div>
                  <p className="history-step-name" style={{ color: "#0d6efd" }}>
                    Process Completed
                  </p>
                  <div className="history-meta">
                    คำขอได้รับการอนุมัติเสร็จสิ้นสมบูรณ์
                  </div>
                </div>
              </div>
            )}
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
              {request.current_step_details?.requires_document_number && (
                <div className="form-group">
                  <label htmlFor="documentNumber">เลขที่หนังสือ (จำเป็น)</label>
                  <input
                    type="text"
                    id="documentNumber"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                </div>
              )}
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
                <label htmlFor="approval_attachments">
                  Attach Files
                  {stepRequiresAttachment && (
                    <span style={{ color: "red", marginLeft: "4px" }}>
                      (จำเป็น)
                    </span>
                  )}
                </label>
                <input
                  type="file"
                  id="approval_attachments"
                  multiple
                  onChange={handleFileChange}
                  className="upload-input"
                />
                {fileUploadError && (
                  <p className="file-upload-error">{fileUploadError}</p>
                )}
              </div>

              {filesToUpload.length > 0 && (
                <div className="file-preview-list">
                  {filesToUpload.map((file, index) => (
                    <div key={index} className="file-preview-item">
                      <span className="file-preview-name">
                        {decodeURIComponent(file.name)}
                      </span>
                      {file.type === "application/pdf" && (
                        <button
                          onClick={() => {
                            setSelectedPdfUrl(URL.createObjectURL(file));
                            setHasViewedPdf(true);
                          }}
                          className="view-pdf-btn-prominent"
                        >
                          Preview
                        </button>
                      )}
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

              {canApprove && (
                <>
                  {stepRequiresSignature && !hasViewedPdf && (
                    <p className="single-warning-message">
                      ⚠️ กรุณากดปุ่ม "Preview" เพื่อตรวจสอบและลงนามในเอกสาร PDF
                      ก่อนทำการอนุมัติ
                    </p>
                  )}
                  {stepRequiresSignature &&
                    hasViewedPdf &&
                    !isSignatureRequirementMet() && (
                      <p className="single-warning-message">
                        ⚠️ กรุณา "บันทึก & วางลายเซ็น" บนเอกสาร PDF
                        ก่อนทำการอนุมัติ
                      </p>
                    )}
                  {!stepRequiresSignature && !hasViewedPdf && (
                    <p className="single-warning-message">
                      💡 กรุณากดปุ่ม "Preview" เพื่อตรวจสอบเอกสารก่อนอนุมัติ
                    </p>
                  )}
                </>
              )}

              {canApprove && (
                <>
                  {stepRequiresAttachment && filesToUpload.length === 0 && (
                    <p className="single-warning-message">
                      ⚠️ ขั้นตอนนี้บังคับให้ต้องแนบไฟล์ กรุณาเลือกไฟล์อย่างน้อย
                      1 รายการ
                    </p>
                  )}
                </>
              )}

              <button
                onClick={handleApprove}
                className="approve-button"
                disabled={
                  !canApprove ||
                  isSubmitting ||
                  (stepRequiresSignature && !isSignatureRequirementMet()) ||
                  (stepRequiresAttachment && filesToUpload.length === 0)
                }
              >
                {isSubmitting ? "Submitting..." : "ยืนยันการอนุมัติ"}
              </button>

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
              {canApprove && (
                <button
                  type="button"
                  className="send-back-button"
                  onClick={() => setIsSendBackModalOpen(true)}
                >
                  ส่งงานกลับ
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {showCancelButton && (
        <div className="cancel-section">
          <p>กรณีส่งงานผิดพลาดและต้องการยกเลิกคำขอ</p>
          <button onClick={handleCancelRequest} className="cancel-button">
            ยกเลิกคำขอนี้
          </button>
        </div>
      )}
      <div style={{ marginTop: "2rem" }}>
        <Link to="/procurement" className="nav-link">
          ← กลับหน้าแสดงงานทั้งหมด
        </Link>
      </div>

      {/* --- ✅ ส่งค่า initialData ไปให้ Modal --- */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={handleCloseSignatureModal}
        onSave={handleSaveSignature}
        typedSignatureFont="'Sarabun', sans-serif"
        initialData={signatureToEdit}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={executeCancellation}
        title="Confirm Cancellation"
      >
        Are you sure you want to cancel this request? This action cannot be
        undone.
      </ConfirmModal>
      <Modal
        isOpen={isSendBackModalOpen}
        onClose={() => setIsSendBackModalOpen(false)}
        title="Send Back for Revision"
      >
        {/* --- ✅ ส่ง steps แทน history --- */}
        {workflow && request && (
          <SendBackModal
            steps={workflow.steps} // ส่ง Step ทั้งหมดของ Template
            currentStep={request.current_step_details} // ส่ง Step ปัจจุบัน
            onSendBack={handleSendBack}
            onCancel={() => setIsSendBackModalOpen(false)}
          />
        )}
      </Modal>
      {isSubmitting && (
        <div className="submission-overlay">
          <div className="submission-content">
            <div className="submission-spinner"></div>
            <h3>กำลังบันทึกข้อมูล...</h3>
            <p>ระบบกำลังอัปโหลดไฟล์และประมวลผล</p>
            {filesToUpload.length > 0 && (
              <p style={{ marginTop: "0.5rem" }}>
                (เนื่องจากมีไฟล์แนบ อาจใช้เวลาสักครู่)
              </p>
            )}
            <p className="submission-warning">
              ⚠️ กรุณาอย่าปิดหน้าต่าง หรือกดปุ่มย้อนกลับ
            </p>
          </div>
        </div>
      )}
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default ProcurementDetailPage;
