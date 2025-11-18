// frontend/src/pages/ProcurementDetailPage.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import apiClient from "../api";
import { useAuth } from "../context/AuthContext";
import ProcessStepper from "../components/ProcessStepper.jsx";
import SignatureModal from "../components/SignatureModal.jsx";
import "./ProcurementDetailPage.css";
import ConfirmModal from "../components/ConfirmModal";

import SendBackModal from "../components//SendBackModal"; // ✅ IMPORT
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
  FiRefreshCw,
  FiSearch,
  FiEdit3,
  FiSave,
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
  // const [signatureSize, setSignatureSize] = useState({
  //   width: 200,
  //   height: 100,
  // });
  // const [signatureImage, setSignatureImage] = useState(null);
  const [pdfPageDetails, setPdfPageDetails] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  // const [signaturePosition, setSignaturePosition] = useState(null);

  const [signatures, setSignatures] = useState([]);

  // preview เอกสารก่อนส่งต่อ //
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [hasViewedPdf, setHasViewedPdf] = useState(false);

  const handleSaveSignature = (signatureDataUrl) => {
    const img = new Image();
    img.src = signatureDataUrl;
    img.onload = () => {
      const initialWidth = 200;
      const aspectRatio = img.height / img.width;
      signatureAspectRatio.current = aspectRatio; // useRef ยังใช้ได้เหมือนเดิม

      const newSignature = {
        id: `sig-${Date.now()}`,
        page: currentPage,
        image: signatureDataUrl,
        position: { x: 50, y: 50 },
        size: {
          width: initialWidth,
          height: initialWidth * aspectRatio,
        },
      };

      // ✅ เพิ่ม Object ลายเซ็นใหม่เข้าไปใน Array
      setSignatures((prev) => [...prev, newSignature]);
      handleCloseSignatureModal();
    };
  };

  const [currentPage, setCurrentPage] = useState(1);

  const [isSendBackModalOpen, setIsSendBackModalOpen] = useState(false);
  const handleSendBack = async (data) => {
    try {
      const response = await apiClient.post(
        `/api/procurement/requests/${requestId}/send-back/`,
        data
      );
      setRequest(response.data); // Update the page with the new state
      setIsSendBackModalOpen(false);
      // You can add a success toast message here
    } catch (error) {
      console.error("Failed to send back step", error);
      // You can add an error toast message here
    }
  };

  const [searchText, setSearchText] = useState("วรวิ");

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

  // ✅ ADD THIS useEffect TO CLEAN UP THE OBJECT URL
  useEffect(() => {
    return () => {
      // Clean up function to revoke the URL when the component unmounts
      // or when the previewPdfUrl state changes
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]); // ✅ Dependency array to run the effect when the URL changes

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [selectedPdfUrl]);

  const handleCancelRequest = () => {
    setIsConfirmModalOpen(true);
  };

  // This is the new function that runs when the user confirms
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
      setIsConfirmModalOpen(false); // Close the modal
    }
  };

  // const onDocumentLoadSuccess = (pdf) => {
  //   setNumPages(pdf.numPages);
  //   pdf.getPage(1).then((page) => {
  //     setPdfPageDetails({
  //       originalWidth: page.originalWidth,
  //       originalHeight: page.originalHeight,
  //     });
  //   });
  // };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1); // << สำคัญ: รีเซ็ตเป็นหน้า 1 เสมอ
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
  const handleCloseSignatureModal = () => setIsSignatureModalOpen(false);
  // const handleSaveSignature = (signatureDataUrl) => {
  //   const img = new Image();
  //   img.src = signatureDataUrl;
  //   img.onload = () => {
  //     const initialWidth = 200;
  //     const aspectRatio = img.height / img.width;

  //     signatureAspectRatio.current = aspectRatio;

  //     setSignatureSize({
  //       width: initialWidth,
  //       height: initialWidth * aspectRatio,
  //     });
  //   };
  //   const container = pdfWrapperRef.current;
  //   if (container) {
  //     setSignaturePosition({ x: 50, y: container.scrollTop + 50 });
  //   } else {
  //     setSignaturePosition({ x: 50, y: 50 });
  //   }
  //   setSignatureImage(signatureDataUrl);
  //   handleCloseSignatureModal();
  // };

  const handleResize = (event, { size }) => {
    setSignatureSize({ width: size.width, height: size.height });
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
      return; // หยุดการทำงานถ้าผู้ใช้กด "Cancel"
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("notes", notes);

    // ✨ --- เพิ่มโค้ดส่วนนี้เข้าไป --- ✨
    // ตรวจสอบว่าขั้นตอนนี้บังคับให้กรอกเลขที่หนังสือหรือไม่
    if (request.current_step_details?.requires_document_number) {
      // ถ้าบังคับ และผู้ใช้ได้กรอกข้อมูลแล้ว
      if (documentNumber && documentNumber.trim() !== "") {
        // ให้แนบข้อมูลเลขที่หนังสือลงไปใน formData
        formData.append("document_number", documentNumber);
      } else {
        // ถ้าจำเป็นแต่ยังไม่ได้กรอก ให้แจ้งเตือนและหยุดการทำงาน
        alert("Please enter the required document number for this step.");
        setIsSubmitting(false); // ปลดล็อกปุ่ม
        return;
      }
    }
    // ✨ --- สิ้นสุดส่วนที่เพิ่ม --- ✨

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
      setDocumentNumber(""); // ✨ เคลียร์ค่าใน state หลังส่งสำเร็จ
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
      const MAX_FILENAME_LENGTH = 150; // ✅ กำหนดความยาวสูงสุดที่นี่

      const tooLongFiles = newFiles.filter(
        (file) => file.name.length > MAX_FILENAME_LENGTH
      );

      if (tooLongFiles.length > 0) {
        setFileUploadError(
          `ชื่อไฟล์ยาวเกิน ${MAX_FILENAME_LENGTH} ตัวอักษร: ${tooLongFiles
            .map((f) => f.name)
            .join(", ")}`
        );
        return; // หยุดการทำงานของฟังก์ชัน
      }

      setFileUploadError(""); // เคลียร์ข้อความ error หากไม่มีปัญหา
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

        // ✅ [KEY FIX] ดึงค่า CSS Style ของ Wrapper เพื่อหาค่า Padding
        const wrapperStyle = window.getComputedStyle(pdfWrapper);
        const wrapperPaddingLeft = parseFloat(wrapperStyle.paddingLeft);
        const wrapperPaddingTop = parseFloat(wrapperStyle.paddingTop);

        const signaturesOnThisPage = signatures.filter(
          (sig) => sig.page === pageNum
        );

        for (const sig of signaturesOnThisPage) {
          // ... (ส่วนโหลดรูปภาพเหมือนเดิม) ...
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

          // ✅ [KEY FIX] ใช้สูตรคำนวณใหม่ที่รวมค่า Padding เข้าไปด้วย

          // 1. หาตำแหน่งของลายเซ็นบนหน้าจอ (Viewport)
          // โดยอ้างอิงจากขอบของ wrapper + padding + ตำแหน่งของลายเซ็นเอง
          const signatureScreenX =
            wrapperRect.left + wrapperPaddingLeft + sig.position.x;
          const signatureScreenY =
            wrapperRect.top + wrapperPaddingTop + sig.position.y;

          // 2. หาตำแหน่งของลายเซ็นที่สัมพันธ์กับขอบของ Canvas
          // โดยการนำตำแหน่งบนหน้าจอของลายเซ็น ลบด้วยตำแหน่งบนหน้าจอของ Canvas
          const signatureRelativeX_px = signatureScreenX - canvasRect.left;
          const signatureRelativeY_px = signatureScreenY - canvasRect.top;

          // 3. แปลงค่าจาก Pixel (หน้าจอ) ไปเป็น Point (PDF)
          const pointsPerPixel = pageDimensions.width / canvasRect.width;
          const sigWidthPts = sig.size.width * pointsPerPixel;
          const sigHeightPts = sig.size.height * pointsPerPixel;
          // ✅ [KEY FIX] กำหนดค่า Offset เป็นหน่วย "Pixel" ที่นี่
          // ลองเริ่มจากค่าน้อยๆ เช่น 5-15 แล้วค่อยๆ ปรับหาค่าที่เหมาะสม
          const X_OFFSET_PIXELS = 50; // ค่าบวก: เลื่อนไปทางขวา
          const Y_OFFSET_PIXELS = 50; // ค่าบวก: เลื่อนลงล่าง

          // ✅ [KEY FIX] นำค่า Offset (Pixel) ไปบวกก่อนที่จะแปลงเป็น Point
          let xPts = (signatureRelativeX_px + X_OFFSET_PIXELS) * pointsPerPixel;
          let yPts =
            pageDimensions.height -
            (signatureRelativeY_px + Y_OFFSET_PIXELS) * pointsPerPixel -
            sigHeightPts;

          // const X_OFFSET_POINTS = 33; // ค่าบวก: เลื่อนไปทางขวา
          // const Y_OFFSET_POINTS = 33; // ค่าบวก: เลื่อนลงล่าง

          // xPts += X_OFFSET_POINTS;
          // yPts -= Y_OFFSET_POINTS; // แกน Y ต้องใช้เครื่องหมายลบเพื่อเลื่อนลง

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

      // ... (ส่วนบันทึกไฟล์และเคลียร์ state เหมือนเดิม) ...
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

  // const handleFindAndPlace = () => {
  //   if (!searchText) {
  //     toast.error("กรุณาพิมพ์ชื่อเพื่อค้นหา");
  //     return;
  //   }

  //   const pdfWrapper = pdfWrapperRef.current;
  //   if (!pdfWrapper) {
  //     toast.error("ไม่พบ PDF wrapper");
  //     return;
  //   }

  //   // Wait for text layer to render
  //   setTimeout(() => {
  //     const pages = pdfWrapper.querySelectorAll(".react-pdf__Page");
  //     if (!pages || pages.length === 0) {
  //       toast.error("ไม่พบหน้าของ PDF");
  //       return;
  //     }

  //     for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
  //       const page = pages[pageIndex];
  //       const textLayer = page.querySelector(".react-pdf__Page__textContent");
  //       if (!textLayer) {
  //         console.warn(`Text layer not found for page ${pageIndex + 1}`);
  //         continue;
  //       }

  //       if (!textLayer.children.length) {
  //         console.warn(
  //           `Text layer for page ${pageIndex + 1} is empty or not rendered`
  //         );
  //         continue;
  //       }

  //       const textSpans = textLayer.querySelectorAll("span");
  //       for (const span of textSpans) {
  //         if (span.innerText.includes(searchText)) {
  //           const pageRect = page.getBoundingClientRect();
  //           const textRect = span.getBoundingClientRect();

  //           console.log("Page Rect:", {
  //             left: pageRect.left,
  //             top: pageRect.top,
  //             width: pageRect.width,
  //             height: pageRect.height,
  //           });
  //           console.log("Text Rect:", {
  //             left: textRect.left,
  //             top: textRect.top,
  //             width: textRect.width,
  //             height: textRect.height,
  //           });

  //           const newX = (textRect.left - pageRect.left) / pdfScale;
  //           const newY = (textRect.top - pageRect.top) / pdfScale;

  //           console.log(`Found "${searchText}" at position:`, {
  //             x: newX,
  //             y: newY,
  //             page: pageIndex + 1,
  //             scale: pdfScale,
  //           });

  //           setSignaturePosition({ x: newX, y: newY, page: pageIndex + 1 });
  //           toast.success(
  //             `พบ "${searchText}" บนหน้า ${pageIndex + 1} และวางลายเซ็นแล้ว`
  //           );
  //           page.scrollIntoView({ behavior: "smooth" });
  //           return;
  //         }
  //       }
  //     }

  //     toast.error(`ไม่พบ "${searchText}" ในเอกสาร`);
  //   }, 500); // Delay to ensure text layer rendering
  // };
  // console.log("Current pdfScale:", pdfScale);

  const handleFindAndPlace = () => {
    if (!searchText || searchText.trim() === "") {
      toast.error("กรุณาพิมพ์ข้อความในช่องค้นหาเพื่อระบุตำแหน่ง");
      return;
    }

    // ✅ [BUG FIX] เปลี่ยน Logic ให้หาลายเซ็น "ตัวล่าสุด" ที่ยังไม่ถูกจัดวาง
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

      // ✅ [FINAL FIX] แก้ไขให้หาเฉพาะหน้าที่แสดงผลอยู่ ณ ปัจจุบันเพียงหน้าเดียว
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

            const newSignatureHeight = spanRect.height * 2.5;
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
      return true; // ถ้าไม่ต้องการลายเซ็น ก็ถือว่าผ่าน
    }
    // ถ้าต้องการลายเซ็น ให้ตรวจว่ามีไฟล์ "signed_..." อยู่ในรายการอัปโหลดหรือไม่
    return filesToUpload.some((file) => file.name.startsWith("signed_"));
  };

  const isPdfFromLastStep = request.history.some(
    (h) =>
      h.id === latestHistoryEntryId &&
      h.attachments.some((att) => att.file === selectedPdfUrl)
  );
  const showSignButton =
    canApprove && isPdfFromLastStep && stepRequiresSignature;

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
        <div className="document-viewer-section">
          <div
            className={`document-header ${
              isHeaderVisible ? "visible" : "hidden"
            }`}
          >
            {isHeaderVisible && (
              <>
                {/* ===== LEFT SECTION ===== */}
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
                      {/* <input
                        type="text"
                        id="signatureSearch"
                        name="signatureSearch"
                        placeholder="ค้นหาชื่อเพื่อวางลายเซ็น..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        disabled
                      /> */}
                      <button onClick={handleFindAndPlace}>
                        <FiSearch /> ค้นหา & วางตำแหน่ง
                      </button>
                    </div>
                  )}
                </div>

                {/* ===== RIGHT SECTION ===== */}
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
          {/* ปุ่ม toggle เฉพาะ mobile */}
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
                      <ResizableBox
                        width={sig.size.width}
                        height={sig.size.height}
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
            {request.history.map((h) => (
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
                          onClick={() => handleViewPdf(att)}
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
                {/* ✅ เพิ่มส่วนแสดงผลข้อความแจ้งเตือน error ของการอัปโหลดไฟล์ */}
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

              {/* ✅ รวมข้อความแจ้งเตือนให้เป็นหนึ่งเดียวและใช้เงื่อนไขแบบรวมศูนย์ */}
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
                  {/* ... ข้อความแจ้งเตือนอื่นๆ ... */}
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
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={handleCloseSignatureModal}
        onSave={handleSaveSignature}
        typedSignatureFont="'Sarabun', sans-serif"
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
        <SendBackModal
          history={request.history}
          onSendBack={handleSendBack}
          onCancel={() => setIsSendBackModalOpen(false)}
        />
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
