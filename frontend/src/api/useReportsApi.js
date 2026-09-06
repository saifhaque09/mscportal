import { useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";

const isNoRecordsMessage = (message) =>
  message === "RECORDS_NOT_FOUND" || message === "NO_RECORDS_FOUND";

export default function useReportsApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewProfitLossReport = async ({ organizationId, fromDate, toDate } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("organization_id", organizationId);
    if (fromDate) formData.append("from_date", fromDate);
    if (toDate) formData.append("to_date", toDate);

    try {
      const response = await api.post("/reports/profit-loss/preview", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        return response.data.payload;
      } else if (isNoRecordsMessage(response?.data?.message)) {
        return null;
      } else {
        const msg = response?.data?.message || "Failed to load Profit & Loss preview";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error loading Profit & Loss preview";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadProfitLossReport = async ({
    file,
    organizationId,
    source,
    reportName,
    currency,
    fromDate,
    toDate,
  }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organization_id", organizationId);
    formData.append("source", source);
    formData.append("report_name", reportName);
    formData.append("currency", currency);
    if (fromDate) formData.append("from_date", fromDate);
    if (toDate) formData.append("to_date", toDate);

    try {
      const response = await api.post("/reports/profit-loss/upload", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success(response?.data?.message || "Profit & Loss report uploaded successfully");
        return response.data.payload;
      } else {
        const msg = response?.data?.message || "Failed to upload Profit & Loss report";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error uploading Profit & Loss report";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadBalanceSheetReport = async ({
    file,
    organizationId,
    source,
    reportName,
    currency,
    asAtDate,
  }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organization_id", organizationId);
    formData.append("source", source);
    formData.append("report_name", reportName);
    formData.append("currency", currency);
    if (asAtDate) formData.append("as_at_date", asAtDate);

    try {
      const response = await api.post("/reports/balance-sheet/upload", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success(response?.data?.message || "Balance Sheet report uploaded successfully");
        return response.data.payload;
      } else {
        const msg = response?.data?.message || "Failed to upload Balance Sheet report";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error uploading Balance Sheet report";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };


  const uploadProfitLossPdf = async ({ file, organizationId }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organization_id", organizationId);

    try {
      const response = await api.post("/reports/profit-loss/upload-pdf", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success(response?.data?.message || "Profit & Loss report uploaded successfully");
        return response.data.payload;
      } else {
        const msg = response?.data?.message || "Failed to upload Profit & Loss report";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error uploading Profit & Loss report";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadBalanceSheetPdf = async ({ file, organizationId }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organization_id", organizationId);

    try {
      const response = await api.post("/reports/balance-sheet/upload-pdf", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success(response?.data?.message || "Balance Sheet report uploaded successfully");
        return response.data.payload;
      } else {
        const msg = response?.data?.message || "Failed to upload Balance Sheet report";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error uploading Balance Sheet report";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getProfitLossFileUrl = async ({ guid }) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "/reports/profit-loss/file-url",
        { guid },
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        return response.data.payload;
      } else {
        const msg = response?.data?.message || "Failed to load Profit & Loss file";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error loading Profit & Loss file";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getBalanceSheetFileUrl = async ({ guid }) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "/reports/balance-sheet/file-url",
        { guid },
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        return response.data.payload;
      } else {
        const msg = response?.data?.message || "Failed to load Balance Sheet file";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error loading Balance Sheet file";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getNetIncomeTrend = async ({ organizationId, endYear }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("organization_id", organizationId);
    formData.append("end_year", endYear);

    try {
      const response = await api.post("/reports/profit-loss/net-income-trend", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        return response.data.payload;
      } else if (isNoRecordsMessage(response?.data?.message)) {
        return null;
      } else {
        const msg = response?.data?.message || "Failed to fetch net income trend";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error fetching net income trend";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getNetExpensesTrend = async ({ organizationId, endYear }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("organization_id", organizationId);
    formData.append("end_year", endYear);

    try {
      const response = await api.post("/reports/profit-loss/net-expenses-trend", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        return response.data.payload;
      } else if (isNoRecordsMessage(response?.data?.message)) {
        return null;
      } else {
        const msg = response?.data?.message || "Failed to fetch net expenses trend";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error fetching net expenses trend";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getNetIncomeChart = async ({ organizationId, year, fromDate, toDate } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("organization_id", organizationId);
    formData.append("year", year);
    if (fromDate) formData.append("from_date", fromDate);
    if (toDate) formData.append("to_date", toDate);

    try {
      const response = await api.post("/reports/profit-loss/net-income-chart", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        return response.data.payload;
      } else if (isNoRecordsMessage(response?.data?.message)) {
        return null;
      } else {
        const msg = response?.data?.message || "Failed to fetch net income chart";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error fetching net income chart";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getExpensesByCategoryChart = async ({ organizationId, year, fromDate, toDate } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("organization_id", organizationId);
    formData.append("year", year);
    if (fromDate) formData.append("from_date", fromDate);
    if (toDate) formData.append("to_date", toDate);

    try {
      const response = await api.post("/reports/profit-loss/expenses-by-category", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        return response.data.payload;
      } else if (isNoRecordsMessage(response?.data?.message)) {
        return null;
      } else {
        const msg = response?.data?.message || "Failed to fetch expenses by category chart";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error fetching expenses by category chart";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadPLSampleCsv = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/reports/profit-loss/sample-csv", {
        responseType: "blob",
        headers: { Accept: "text/csv" },
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "sample_profit_loss.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Sample P&L CSV downloaded successfully");
      return response.data;
    } catch (err) {
      toast.error("Failed to download sample P&L CSV");
      setError("Failed to download sample P&L CSV");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadBSSampleCsv = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/reports/balance-sheet/sample-csv", {
        responseType: "blob",
        headers: { Accept: "text/csv" },
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "sample_balance_sheet.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Sample Balance Sheet CSV downloaded successfully");
      return response.data;
    } catch (err) {
      toast.error("Failed to download sample Balance Sheet CSV");
      setError("Failed to download sample Balance Sheet CSV");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadCombinedCsv = async ({ file, organizationId }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organization_id", organizationId);

    try {
      const response = await api.post("/reports/combined/upload", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success(response?.data?.message || "CSV uploaded successfully");
        return response.data.payload;
      } else {
        const msg = response?.data?.message || "Failed to upload CSV";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error uploading CSV";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadCombinedSampleCsv = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/reports/combined/sample-csv", {
        responseType: "blob",
        headers: { Accept: "text/csv" },
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "sample_combined.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Sample CSV downloaded successfully");
      return response.data;
    } catch (err) {
      toast.error("Failed to download sample CSV");
      setError("Failed to download sample CSV");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const previewBalanceSheetReport = async ({ organizationId } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("organization_id", organizationId);

    try {
      const response = await api.post("/reports/balance-sheet/preview", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        return response.data.payload;
      } else if (isNoRecordsMessage(response?.data?.message)) {
        return null;
      } else {
        const msg = response?.data?.message || "Failed to load Balance Sheet preview";
        toast.error(msg);
        setError(msg);
        return null;
      }
    } catch (err) {
      let msg = "Error loading Balance Sheet preview";
      const apiMsg = err?.response?.data?.message;
      if (apiMsg) {
        msg = typeof apiMsg === "object" ? Object.values(apiMsg).flat().join(", ") : apiMsg;
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { uploadProfitLossReport, uploadBalanceSheetReport, uploadProfitLossPdf, uploadBalanceSheetPdf, uploadCombinedCsv, downloadCombinedSampleCsv, downloadPLSampleCsv, downloadBSSampleCsv, getNetIncomeTrend, getNetExpensesTrend, getNetIncomeChart, getExpensesByCategoryChart, previewProfitLossReport, previewBalanceSheetReport, getProfitLossFileUrl, getBalanceSheetFileUrl, loading, error };
}


