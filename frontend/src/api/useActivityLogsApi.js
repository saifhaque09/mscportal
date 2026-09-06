import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";
import extractErrorMessage from "@/utils/extractErrorMessage";

export default function useActivityLogsApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogsMeta, setActivityLogsMeta] = useState(null);

  const buildFormData = ({ logName, fromDate, toDate, search, resultsPerPage, page, orderBy }) => {
    const formData = new FormData();
    if (Array.isArray(logName)) {
      logName.forEach((name) => formData.append("log_name[]", name));
    }
    if (fromDate) formData.append("from_date", fromDate);
    if (toDate) formData.append("to_date", toDate);
    if (search) formData.append("search", search);
    if (resultsPerPage) formData.append("results_per_page", resultsPerPage);
    if (page) formData.append("page", page);
    if (orderBy) formData.append("order_by", orderBy);
    return formData;
  };

  const getAllActivityLogs = useCallback(async (params = {}) => {
    setLoading(true);
    setError("");

    const formData = buildFormData(params);

    try {
      const response = await api.post("activity-logs/all", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setActivityLogs(response.data.payload?.data ?? []);
        setActivityLogsMeta(response.data.payload?.meta ?? null);
        return response.data.payload;
      }

      // RECORDS_NOT_FOUND — treat as an empty, successful result, not an error.
      setActivityLogs([]);
      setActivityLogsMeta(null);
      return { data: [], meta: null };
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to fetch activity logs");
      toast.error(msg);
      setError(msg);
      setActivityLogs([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllActivityLogsForAdmin = useCallback(async (params = {}) => {
    setLoading(true);
    setError("");

    const formData = buildFormData(params);
    if (params.userGuid) formData.append("user_guid", params.userGuid);
    if (params.userId) formData.append("user_id", params.userId);

    try {
      const response = await api.post("activity-logs/admin/all", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setActivityLogs(response.data.payload?.data ?? []);
        setActivityLogsMeta(response.data.payload?.meta ?? null);
        return response.data.payload;
      }

      setActivityLogs([]);
      setActivityLogsMeta(null);
      return { data: [], meta: null };
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to fetch activity logs");
      toast.error(msg);
      setError(msg);
      setActivityLogs([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    activityLogs,
    activityLogsMeta,
    getAllActivityLogs,
    getAllActivityLogsForAdmin,
  };
}
