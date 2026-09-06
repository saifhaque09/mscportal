import { useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";

export default function useFilingApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeReview, setCodeReview] = useState(null);
  const [filingStatus, setFilingStatus] = useState(null);
  const [signedDocuments, setSignedDocuments] = useState([]);
  const [signedDocsLoading, setSignedDocsLoading] = useState(false);
  const [craDocuments, setCraDocuments] = useState([]);
  const [craDocsLoading, setCraDocsLoading] = useState(false);

  const reviewCodes = async (firmId, year) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (year) {
      formData.append("year", year);
    }

    try {
      const response = await api.post(
        `clients/business/${firmId}/filing/codes/review`,
        formData
      );

      if (response?.data?.success) {
        setCodeReview(response.data.payload);
        return response.data.payload;
      } else {
        toast.error("Failed to load CRA codes");
        setError("Failed to load CRA codes");
        setCodeReview(null);
        return null;
      }
    } catch (err) {
      const msg = "Error loading CRA codes";
      toast.error(msg);
      setError(msg);
      setCodeReview(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const startFiling = async (firmId, year, filingType) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("firm_id", firmId);
    formData.append("year", year);
    formData.append("filing_type", filingType);

    try {
      const response = await api.post(`clients/business/filing/start`, formData);

      if (response?.data?.success) {
        toast.success(
          response.data.message === "FILING_ALREADY_STARTED"
            ? "Filing already in progress"
            : "Filing started"
        );
        return response.data.payload;
      } else {
        toast.error("Failed to start filing");
        setError("Failed to start filing");
        return null;
      }
    } catch (err) {
      const msg = "Error starting filing";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getLatestFiling = async (firmId) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post(`clients/business/${firmId}/filing/latest`);

      if (response?.data?.success) {
        setFilingStatus(response.data.payload);
        return response.data.payload;
      } else {
        setFilingStatus(null);
        return null;
      }
    } catch (err) {
      setError("Error loading filing status");
      setFilingStatus(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getFilingStatus = async (filingId) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post(`clients/business/filing/${filingId}/status`);

      if (response?.data?.success) {
        setFilingStatus(response.data.payload);
        return response.data.payload;
      } else {
        setFilingStatus(null);
        return null;
      }
    } catch (err) {
      setError("Error loading filing status");
      setFilingStatus(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadFilingForm = async (filingId, file, title) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("document", file);
    if (title) {
      formData.append("title", title);
    }

    try {
      const response = await api.post(
        `clients/business/filing/${filingId}/upload-form`,
        formData
      );

      if (response?.data?.success) {
        toast.success("Filing sent to client");
        return response.data.payload;
      } else {
        toast.error("Failed to send filing");
        setError("Failed to send filing");
        return null;
      }
    } catch (err) {
      const msg = "Error sending filing";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Alternative to uploadFilingForm — the accountant either uploads the form
  // as a file or hands the client a link to it, never both.
  const sendFilingLink = async (filingId, link) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("document_send_status", "link");
    formData.append("link", link);

    try {
      const response = await api.post(
        `clients/business/filing/${filingId}/send-link`,
        formData
      );

      if (response?.data?.success) {
        toast.success("Document link sent to client");
        return response.data.payload;
      } else {
        toast.error("Failed to send document link");
        setError("Failed to send document link");
        return null;
      }
    } catch (err) {
      const msg = "Error sending document link";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadSignedFiling = async (filingId, file) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await api.post(
        `clients/business/filing/${filingId}/upload-signed`,
        formData
      );

      if (response?.data?.success) {
        toast.success("Signed copy uploaded");
        return response.data.payload;
      } else {
        toast.error("Failed to upload signed copy");
        setError("Failed to upload signed copy");
        return null;
      }
    } catch (err) {
      const msg = "Error uploading signed copy";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getSignedDocuments = async (filingId) => {
    setSignedDocsLoading(true);
    setError("");

    try {
      const response = await api.post(
        `clients/business/filing/${filingId}/signed-documents`
      );

      if (response?.data?.success) {
        setSignedDocuments(response.data.payload ?? []);
        return response.data.payload;
      } else if (response?.data?.message === "RECORDS_NOT_FOUND") {
        setSignedDocuments([]);
        return null;
      } else {
        setError("Failed to load signed documents");
        setSignedDocuments([]);
        return null;
      }
    } catch (err) {
      setError("Error loading signed documents");
      setSignedDocuments([]);
      return null;
    } finally {
      setSignedDocsLoading(false);
    }
  };

  // status is one of: pending | approved | rejected | required
  const updateSignedDocumentStatus = async (
    filingId,
    documentId,
    status,
    comment
  ) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("status", status);
    formData.append("comment", comment ?? "");

    try {
      const response = await api.post(
        `clients/business/filing/${filingId}/signed-documents/${documentId}/status`,
        formData
      );

      if (response?.data?.success) {
        toast.success("Document status updated");
        return response.data.payload ?? true;
      } else {
        toast.error("Failed to update document status");
        setError("Failed to update document status");
        return null;
      }
    } catch (err) {
      const msg = "Error updating document status";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Step 5 — the proof-of-filing documents the accountant gets back from CRA.
  // Accountant-only upload; the client just reads the list.
  const uploadCraDocument = async (filingId, file) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await api.post(
        `clients/business/filing/${filingId}/upload-cra-document`,
        formData
      );

      if (response?.data?.success) {
        toast.success("CRA document uploaded");
        return response.data.payload;
      } else {
        toast.error("Failed to upload CRA document");
        setError("Failed to upload CRA document");
        return null;
      }
    } catch (err) {
      const msg = "Error uploading CRA document";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // payload is a flat array of {id, doc_name, file_url, uploaded_by,
  // uploaded_at} — not wrapped in a `data` key like the paginated listings.
  const getCraDocuments = async (filingId) => {
    setCraDocsLoading(true);
    setError("");

    try {
      const response = await api.post(
        `clients/business/filing/${filingId}/cra-documents`
      );

      if (response?.data?.success) {
        setCraDocuments(response.data.payload ?? []);
        return response.data.payload;
      } else if (response?.data?.message === "RECORDS_NOT_FOUND") {
        setCraDocuments([]);
        return null;
      } else {
        setError("Failed to load CRA documents");
        setCraDocuments([]);
        return null;
      }
    } catch (err) {
      setError("Error loading CRA documents");
      setCraDocuments([]);
      return null;
    } finally {
      setCraDocsLoading(false);
    }
  };

  const markFiled = async (filingId, confirmationNumber) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (confirmationNumber) {
      formData.append("cra_confirmation_number", confirmationNumber);
    }

    try {
      const response = await api.post(
        `clients/business/filing/${filingId}/mark-filed`,
        formData
      );

      if (response?.data?.success) {
        toast.success("Filing marked as filed");
        return response.data.payload;
      } else {
        toast.error("Failed to mark filing as filed");
        setError("Failed to mark filing as filed");
        return null;
      }
    } catch (err) {
      const msg = "Error marking filing as filed";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    codeReview,
    filingStatus,
    reviewCodes,
    startFiling,
    getLatestFiling,
    getFilingStatus,
    uploadFilingForm,
    sendFilingLink,
    uploadSignedFiling,
    signedDocuments,
    signedDocsLoading,
    getSignedDocuments,
    updateSignedDocumentStatus,
    uploadCraDocument,
    getCraDocuments,
    craDocuments,
    craDocsLoading,
    markFiled,
  };
}
