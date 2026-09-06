import api from "@/utils/axiosInstance";
import axios from "axios";
import React, { useState, useCallback } from "react";
import { toast } from "react-toastify";
const useTaxfilerApi = () => {
  const [categoryData, setCategoryData] = useState([]);
  const [userCategoryData, setUserCategoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loader, setLoader] = useState(false);
  const [dashboardLoader, setDashboardLoader] = useState(true);
  const [documentLoader, setDocumentLoader] = useState(true);
  const [error, setError] = useState();
  const [individualDocuments, setIndividualDocuments] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [accountantCategory, setAccountantCategory] = useState([]);
  const [subCategoryMeta,setSubcategoryMeta]=useState([])
  const [selectedCategory,setSelectedCategory]=useState([])
  const [getDocuments,setGetDocument]=useState([])
  const [subcategoryName,setSubcategoryName]=useState()
  const [docsLoads,setDocsLoader]=useState(true)
  const [subcategoryDocuments, setSubcategoryDocuments] = useState([])
  const [subcategoryDocsInfo, setSubcategoryDocsInfo] = useState(null)
  const [subcategoryDocsLoader, setSubcategoryDocsLoader] = useState(false)
  const [subcategoryCodesList, setSubcategoryCodesList] = useState([])
  const [subcategoryCodesListMeta, setSubcategoryCodesListMeta] = useState({})
  const [subcategoryCodesInfo, setSubcategoryCodesInfo] = useState(null)
  const [subcategoryCodesListLoader, setSubcategoryCodesListLoader] = useState(false)
  const [subCategoriesByCategory, setSubCategoriesByCategory] = useState([])
  const [subCategoriesByCategoryLoader, setSubCategoriesByCategoryLoader] = useState(false)

  const getAllCategories = useCallback(async () => {
    setLoader(true);
    try {
      const response = await api.get(`/individual/categories/all`);
      setCategoryData(response?.data?.payload?.data);
    } catch (err) {
    } finally {
      setLoader(false);
    }
  }, []);

  const getMyCodesSummary = useCallback(async () => {
    try {
      const response = await api.get(`individual/taxcategory/subcategory-codes/my-summary`);
      if (response?.data?.success) {
        return response.data.payload;
      }
      return null;
    } catch (err) {
      console.error("Error fetching my CRA codes summary", err);
      return null;
    }
  }, []);

  const getSubCategoriesByCategory = useCallback(async (categoryId) => {
    setSubCategoriesByCategoryLoader(true);
    try {
      const response = await api.get(
        `/individual/categories/${categoryId}/subcategories`,
        { params: { results_per_page: 100 } }
      );
      if (response?.data?.success) {
        setSubCategoriesByCategory(response.data.payload?.data ?? []);
        return response.data.payload;
      }
      setSubCategoriesByCategory([]);
      return null;
    } catch (err) {
      setSubCategoriesByCategory([]);
      return null;
    } finally {
      setSubCategoriesByCategoryLoader(false);
    }
  }, []);

  const saveUserCategory = useCallback(async (categoryIds, year) => {
    const formData = new FormData();
    try {
      categoryIds.forEach((item, key) => {
        formData.append(`category_ids[${key}]`, item);
      });
      if (year) {
        formData.append("year", String(year));
      }
      const response = await api.post("individual/categories/save", formData);
      toast.success(response?.data?.message);
      return response.data;
    } catch (err) {
      toast.error(err?.response?.data?.message);
    }
  }, []);

  const getUserCategories = useCallback(async ( page, rows, search,year) => {
    setLoader(true);
    try {
      const formData=new FormData()
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
      const response = await api.post(`individual/categories/getuser`, formData);
      setUserCategoryData(response?.data?.payload?.data??[]);
   setSubcategoryMeta(response?.data?.payload?.meta ?? {});
    } catch (err) {
      setUserCategoryData([])
      setSubcategoryMeta();
    } finally {
      setLoader(false);
    }
  }, []);

  const uploadCategoryDocument = useCallback(async (
    checklistCode,
    file,
    title,
    selectedyear,
    selectedmonth,
    userCategory,
  ) => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();

      formData.append("document", file);
      formData.append("title", title);
      if (selectedyear) {
        formData.append("year", selectedyear);
      }
      if (selectedmonth) {
        formData.append("month", selectedmonth);
      }
      formData.append("sub_tax_category_id", checklistCode);
      const response = await api.post(
        `/individual/taxcategory/documents/upload`,

        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        },
      );

      // if (response?.data?.success) {
      toast.success("Document uploaded successfully");
      return response.data;
      // }
      // else {
      //   toast.error("Failed to upload document");
      //   return null;
      // }
    } catch (err) {
      const msg = "Error uploading document";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCategoryDocuments = useCallback(async (id) => {
    setDocumentLoader(true);
    const formData = new FormData();
    try {
      // formData.append(')
      const response = await api.get(
        `individual/taxcategory/${id}/listdocuments`,
      );
      setDocumentLoader(false);
      setIndividualDocuments(response?.data?.payload?.data);
      setCategoryName(response?.data?.payload);
    } catch (err) {
      setDocumentLoader(false);
    }
  }, []);

  const getAllAccountantCategories = useCallback(async (id,page, rows, search,year) => {
    setDashboardLoader(true);
    const formData = new FormData();

    try {
      formData.append("user_id", id);
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
      const response = await api.post(
        `/individual/categories/taxfiler`,
        formData,
      );
      setAccountantCategory(response?.data?.payload?.data);
      setDashboardLoader(false);
      // console.log(response?.data?.success,'response')
      if(response?.data?.success===false){
        setAccountantCategory([])
      }
    } catch (err) {
    setAccountantCategory([]);
      setDashboardLoader(false);
    } finally {
      setLoader(false);
    }
  }, []);

  const addCommentDocuments = useCallback(async (
id, fileHash, comment,userid
    // title,
    // selectedyear,
    // selectedmonth,
    // userCategory,
  ) => {
setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file_hash", fileHash);
    formData.append("comment", comment);
formData.append("user_id", userid);
    try {



      // if (selectedyear) {
      //   formData.append("year", selectedyear);
      // }
      // if (selectedmonth) {
      //   formData.append("month", selectedmonth);
      // }
      // formData.append("user_tax_category_id", userCategory);
      const response = await api.post(
        `/individual/taxcategory/${id}/documents/comment`,

        formData,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response?.data) {
      toast.success("Comment Added successfully");
      return response.data;
      }
      // else {
      //   toast.error("Failed to upload document");
      //   return null;
      // }
    } catch (err) {
      const msg = "Error ";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCategory = useCallback(async (categoryIds, year) => {
    const formData = new FormData();
    try {
      (categoryIds ?? []).forEach((item, key) => {
        formData.append(`category_ids[${key}]`, item);
      });
      if (year) {
        formData.append("year", String(year));
      }
      const response = await api.post("individual/categories/update", formData);
      toast.success(response?.data?.message);
      return response.data;
    } catch (err) {
      toast.error(err?.response?.data?.message);
    }
  }, []);

  //individual/categories/selected
const getSelectedCategories = useCallback(async(userId)=>{
try{
  const formData = new FormData();
  if (userId) {
    formData.append("user_id", userId);
  }
  const response=await api.post('individual/categories/selected', formData)
  setSelectedCategory(response?.data?.payload?.data)
  return response?.data?.payload?.data ?? [];
}catch(err)
{
  return [];
}
}, []);

const gettaxFilerDocuments = useCallback(async(userTaxCategory,Id)=>{
  setDocsLoader(true)
  // individual/taxfilers/13/taxcategory/2/listdocuments
 try{ const response=await api.get(`individual/taxfilers/${userTaxCategory}/taxcategory/${Id}/listdocuments`)
  setGetDocument(response?.data?.payload?.data)
  setSubcategoryName(response?.data?.payload?.sub_category_name)
  setDocsLoader(false)
 }
 catch(err){
  setDocsLoader(false)
 }
}, []);

const getSubcategoryDocuments = useCallback(async (userId, subTaxCategoryId) => {
  setSubcategoryDocsLoader(true);
  try {
    const response = await api.post(
      `individual/taxfilers/${userId}/subcategories/${subTaxCategoryId}/documents`
    );
    const payload = response?.data?.payload ?? {};
    setSubcategoryDocuments(payload?.data ?? []);
    setSubcategoryDocsInfo({
      taxfiler: payload?.taxfiler ?? null,
      sub_category_name: payload?.sub_category_name ?? "",
      sub_tax_category_id: payload?.sub_tax_category_id ?? null,
    });
  } catch (err) {
    setSubcategoryDocuments([]);
    setSubcategoryDocsInfo(null);
  } finally {
    setSubcategoryDocsLoader(false);
  }
}, []);

const saveSubcategoryCodes = useCallback(async (userId, subTaxCategoryId, codeValuePairs) => {
  try {
    const formData = new FormData();
    if (userId) formData.append("user_id", String(userId));
    formData.append("sub_tax_category_id", String(subTaxCategoryId));
    codeValuePairs.forEach((pair, idx) => {
      formData.append(`code_array[${idx + 1}]`, String(pair.code));
      formData.append(`value_array[${idx + 1}]`, String(pair.value));
    });
    const response = await api.post(
      "individual/taxcategory/subcategory-codes/save",
      formData
    );
    if (response?.data?.success) {
      toast.success("Codes saved successfully");
    }
    return response?.data;
  } catch (err) {
    toast.error(err?.response?.data?.message ?? "Failed to save codes");
    return null;
  }
}, []);


const updateDocumentStatus=async(id,fileHash,status,userId)=>{
  try{
    const formData=new FormData()
    formData.append("file_hash",fileHash)
    formData.append('status',status)
    formData.append('user_id',userId)
    const response=await api.post(`individual/taxcategory/${id}/documents/status`,formData)
    
    if(response?.data){
toast.success('Status Updated')
    }
    return response?.data
  }catch(err){
  }
}


const getSubcategoryCodesList = useCallback(async (userId, subTaxCategoryId, { page, resultsPerPage, search } = {}) => {
  setSubcategoryCodesList([]);
  setSubcategoryCodesListLoader(true);
  try {
    const formData = new FormData();
    formData.append("sub_tax_category_id", String(subTaxCategoryId));
    if (page) formData.append("page", String(page));
    if (resultsPerPage) formData.append("results_per_page", String(resultsPerPage));
    if (search) formData.append("search", search);
    const response = await api.post(
      `individual/taxfilers/${userId}/subcategory-codes/list`,
      formData
    );
    const payload = response?.data?.payload ?? {};
    setSubcategoryCodesList(payload?.data ?? []);
    setSubcategoryCodesListMeta(payload?.meta ?? {});
    setSubcategoryCodesInfo({
      sub_category_name: payload?.sub_category_name ?? "",
      sub_category_code: payload?.sub_category_code ?? "",
      sub_tax_category_id: subTaxCategoryId,
    });
  } catch (err) {
    setSubcategoryCodesList([]);
    setSubcategoryCodesListMeta({});
    setSubcategoryCodesInfo(null);
  } finally {
    setSubcategoryCodesListLoader(false);
  }
}, []);

const updateSubcategoryCode = useCallback(async (userId, id, code, value ,subTaxCategoryId) => {
  try {
    const formData = new FormData();
    if (userId) formData.append("user_id", String(userId));
    formData.append("code", String(code));
    formData.append("value", String(value));
    formData.append("id", String(id));
    formData.append("sub_tax_category_id", String(subTaxCategoryId));
    const response = await api.post(
      `individual/taxcategory/subcategory-codes/update`,
      formData
    );
    if (response?.data?.success) {
      toast.success("Code updated successfully");
    }
    return response?.data;
  } catch (err) {
    toast.error(err?.response?.data?.message ?? "Failed to update code");
    return null;
  }
}, []);

const deleteSubcategoryCode = useCallback(async (userId, id) => {
  try {
    const formData = new FormData();
    if (userId) formData.append("user_id", String(userId));
     if (id) formData.append("id", String(id));
    const response = await api.post(
      `individual/taxcategory/subcategory-codes/delete`,
      formData
    );
    if (response?.data?.success) {
      toast.success("Code deleted successfully");
    }
    return response?.data;
  } catch (err) {
    toast.error(err?.response?.data?.message ?? "Failed to delete code");
    return null;
  }
}, []);

const subCategorystatusUpdate = useCallback(async (subTaxCategoryId, year, status) => {
  const formData = new FormData();
  if (subTaxCategoryId !== undefined && subTaxCategoryId !== null) {
    formData.append("sub_tax_category_id", String(subTaxCategoryId));
  }
  if (year) {
    formData.append("year", String(year));
  }
  if (status) {
    formData.append("status", String(status));
  }

  try {
    const response = await api.post(
      `individual/taxcategory/subcategories/complete`,
      formData,
    );
    return response?.data;
  } catch (err) {
    toast.error(err?.response?.data?.message ?? "Failed to update status");
    return null;
  }
}, []);

const uploadIncomeTaxReturn = useCallback(async (userId, file, title, year) => {
  try {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("title", title);
    if (year) formData.append("year", String(year));
    const response = await api.post(
      `individual/taxfilers/${userId}/income-tax-return/upload`,
      formData,
      { headers: { Accept: "application/json", "Content-Type": "multipart/form-data" } }
    );
    if (response?.data?.success) {
      toast.success("Tax return form uploaded successfully");
    }
    return response?.data;
  } catch (err) {
    toast.error(err?.response?.data?.message ?? "Failed to upload tax return form");
    return null;
  }
}, []);


const deleteDocuments = async (subTaxCategoryId,file_hash) => {
  const formData = new FormData();

  try {
    formData.append('file_hash[]',file_hash)
    const response = await api.post(
      `individual/taxcategory/${subTaxCategoryId}/documents/delete`,
      formData,
    );
    return response?.data;
  } catch (err) {
    toast.error(err?.response?.data?.message ?? "Failed to update status");
    return null;
  }
};
// individual/taxcategory/2/documents/delete
// individual/taxcategory/2/documents/edit
const editDocuments = async (subTaxCategoryId,file_hash,title) => {
  const formData = new FormData();
  
  try {
    formData.append('file_hash',file_hash)
    
      formData.append('title',title)
    
    const response = await api.post(
      `individual/taxcategory/${subTaxCategoryId}/documents/edit`,
      formData,
    );
    return response?.data;
  } catch (err) {
    toast.error(err?.response?.data?.message ?? "Failed to update status");
    return null;
  }
};
const downloadAllSubcategoriesZip = async (userId, year) => {
  try {
    const response = await api.get(
      `individual/accountant/tax-filer/${userId}/year/${year}/download-all-zip`,
      {
        responseType: 'blob',
        headers: {
          Accept: "application/x-zip",
        },
      }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    let fileName = `all_documents_${year}.zip`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match?.[1]) fileName = match[1];
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      err.response.data.text().then((text) => {
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message === "DOCUMENTS_NOT_FOUND") {
            toast.error("No files to download");
          } else {
            toast.error(errorData?.message || "Download failed");
          }
        } catch (e) {
          toast.error("Download failed");
        }
      });
    } else {
      const msg = err?.response?.data?.message;
      if (msg === "DOCUMENTS_NOT_FOUND") {
        toast.error("No files to download");
      } else {
        toast.error(msg ?? "Download failed");
      }
    }
  }
};

const downloadSubcategoryZip = async (userId, subCategoryId, year) => {
  try {
    const response = await api.get(
      `individual/accountant/tax-filer/${userId}/subcategory/${subCategoryId}/year/${year}/download-zip`,
      {
        responseType: 'blob',
        headers: {
          Accept: "application/x-zip",
          
        },
      } 
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    let fileName = `subcategory_${subCategoryId}_${year}.zip`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match?.[1]) fileName = match[1];
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      err.response.data.text().then((text) => {
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message === "DOCUMENTS_NOT_FOUND") {
            toast.error("No files to download");
          } else {
            toast.error(errorData?.message || "Download failed");
          }
        } catch (e) {
          toast.error("Download failed");
        }
      });
    } else {
      const msg = err?.response?.data?.message;
      if (msg === "DOCUMENTS_NOT_FOUND") {
        toast.error("No files to download");
      } else {
        toast.error(msg ?? "Download failed");
      }
    }
  }
};

