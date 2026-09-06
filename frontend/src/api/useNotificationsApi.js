import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";
import extractErrorMessage from "@/utils/extractErrorMessage";

export default function useNotificationsApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsMeta, setNotificationsMeta] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const getAllNotifications = useCallback(async ({ type, isRead, resultsPerPage, page, orderBy } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (Array.isArray(type)) {
      type.forEach((t) => formData.append("type[]", t));
    }
    if (typeof isRead === "boolean") formData.append("is_read", isRead ? 1 : 0);
    if (resultsPerPage) formData.append("results_per_page", resultsPerPage);
    if (page) formData.append("page", page);
    if (orderBy) formData.append("order_by", orderBy);

    try {
      const response = await api.post("notifications/all", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setNotifications(response.data.payload?.data ?? []);
        setNotificationsMeta(response.data.payload?.meta ?? null);
        return response.data.payload;
      }

      // RECORDS_NOT_FOUND — empty, not an error.
      setNotifications([]);
      setNotificationsMeta(null);
      return { data: [], meta: null };
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to fetch notifications");
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUnreadCount = useCallback(async () => {
    try {
      const response = await api.post("notifications/unread-count", {}, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        const count = response.data.payload?.unread_count ?? 0;
        setUnreadCount(count);
        return count;
      }
      return 0;
    } catch (err) {
      // Silent — a bell badge failing to load shouldn't toast an error at the user.
      return 0;
    }
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    if (!id) return null;

    try {
      const response = await api.post(`notifications/${id}/read`, {}, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        return response.data.payload;
      }
      return null;
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to mark notification as read");
      toast.error(msg);
      return null;
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.post("notifications/read-all", {}, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        return response.data.payload?.updated_count ?? 0;
      }
      return 0;
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to mark all notifications as read");
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    notifications,
    notificationsMeta,
    unreadCount,
    getAllNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  };
}
