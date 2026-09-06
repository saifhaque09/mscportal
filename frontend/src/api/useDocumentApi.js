import { useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";

export default function useDocumentApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checklistDocuments, setChecklistDocuments] = useState([]);
  const [recentFilingStatus, setRecentFilingStatus] = useState([]);

  const getRecentDocumentFilingStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/clients/documents/recent");
      if (response?.data?.success) {
        setRecentFilingStatus(response.data.payload || []);
        return response.data.payload;
      } else {
        setRecentFilingStatus([]);
        return [];
      }
    } catch (err) {
      setError("Error fetching document filing status");
      return [];
    } finally {
      setLoading(false);
    }
  };

 const viewChecklistDocument = async (checklistGuid, firmGuid) => {
  setLoading(true);
  setError("");

  try {
    const firmId = firmGuid || localStorage.getItem("firmGuid");

    const response = await api.post(
      `/clients/business/${firmId}/checklist/${checklistGuid}/documents`,
      {},
      { headers: { Accept: "application/json" } }
    );

    if (response?.data?.success) {
      const documents = 
        response?.data?.payload
      
      setChecklistDocuments(documents);
      return documents;
    }

    if (response?.data?.message === "RECORDS_NOT_FOUND") {
      // Empty list — not an error, no notification needed.
      setChecklistDocuments([]);
    } else {
      toast.error("Failed to fetch clients Documents");
    }
    setError("Failed to fetch clients Documents");
    return [];
  } catch (err) {
    const msg =
        "Failed to fetch clients Documents";
    toast.error(msg);
    setError(msg);
    return [];
  } finally {
    setLoading(false);
  }
};


  const addDocumentRemark = async (checklistGuid, fileHash, comment) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file_hash", fileHash);
    formData.append("comment", comment);

    try {
      const response = await api.post(
        `/clients/checklist/${checklistGuid}/documents/comment`,
        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response?.data?.success) {
        toast.success("Remark added successfully");
        return response.data;
      } else {
        toast.error("Failed to add remark");
        setError("Failed to add remark");
        return null;
      }
    } catch (err) {
      const msg =   "Failed to add remark";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const changeDocumentStatus = async (checklistGuid, fileHash, status) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file_hash", fileHash);
    formData.append("status", status);

    try {
      const response = await api.post(
        `/clients/checklist/${checklistGuid}/documents/status`,
        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response?.data?.success) {
        toast.success("Status updated successfully");
        return response.data;
      } else {
        toast.error("Failed to update status");
        setError("Failed to update status");
        return null;
      }
    } catch (err) {
      const msg =   "Failed to update status";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (checklistGuid, fileName) => {
  setLoading(true);
  setError("");

  const formData = new FormData();
  formData.append("file_hash[]", fileName);

  try {
    const response = await api.post(
      `/clients/checklist/${checklistGuid}/documents/delete`,
      formData,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (response?.data?.success) {
      toast.success("Document deleted successfully");
      return response.data;
    } else {
      toast.error("Failed to delete document");
      setError("Failed to delete document");
      return null;
    }
  } catch (err) {
    const msg =   "Failed to delete document";
    toast.error(msg);
    setError(msg);
    return null;
  } finally {
    setLoading(false);
  }
};
  const viewDocument = async (fileName) => {
  setLoading(true);
  setError("");
 

  try {
    const response = await api.get(
      `/clients/file/get/${fileName}`,
     
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }
    );


  } catch (err) {
    const msg =   "No record found";
    toast.error(msg);
    setError(msg);
    return null;
  } finally {
    setLoading(false);
  }
};

const downloadDocument = async (checklistGuid, fileName) => { 
  setLoading(true);
  setError("");

  try {
    const response = await api.get(
      `/clients/checklist/${checklistGuid}/documents/download`,
      {
        params: {
          'file_name[]': fileName 
        },
        headers: {
          Accept: "application/x-zip",
        },
        responseType: 'blob' 
      }
    );

    // Create blob from response
    const blob = new Blob([response.data], { type: 'application/zip' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'download.zip');
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.success("Document downloaded successfully");
    return response.data;
    
  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      err.response.data.text().then((text) => {
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message === "DOCUMENTS_NOT_FOUND") {
            toast.error("No files to download");
            setError("No files to download");
          } else {
            toast.error(errorData?.message || "Failed to download document");
            setError(errorData?.message || "Failed to download document");
          }
        } catch (e) {
          toast.error("Failed to download document");
          setError("Failed to download document");
        }
      });
    } else {
      const msg = err?.response?.data?.message;
      if (msg === "DOCUMENTS_NOT_FOUND") {
        toast.error("No files to download");
        setError("No files to download");
      } else {
        toast.error(msg ?? "Failed to download document");
        setError(msg ?? "Failed to download document");
      }
    }
    return null;
  } finally {
    setLoading(false);
  }
};


const editDocumentTitle = async (fileHash, title) => {
  setLoading(true);
  setError("");

  const formData = new FormData();
  formData.append("file_hash", fileHash);
  formData.append("title", title);

  try {
    const response = await api.post(
      `/clients/file/update`,
      formData,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (response?.data?.success) {
      toast.success("Document title updated successfully");
      return response.data;
    } else {
      toast.error("Failed to update document title");
      setError("Failed to update document title");
      return null;
    }
  } catch (err) {
    const msg =   "Failed to update document title";
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
    checklistDocuments,
    recentFilingStatus,
    addDocumentRemark,
    changeDocumentStatus,
    viewChecklistDocument,
    deleteDocument,
    downloadDocument,
    editDocumentTitle,
    viewDocument,
    getRecentDocumentFilingStatus,
  };
}
