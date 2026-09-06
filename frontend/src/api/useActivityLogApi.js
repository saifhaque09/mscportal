"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";

export default function useActivityLogApi() {
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogsMeta, setActivityLogsMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getAllActivityLogs = useCallback(async ({
    search,
    order_by,
    results_per_page = 10,
    page = 1,
  } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (search) formData.append("search", search);
    if (order_by) formData.append("order_by", order_by);
    if (results_per_page !== undefined && results_per_page !== null) {
      formData.append("results_per_page", results_per_page);
    }
    if (page !== undefined && page !== null) formData.append("page", page);

    try {
      const response = await api.post("activity-logs/all", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setActivityLogs(response.data.payload?.data || []);
        setActivityLogsMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (response?.data?.message === "RECORDS_NOT_FOUND") {
        setActivityLogs([]);
        setActivityLogsMeta(response.data.payload?.meta || null);
        return response.data.payload ?? null;
      }

      toast.error("Failed to fetch activity logs");
      setError("Failed to fetch activity logs");
      setActivityLogs([]);
      setActivityLogsMeta(null);
      return null;
    } catch (err) {
      const msg = "Error fetching activity logs";
      toast.error(msg);
      setError(msg);
      setActivityLogs([]);
      setActivityLogsMeta(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    activityLogs,
    activityLogsMeta,
    loading,
    error,
    getAllActivityLogs,
  };
}
