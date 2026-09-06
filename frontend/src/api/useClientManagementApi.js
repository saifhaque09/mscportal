import { useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";

export default function useClientManagementApi() {
  const [loading, setLoading] = useState(false);
  const [checklistLoader, setLoaderChecklist] = useState(true);
  const [error, setError] = useState("");
  const [checklistItems, setChecklistItems] = useState([]);
  const [meta, setMeta] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
const [checklistSubcategories, setChecklistSubcategories] = useState([]);
  const [documentData, setDocumentData] = useState([]);
  const [documentMeta, setDocumentMeta] = useState([]);
  const [userData, setUserData] = useState([]);
  const [userMeta, setUserMeta] = useState([]);
  const [viewDocument, setViewDocument] = useState([]);
  const [parentItems, setParentItems] = useState([]);
  const [defaultChecklistItems, setDefaultChecklistItems] = useState([]);
  const [viewDefaultChecklist, setViewDefaultChecklist] = useState([]);
  const [businessCheckData, setBusinessCheckData] = useState([]);

const [viewChecklists,setviewChecklist]=useState([])
const [viewLoader,setViewLoader]=useState(true)
const [firmCodes, setFirmCodes] = useState([]);
const [firmCodesLoader, setFirmCodesLoader] = useState(false);
const [firmCodesInfo, setFirmCodesInfo] = useState(null);
const [subcategoryCodesList, setSubcategoryCodesList] = useState([]);
const [subcategoryCodesListMeta, setSubcategoryCodesListMeta] = useState(null);
const [subcategoryCodesFirm, setSubcategoryCodesFirm] = useState(null);
const [subcategoryCodesListLoader, setSubcategoryCodesListLoader] = useState(false);
// Business-checklist endpoints are firm-scoped by URL param for every
// internal staff role (Admin/Accountant/Staff) — none of them belong to a
// single firm. Only Client/Employee have a personal "home" firm, stored at
// login as firmGuid. Checking only "accountant" here left Admin/Staff
// falling back to a firmGuid that was never set for them, silently
// returning null and rendering as an empty checklist with no error.
const STAFF_ROLES = ["admin", "accountant", "staff"];
const resolveFirmGuid = (firmId) => {
  const userRole = localStorage.getItem("userRole");
  return STAFF_ROLES.includes(userRole) ? firmId : localStorage.getItem("firmGuid");
};

const collectFilesRecursively = (nodes = []) => {
  let files = [];

  nodes.forEach(node => {
    if (node.files?.length) {
      files.push(...node.files);
    }
    if (node.children?.length) {
      files.push(...collectFilesRecursively(node.children));
    }
  });

  return files;
};



 const getAllChecklistItems = async (firmId, page, rows, search, year, month, options = {}) => {
  const formData = new FormData();
  setError("");
  setLoaderChecklist(true);

  try {
    const firmGuid = resolveFirmGuid(firmId);

    if (!firmGuid) {
      // toast.error("Firm GUID is required");
      setLoaderChecklist(false);
      return null;
    }

    if (search) {
      formData.append("search", search);
    }

    if (page) {
      formData.append("page", page);
    }

    if (rows) {
      formData.append("results_per_page", rows);
    }
    if (year) {
      formData.append("year", year);
    }
    if (month) {
      formData.append("month", month);
    }

    const response = await api.post(
      `/clients/business/${firmGuid}/checklist/all`,
      formData,
      options
    );

    if (response?.status === 204 || !response?.data) {
      setChecklistItems([]);
      setMeta({});
      setParentItems([]);
      return [];
    }

    if (response?.data?.success) {
    setChecklistItems(response?.data?.payload?.data ?? []);
setMeta(response?.data?.payload?.meta ?? {});

const parentsWithFiles = (response?.data?.payload?.data ?? []).map(parent => {
  const files = collectFilesRecursively(parent.children);

  return {
    id: parent.id,
    code: parent.code,
    name: parent.name,
    files,
    fileCount: files.length,
  };
});

setParentItems(parentsWithFiles);
return parentsWithFiles;
    } else {
      if (response?.data?.message === "RECORDS_NOT_FOUND") {
        // Empty list — not an error, no notification needed.
        setChecklistItems([]);
        setParentItems([]);
      } else {
        toast.error("Failed to fetch checklist items");
      }
      setError("Failed to fetch checklist items");
      return null;
    }
  } catch (err) {
    const msg =
      "Error fetching checklist items";
    toast.error(msg);
    setError(msg);
    return null;
  } finally {
    setLoaderChecklist(false);
  }
};

const viewChecklistSubcategories = async (firmId, code, page, rows) => {
  const formData = new FormData();
  setError("");
  setLoaderChecklist(true);

  try {
    const firmGuid = resolveFirmGuid(firmId);

    if (!firmGuid) {
      toast.error("Firm GUID is required");
      setLoaderChecklist(false);
      return null;
    }

    if (searchKeyword) {
      formData.append("search", searchKeyword);
    }

    if (page) {
      formData.append("page", page);
    }

    if (rows) {
      formData.append("results_per_page", rows);
    }

    const response = await api.post(
      `/clients/business/${firmGuid}/checklist/${code}/view`,
      formData
    );

    if (response?.data?.success) {
    setChecklistSubcategories(response?.data?.payload?.data ?? []);
setMeta(response?.data?.payload?.meta ?? {});



 

      return response?.data?.payload?.data ?? [];
    } else {
      toast.error("Failed to fetch items");
      setError("Failed to fetch items");
      return null;
    }
  } catch (err) {
    const msg =
        "Error fetching checklist items";
    toast.error(msg);
    setError(msg);
    return null;
  } finally {
    setLoaderChecklist(false);
  }
};
  const getClientChecklist = async ( page, rows, checkId, firmId,) => {
    const formData = new FormData();
    setError("");
setViewLoader(true)
    try {
      const firmGuid = firmId || localStorage.getItem("firmGuid");
      if (searchKeyword) {
        formData.append("search", searchKeyword);
      }
      if (page) {
        formData.append("page", page);
      }

      if (rows) {
        formData.append("results_per_page", rows);
      }
      const response = await api.post(
        
        `clients/business/${firmGuid}/checklist/${checkId}/view`,
        formData
      );

      if (response?.data?.success) {
        // setLoaderChecklist(false);
        setViewLoader(false)
        setviewChecklist(response.data.payload);
        setUserMeta(response?.data?.payload?.meta);
        return response.data.payload;
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          setviewChecklist([]);
        } else {
          toast.error("Failed to fetch checklist items");
        }
        setError("Failed to fetch checklist items");
        return null;
      }
    } catch (err) {
      const msg =
          "Error fetching checklist items";
      toast.error(msg);
     setViewLoader(false)
      setError(msg);
      return null;
    } finally {
      // setLoading(false);
    }
  }

  const getBusinessChecklistView = async (
    firmId,
    checklistCode,
    selectedYear,
    selectedMonth,
    options = {}
  ) => {
    setError("");
    setViewLoader(true);
const formData=new FormData()
    try {
      if (!options?.skipDateFilter) {
        const hasYear =
          selectedYear !== undefined &&
          selectedYear !== null &&
          String(selectedYear).trim() !== "";
        const hasMonth =
          selectedMonth !== undefined &&
          selectedMonth !== null &&
          String(selectedMonth).trim() !== "";

        if (hasYear) {
          formData.append("year", String(selectedYear));
        }
        if (hasMonth) {
          const rawMonth = Number(selectedMonth);
          const normalizedMonth =
            Number.isFinite(rawMonth) && rawMonth === 0 ? 1 : rawMonth;
          if (Number.isFinite(normalizedMonth)) {
            formData.append("month", normalizedMonth);
          }
        }
      }

      const response = await api.post(
        `/clients/business/${firmId}/checklist/${checklistCode}/view`,
        formData
      );
   setViewLoader(false);
      if (response?.data?.success) {
        setBusinessCheckData(response?.data?.payload ?? []);
     
        return response?.data?.payload ?? [];
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          setBusinessCheckData([]);
        } else {
          toast.error("Failed to fetch checklist items");
        }
        setError("Failed to fetch checklist items");
        return null;
      }
    } catch (err) {
      const msg = "Error fetching checklist items";
      toast.error(msg);
      setError(msg);
      setViewLoader(false)
      return null;
    } finally {
      setViewLoader(false);
    }
  };
  const createChecklistItem = async (firmGuid, itemData) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", itemData.name);
    // formData.append("code", itemData.code);
    formData.append("is_required", itemData.is_required);
    formData.append("category", itemData.category);
    formData.append("year",itemData.year)
   
    if (itemData.details) {
      formData.append("details", itemData.details);
    }

    try {
      const response = await api.post(
        `/clients/business/${firmGuid}/checklist/create`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Checklist item created successfully");
        return response.data;
      } else {
        toast.error("Failed to create checklist item");
        return null;
      }
    } catch (err) {
      const msg =
          "Error creating checklist item";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const createChecklistItemSubcategory = async (firmGuid, itemData) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", itemData.name);
    // formData.append("code", itemData.code);
    formData.append("is_required", itemData.is_required);
    formData.append("category", itemData.category);
    // formData.append("year",itemData.year)
    // formData.append("month",itemData.month)
    if (itemData.details) {
      formData.append("details", itemData.details);
    }

    try {
      const response = await api.post(
        `/clients/business/${firmGuid}/checklist/create`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Checklist item created successfully");
        return response.data;
      } else {
        toast.error("Failed to create checklist item");
        return null;
      }
    } catch (err) {
      const msg =
          "Error creating checklist item";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteChecklistItem = async (firmGuid, itemCode) => {
    setLoading(true);
    setError("");
    const formData = new FormData();

    // Append as an array by using array notation
    formData.append("code[]", itemCode);

    try {
      const response = await api.post(
        `/clients/business/${firmGuid}/checklist/delete`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Checklist item deleted successfully");
        return true;
      } else {
        toast.error("Failed to delete checklist item");
        return false;
      }
    } catch (err) {
      const msg =
          "Error deleting checklist item";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistItem = async (firmGuid, itemId, itemData) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", itemData.name);
    formData.append("code", itemData.code);
    formData.append("is_required", itemData.is_required);
    formData.append("category", itemData.category);
    formData.append("year", itemData.year);
    // formData.append("month", itemData.month);
    if (itemData.details) {
      formData.append("details", itemData.details);
    }

    try {
      const response = await api.post(
        `/clients/business/${firmGuid}/checklist/${itemId}/edit`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Checklist item updated successfully");
        return response.data;
      } else {
        toast.error("Failed to update checklist item");
        return null;
      }
    } catch (err) {
      const msg =
          "Error updating checklist item";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
    const updateChecklistItemSubcategory = async (firmGuid, itemId, itemData) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", itemData.name);
    formData.append("code", itemData.code);
    formData.append("is_required", itemData.is_required);
    formData.append("category", itemData.category);
    // formData.append("year", itemData.year);
    // formData.append("month", itemData.month);
    if (itemData.details) {
      formData.append("details", itemData.details);
    }

    try {
      const response = await api.post(
        `/clients/business/${firmGuid}/checklist/${itemId}/edit`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Checklist item updated successfully");
        return response.data;
      } else {
        toast.error("Failed to update checklist item");
        return null;
      }
    } catch (err) {
      const msg =
          "Error updating checklist item";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const uploadChecklistDocument = async (checklistCode, file , title,selectedyear,selectedmonth) => {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      
      formData.append("document", file);
      formData.append("title", title);
      if(selectedyear){
        formData.append("year",selectedyear)
      }
        if(selectedmonth){
        formData.append("month",selectedmonth)
      }
      const response = await api.post(
        `/clients/checklist/${checklistCode}/documents/upload`,
        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response?.data?.success) {
        toast.success("Document uploaded successfully");
        return response.data;
      } else {
        toast.error("Failed to upload document");
        return null;
      }
    } catch (err) {
      const msg =   "Error uploading document";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
  // Accountant-side counterpart to uploadChecklistDocument: posts several files
  // to one subcategory in a single request, on behalf of the client. The
  // endpoint takes no firm param — the checklist code is already firm-scoped.
  const bulkUploadChecklistDocuments = async (checklistCode, files, { year, month } = {}) => {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      Array.from(files ?? []).forEach((file) => {
        formData.append("documents[]", file);
      });
      if (year) {
        formData.append("year", year);
      }
      if (month) {
        formData.append("month", month);
      }

      const response = await api.post(
        `/clients/checklist/${checklistCode}/documents/bulk-upload`,
        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response?.data?.success) {
        const count = Array.from(files ?? []).length;
        toast.success(`${count} document${count === 1 ? "" : "s"} uploaded successfully`);
        return response.data;
      }
      toast.error("Failed to upload documents");
      return null;
    } catch (err) {
      const msg = "Error uploading documents";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

    const uploadAgreementDocument = async (firmId, file, metadata = {}) => {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("document", file);
      if (metadata?.title) {
        formData.append("title", metadata.title);
      }
      if (metadata?.altText) {
        formData.append("alt", metadata.altText);
      }

      const response = await api.post(
        `/clients/business/${firmId}/agreement/upload`,
        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response?.data?.success) {
        toast.success("Document uploaded successfully");
        return response.data;
      } else {
        toast.error("Failed to upload document");
        return null;
      }
    } catch (err) {
      const msg =   "Error uploading document";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const uploadClientLogo = async (firmId, file) => {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await api.post(
        `/clients/business/${firmId}/logo/upload`,
        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response?.data?.success) {
        toast.success("Logo uploaded successfully");
        return response.data;
      } else {
        toast.error("Failed to upload logo");
        return null;
      }
    } catch (err) {
      const msg = "Error uploading logo";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getClientLogo = async (firmId) => {
    try {
      const formData = new FormData();
      const response = await api.post(
        `/clients/business/${firmId}/logo/get`,
        formData
      );

      if (response?.data?.success) {
        return response?.data?.payload ?? null;
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  const deleteClientLogo = async (firmId) => {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      const response = await api.post(
        `/clients/business/${firmId}/logo/delete`,
        formData
      );

      if (response?.data?.success) {
        toast.success("Logo deleted successfully");
        return true;
      } else {
        toast.error("Failed to delete logo");
        return false;
      }
    } catch (err) {
      const msg = "Error deleting logo";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getAllChecklistDocuments = async (firmId, page, rows) => {
    const formData = new FormData();
    setError("");

    try {
      const firmGuid = resolveFirmGuid(firmId);

      if (searchKeyword) {
        formData.append("search", searchKeyword);
      }
      if (page) {
        formData.append("page", page);
      }

      if (rows) {
        formData.append("results_per_page", rows);
      }
      const response = await api.post(
        `clients/business/${firmGuid}/documents`,
        formData
      );

      if (response?.data?.success) {
        setLoaderChecklist(false);
        setDocumentData(response.data.payload.data);
        setDocumentMeta(response?.data?.payload?.meta);
        return response.data.payload;
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          setDocumentData([]);
        } else {
          toast.error("Failed to fetch checklist items");
        }
        setError("Failed to fetch checklist items");
        return null;
      }
    } catch (err) {
      const msg =
          "Error fetching checklist items";
      toast.error(msg);
      setLoaderChecklist(false);
      setError(msg);
      return null;
    } finally {
      // setLoading(false);
    }
  };

  const getAllDocuments = async (firmId, page, rows) => {
    const formData = new FormData();
    setError("");

    try {
      if (searchKeyword) {
        formData.append("search", searchKeyword);
      }
      if (page) {
        formData.append("page", page);
      }

      if (rows) {
        formData.append("results_per_page", rows);
      }
      const response = await api.post(
        `clients/business/${firmId}/documents`,
        formData
      );

      if (response?.data?.success) {
        setLoaderChecklist(false);
        setDocumentData(response?.data?.payload?.data);
        setDocumentMeta(response?.data?.payload?.meta);
        return response.data.payload;
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          setDocumentData([]);
        } else {
          toast.error("Failed to fetch checklist items");
        }
        setError("Failed to fetch checklist items");
        return null;
      }
    } catch (err) {
      const msg =
          "Error fetching checklist items";
      toast.error(msg);
      setLoaderChecklist(false);
      setError(msg);
      return null;
    } finally {
      // setLoading(false);
    }
  };
  const getAllBusinessUsers = async (firmId, page, rows) => {
    const formData = new FormData();
    setError("");
    setLoaderChecklist(true);

    try {
      const firmGuid = firmId || localStorage.getItem("firmGuid");
      if (searchKeyword) {
        formData.append("search", searchKeyword);
      }
      if (page) {
        formData.append("page", page);
      }

      if (rows) {
        formData.append("results_per_page", rows);
      }
      const response = await api.post(
        `users/business/${firmGuid}/all`,
        formData
      );

      if (response?.data?.success) {
        setUserData(response.data.payload.data);
        setUserMeta(response?.data?.payload?.meta);
        return response.data.payload;
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          setUserData([]);
        } else {
          toast.error("Failed to fetch checklist items");
        }
        setError("Failed to fetch checklist items");
        return null;
      }
    } catch (err) {
      const msg =
          "Error fetching checklist items";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoaderChecklist(false);
    }
  };
  const viewBusinessDocuments = async (chid, firmId) => {
    const formData = new FormData();
    setError("");

    try {
      const firmGuid = firmId || localStorage.getItem("firmGuid");
      const response = await api.post(
        `clients/business/${firmGuid}/checklist/${chid}/documents`
      );

      if (response?.data?.success) {
        setLoaderChecklist(false);
        setViewDocument(response.data.payload);
        setDocumentMeta(response?.data?.payload?.meta);
        return response.data.payload;
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          setViewDocument([]);
        } else {
          toast.error("Failed to fetch checklist items");
        }
        setError("Failed to fetch checklist items");
        return null;
      }
    } catch (err) {
      const msg =
          "Error fetching checklist items";
      toast.error(msg);
      setLoaderChecklist(false);
      setError(msg);
      return null;
    } finally {
      // setLoading(false);
    }
  };
const handleUserDelete=async(user)=>{
const formData=new FormData()
formData.append('users[]',user)
try{
  const response= await api.post('users/delete'
  ,  formData
  )
  
  toast.success(response?.data?.message)
  // console.log(response?.payload,'check')
  return response
}catch(err){
}
}

const createDefaultChecklist= async(itemData)=>{
  setLoading(true);

  const formData = new FormData();
    formData.append("name", itemData.name);
    // formData.append("code", itemData.code);
    formData.append("is_required", itemData.is_required);
    formData.append("category", itemData.category);
    if (itemData.details) {
      formData.append("details", itemData.details);
    }

    try {
      const response = await api.post(
        `/clients/checklist/create`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Checklist item created successfully");
        return response.data;
      } else {
        toast.error("Failed to create checklist item");
        return null;
      }
    } catch (err) {
      const msg =
          "Error creating checklist item";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
}

 const getAllDefaultChecklistItems = async (firmId, page, rows, search) => {
  const formData = new FormData();
  setError("");
  setLoaderChecklist(true);

  try {

    if (search) {
      formData.append("search", search);
    }

    if (page) {
      formData.append("page", page);
    }

    if (rows) {
      formData.append("results_per_page", rows);
    }

    const response = await api.post(
      `/clients/checklist/all`,
      formData
    );

    if (response?.data?.success) {
    setDefaultChecklistItems(response?.data?.payload?.data ?? []);
setMeta(response?.data?.payload?.meta ?? {})

      return response?.data?.payload?.data ?? [];
    } else {
      if (response?.data?.message === "RECORDS_NOT_FOUND") {
        // Empty list — not an error, no notification needed.
        setDefaultChecklistItems([]);
      } else {
        toast.error("Failed to fetch checklist items");
      }
      setError("Failed to fetch checklist items");
      return null;
    }
  } catch (err) {
    const msg =
      "Error fetching checklist items";
    toast.error(msg);
    setError(msg);
    return null;
  } finally {
    setLoaderChecklist(false);
  }
};

const getDefaultChecklist = async ( checkId, page, rows, searchKeyword) => {
    const params = {};
    setError("");
setViewLoader(true)
    try {

      if (searchKeyword) {
        params.search = searchKeyword;
      }
      if (page) {
        params.page = page;
      }

      if (rows) {
        params.results_per_page = rows;
      }
      const response = await api.get(

        `clients/checklist/default/${checkId}/view`,
        { params }
      );

      if (response?.data?.success) {
        setViewDefaultChecklist(response.data.payload);
        setViewLoader(false);
        setMeta(response?.data?.payload?.meta);
        return response.data.payload;
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          setViewDefaultChecklist([]);
        } else {
          toast.error("Failed to fetch checklist items");
        }
        setError("Failed to fetch checklist items");
        return null;
      }
    } catch (err) {
      const msg =
          "Error fetching checklist items";
      toast.error(msg);
      setLoaderChecklist(false);
      setError(msg);
      return null;
    } finally {
      // setLoading(false);
    }
  }

  const deleteDefaultChecklistItem = async (itemCode) => {
    setLoading(true);
    setError("");
    const formData = new FormData();

    // Append as an array by using array notation
    formData.append("code[]", itemCode);

    try {
      const response = await api.post(
        `/clients/checklist/delete`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Checklist item deleted successfully");
        return true;
      } else {
        toast.error("Failed to delete checklist item");
        return false;
      }
    } catch (err) {
      const msg =
          "Error deleting checklist item";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

    const updateDefaultChecklistItem = async (itemId, itemData) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", itemData.name);
    formData.append("code", itemData.code);
    formData.append("is_required", itemData.is_required);
    formData.append("category", itemData.category);
    if (itemData.details) {
      formData.append("details", itemData.details);
    }

    try {
      const response = await api.post(
        `/clients/checklist/default/${itemId}/edit`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Checklist item updated successfully");
        return response.data;
      } else {
        toast.error("Failed to update checklist item");
        return null;
      }
    } catch (err) {
      const msg =
          "Error updating checklist item";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const importDefaultChecklistItems = async (checkId, firmId, year) => {
    setLoading(true);
    setError("");
    const formData = new FormData();
    if (Array.isArray(checkId)) {
      checkId.forEach((id) => {
        formData.append("checklist[]", id);
      });
    } else {
      formData.append("checklist[]", checkId);
    }
    formData.append("business", firmId);
    if (year) {
      formData.append("year", year);
    }
    try {
      const response = await api.post(
        `/clients/checklist/import`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Default checklist items imported successfully");
        return response.data;
      } else {
        toast.error("Failed to import default checklist items");
        return null;
      }
    } catch (err) {
      const msg =
          "Error importing default checklist items";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getPendingDocumentsCount = async (firmGuid) => {
    try {
      const response = await api.get(`clients/checklist/${firmGuid}/documents/pending`);
      if (response?.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error("Error fetching pending documents count", err);
      return null;
    }
  };

  const getTotalDocumentsCount = async (firmGuid) => {
    try {
      const response = await api.get(`clients/checklist/${firmGuid}/documents/total`);
      if (response?.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error("Error fetching total documents count", err);
      return null;
    }
  };

  const getBusinessClientsCount = async () => {
    try {
      const response = await api.get(`clients/business/count`);
      if (response?.data?.success) {
        return response.data.payload;
      } else if (response?.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error("Error fetching business clients count", err);
      return null;
    }
  };

  const getIndividualClientsCount = async () => {
    try {
      const response = await api.get(`individual/count`);
      if (response?.data?.success) {
        return response.data.payload;
      } else if (response?.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error("Error fetching individual clients count", err);
      return null;
    }
  };

  const getPaymentsSummary = async () => {
    try {
      const response = await api.get(`clients/business/payments/summary`);
      if (response?.data?.success) {
        return response.data.payload;
      } else if (response?.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error("Error fetching payments summary", err);
      return null;
    }
  };

  const listFirmCodesByChecklistItem = async (firmId, checklistItemId) => {
    setFirmCodesLoader(true);
    setError("");

    try {
      const response = await api.get(
        `clients/business/${firmId}/checklist-items/${checklistItemId}/codes`
      );

      if (response?.data?.success) {
        setFirmCodes(response.data.payload?.data ?? []);
        setFirmCodesInfo({
          checklist_item_name: response.data.payload?.checklist_item_name ?? "",
          done_status: response.data.payload?.done_status ?? null,
        });
        return response.data.payload;
      } else if (response?.data?.message === "RECORDS_NOT_FOUND") {
        setFirmCodes([]);
        setFirmCodesInfo(null);
        return null;
      } else {
        toast.error("Failed to fetch codes");
        setFirmCodes([]);
        setFirmCodesInfo(null);
        return null;
      }
    } catch (err) {
      toast.error("Error fetching codes");
      setFirmCodes([]);
      setFirmCodesInfo(null);
      return null;
    } finally {
      setFirmCodesLoader(false);
    }
  };

  // The invoice detail fields (vendor/date/number/GST) are optional on the
  // backend — the listing returns them as null for older rows — so only send
  // the ones the accountant actually filled in.
  const appendCodeEntry = (formData, entry) => {
    formData.append("code", entry.code);
    formData.append("value", entry.value);
    formData.append("status", entry.status ?? "active");
    ["vendor_name", "invoice_date", "invoice_number", "gst_hst_tax"].forEach(
      (field) => {
        const val = entry[field];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          formData.append(field, String(val).trim());
        }
      }
    );
  };

  // Saves a single code/value entry. The endpoint takes one flat record per
  // call (not an items[] array), so callers with several rows loop and await.
  const saveFirmCode = async (firmId, checklistItemId, entry, year) => {
    setError("");

    const formData = new FormData();
    formData.append("firm_id", firmId);
    formData.append("checklist_item_id", checklistItemId);
    if (year) {
      formData.append("year", year);
    }
    appendCodeEntry(formData, entry);

    try {
      const response = await api.post(
        `clients/business/subcategory-codes/save`,
        formData
      );

      if (response?.data?.success) {
        return response.data.payload;
      } else {
        toast.error("Failed to save CRA code");
        setError("Failed to save CRA code");
        return null;
      }
    } catch (err) {
      const msg = "Error saving CRA code";
      toast.error(msg);
      setError(msg);
      return null;
    }
  };

  const updateFirmCode = async (firmId, checklistItemId, id, entry) => {
    setError("");

    const formData = new FormData();
    formData.append("id", id);
    formData.append("firm_id", firmId);
    formData.append("checklist_item_id", checklistItemId);
    appendCodeEntry(formData, entry);

    try {
      const response = await api.post(
        `clients/business/subcategory-codes/update`,
        formData
      );

      if (response?.data?.success) {
        toast.success("CRA code updated");
        return response.data.payload;
      } else {
        toast.error("Failed to update CRA code");
        setError("Failed to update CRA code");
        return null;
      }
    } catch (err) {
      const msg = "Error updating CRA code";
      toast.error(msg);
      setError(msg);
      return null;
    }
  };

  const listSubcategoryCodesByFirm = async (
    firmGuid,
    { page = 1, resultsPerPage = 10, search, year } = {}
  ) => {
    setSubcategoryCodesListLoader(true);
    setError("");

    const formData = new FormData();
    formData.append("page", page);
    formData.append("results_per_page", resultsPerPage);
    if (search) formData.append("search", search);
    if (year) formData.append("year", year);

    try {
      const response = await api.post(
        `clients/business/${firmGuid}/subcategory-codes`,
        formData
      );

      if (response?.data?.success) {
        setSubcategoryCodesList(response.data.payload?.data ?? []);
        setSubcategoryCodesListMeta(response.data.payload?.meta ?? null);
        setSubcategoryCodesFirm(response.data.payload?.firm ?? null);
        return response.data.payload;
      } else if (response?.data?.message === "RECORDS_NOT_FOUND") {
        setSubcategoryCodesList([]);
        setSubcategoryCodesListMeta(null);
        return null;
      } else {
        toast.error("Failed to fetch codes");
        setSubcategoryCodesList([]);
        setSubcategoryCodesListMeta(null);
        return null;
      }
    } catch (err) {
      toast.error("Error fetching codes");
      setSubcategoryCodesList([]);
      setSubcategoryCodesListMeta(null);
      return null;
    } finally {
      setSubcategoryCodesListLoader(false);
    }
  };

  const deleteFirmCode = async (id, firmId) => {
    setError("");

    const formData = new FormData();
    formData.append("id", id);
    formData.append("firm_id", firmId);

    try {
      const response = await api.post(
        `clients/business/subcategory-codes/delete`,
        formData
      );

      if (response?.data?.success) {
        toast.success("CRA code removed");
        setFirmCodes((prev) => prev.filter((row) => row.id !== id));
        return response.data.payload;
      } else {
        toast.error("Failed to remove CRA code");
        setError("Failed to remove CRA code");
        return null;
      }
    } catch (err) {
      const msg = "Error removing CRA code";
      toast.error(msg);
      setError(msg);
      return null;
    }
  };

  return {
    getAllChecklistItems,
    createChecklistItem,
    deleteChecklistItem,
    updateChecklistItem,
    bulkUploadChecklistDocuments,
    getClientChecklist,
    loading,
    error,
    checklistItems,
    meta,
    checklistLoader,
    uploadChecklistDocument,
    searchKeyword,
    setSearchKeyword,
    getAllChecklistDocuments,
    documentData,
    documentMeta,
    getAllBusinessUsers,
    viewDocument,
    parentItems,
    userData,
createChecklistItemSubcategory,
    viewChecklists,
   createDefaultChecklist,
   getAllDefaultChecklistItems,
   getDefaultChecklist,
   deleteDefaultChecklistItem,
   updateDefaultChecklistItem,
   importDefaultChecklistItems,
   defaultChecklistItems,
   viewLoader,
   userMeta,
   setParentItems,
   viewBusinessDocuments,
    getAllDocuments,
    handleUserDelete,
    uploadAgreementDocument,
    uploadClientLogo,
    getClientLogo,
    deleteClientLogo,
    viewDefaultChecklist,
    updateChecklistItemSubcategory,
    getBusinessChecklistView,
    businessCheckData,
    getPendingDocumentsCount,
    getTotalDocumentsCount,
    getBusinessClientsCount,
    getIndividualClientsCount,
    getPaymentsSummary,
    listFirmCodesByChecklistItem,
    saveFirmCode,
    updateFirmCode,
    deleteFirmCode,
    firmCodes,
    firmCodesLoader,
    firmCodesInfo,
    listSubcategoryCodesByFirm,
    subcategoryCodesList,
    subcategoryCodesListMeta,
    subcategoryCodesFirm,
    subcategoryCodesListLoader,
  };
}