// individual/taxcategory/4/documents/download?year=2026
const downloadDocumentsSubcategory = async (subTaxCategoryId, year) => {
  try {
    const response = await api.get(
      `individual/taxcategory/${subTaxCategoryId}/documents/download?year=${year}`,
      {
        responseType: 'blob', // 
      }
    );

    // Create file URL
    const url = window.URL.createObjectURL(new Blob([response.data]));

    // Create download link
    const link = document.createElement('a');
    link.href = url;

    // Default filename
    let fileName = `documents_${subTaxCategoryId}.zip`;

    // Try to get filename from headers (optional but best)
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match?.[1]) {
        fileName = match[1];
      }
    }

    link.setAttribute('download', fileName);

    document.body.appendChild(link);
    link.click();
    link.remove();

  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      err.response.data.text().then((text) => {
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message === "DOCUMENTS_NOT_FOUND") {
            toast.error("No files to download");
          } else {
            toast.error(errorData?.message || "Download failed");
          }
        } catch (e) {
          toast.error("Download failed");
        }
      });
    } else {
      const msg = err?.response?.data?.message;
      if (msg === "DOCUMENTS_NOT_FOUND") {
        toast.error("No files to download");
      } else {
        toast.error(msg ?? "Download failed");
      }
    }
  }
};
const downloadIndividualDocument = async (userid,documentId,subcategoryId) => {
  try {
    const response = await api.get(
      `individual/taxfilers/${userid}/taxcategory/${documentId}/file/${subcategoryId}/download`,
      {
        responseType: 'blob', // 
      }
    );

    // Create file URL
    const url = window.URL.createObjectURL(new Blob([response.data]));

    // Create download link
    const link = document.createElement('a');
    link.href = url;

    // Default filename
    let fileName = `documents_${subcategoryId}.zip`;

    // Try to get filename from headers (optional but best)
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match?.[1]) {
        fileName = match[1];
      }
    }

    link.setAttribute('download', fileName);

    document.body.appendChild(link);
    link.click();
    link.remove();

  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      err.response.data.text().then((text) => {
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message === "DOCUMENTS_NOT_FOUND") {
            toast.error("No files to download");
          } else {
            toast.error(errorData?.message || "Download failed");
          }
        } catch (e) {
          toast.error("Download failed");
        }
      });
    } else {
      const msg = err?.response?.data?.message;
      if (msg === "DOCUMENTS_NOT_FOUND") {
        toast.error("No files to download");
      } else {
        toast.error(msg ?? "Download failed");
      }
    }
  }
};
const downloadAllZip = async (userId, year) => {
  try {
    const response = await api.get(
      `individual/taxcategory/documents/download-all`,
      {
        responseType: 'blob',
        headers: {
          Accept: "application/x-zip",
        },
      }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    let fileName = `all_documents.zip`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match?.[1]) fileName = match[1];
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      err.response.data.text().then((text) => {
        try {
          const errorData = JSON.parse(text);
          if (errorData?.message === "DOCUMENTS_NOT_FOUND") {
            toast.error("No files to download");
          } else {
            toast.error(errorData?.message || "Download failed");
          }
        } catch (e) {
          toast.error("Download failed");
        }
      });
    } else {
      const msg = err?.response?.data?.message;
      if (msg === "DOCUMENTS_NOT_FOUND") {
        toast.error("No files to download");
      } else {
        toast.error(msg ?? "Download failed");
      }
    }
  }
};
return {
    categoryData,
    getAllCategories,
    getMyCodesSummary,
    getSubCategoriesByCategory,
    subCategoriesByCategory,
    subCategoriesByCategoryLoader,
    saveUserCategory,
    updateCategory,
    getUserCategories,
    userCategoryData,
    subcategoryName,
    docsLoads,
    loader,
    setLoading,
    downloadIndividualDocument,
    subCategorystatusUpdate,
    loading,
    uploadCategoryDocument,
    // individualCategoryDocuments,
    getCategoryDocuments,
    individualDocuments,
    categoryName,
    gettaxFilerDocuments,
    getDocuments,
    getAllAccountantCategories,
    accountantCategory,
    dashboardLoader,
    documentLoader,
    addCommentDocuments,
    subCategoryMeta,
    getSelectedCategories,
    selectedCategory,
    getSubcategoryDocuments,
    saveSubcategoryCodes,
    subcategoryDocuments,
    subcategoryDocsInfo,
    subcategoryDocsLoader,
    getSubcategoryCodesList,
    subcategoryCodesList,
    subcategoryCodesListMeta,
    subcategoryCodesInfo,
    subcategoryCodesListLoader,
    updateSubcategoryCode,
    deleteSubcategoryCode,
    uploadIncomeTaxReturn,
    updateDocumentStatus,
    deleteDocuments,
    editDocuments,
    downloadDocumentsSubcategory,
    downloadSubcategoryZip,
    downloadAllSubcategoriesZip,
    downloadAllZip
  };
};
export default useTaxfilerApi;
