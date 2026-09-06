"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";
import { sortByDueDateAsc } from "@/utils/deadlines";

export default function useDeadlineApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firmDeadlines, setFirmDeadlines] = useState([]);
  const [organizationDeadlines, setOrganizationDeadlines] = useState([]);
  const [organizationData, setOrganizationData] = useState(null);
  const [meta, setMeta] = useState(null);

  const getFirmDeadlines = useCallback(async ({ page = 1, resultsPerPage = 10, search, type } = {}) => {
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      if (page) formData.append("page", page);
      if (resultsPerPage) formData.append("results_per_page", resultsPerPage);
      if (search) formData.append("search", search);
      if (type && type !== "all") formData.append("type", type);

      const response = await api.post(`deadlines/firms`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        // Rows are grouped by firm, so each firm's own deadlines are ordered
        // here; cross-firm ordering is the listing's job.
        const firms = (response.data.payload?.data || []).map((firm) => ({
          ...firm,
          deadlines: sortByDueDateAsc(firm.deadlines),
        }));
        setFirmDeadlines(firms);
        setMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setFirmDeadlines([]);
        setMeta(response.data.payload?.meta || null);
        return response.data.payload ?? null;
      }

      toast.error("Failed to fetch deadlines");
      setError("Failed to fetch deadlines");
      return null;
    } catch (err) {
      const msg = "Error fetching deadlines";
      toast.error(msg);
      setError(msg);
      setFirmDeadlines([]);
      setMeta(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrganizationDeadlines = useCallback(async (orgId, { page = 1, resultsPerPage = 10, search } = {}) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (page) params.append("page", page);
      if (resultsPerPage) params.append("results_per_page", resultsPerPage);
      if (search) params.append("search", search);

      const response = await api.get(`deadlines/organizations/${orgId}?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setOrganizationDeadlines(sortByDueDateAsc(response.data.payload?.data));
        setOrganizationData(response.data.payload?.organization || null);
        setMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setOrganizationDeadlines([]);
        setOrganizationData(null);
        setMeta(response.data.payload?.meta || null);
        return response.data.payload ?? null;
      }

      toast.error("Failed to fetch organization deadlines");
      setError("Failed to fetch organization deadlines");
      return null;
    } catch (err) {
      const msg = "Error fetching organization deadlines";
      toast.error(msg);
      setError(msg);
      setOrganizationDeadlines([]);
      setOrganizationData(null);
      setMeta(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    firmDeadlines,
    organizationDeadlines,
    organizationData,
    meta,
    getFirmDeadlines,
    getOrganizationDeadlines,
  };
}
