"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";

export default function useEventApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);

  /**
   * Fetch events for a given firm ID.
   */
  const getEvents = useCallback(async (firmId) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/events", {
        params: { firm_id: firmId },
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        const data = response.data.payload?.data || response.data.payload || [];
        setEvents(data);
        return response.data.payload;
      }

      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setEvents([]);
        return [];
      }

      toast.error("Failed to fetch events");
      setError("Failed to fetch events");
      return null;
    } catch (err) {
      const msg = "Error fetching events";
      toast.error(msg);
      setError(msg);
      setEvents([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch all events for a given firm ID (numeric).
   */
  const getAllEvents = useCallback(async (firmId, { resultsPerPage } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (firmId && firmId !== "null" && firmId !== "undefined") {
      formData.append("firm_id", firmId);
    }
    if (resultsPerPage) {
      formData.append("results_per_page", resultsPerPage);
    }

    try {
      const response = await api.post("/events/all", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        const data = response.data.payload?.data || response.data.payload || [];
        setEvents(data);
        return response.data.payload;
      }

      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setEvents([]);
        return [];
      }

      toast.error("Failed to fetch events");
      setError("Failed to fetch events");
      return null;
    } catch (err) {
      const msg = "Error fetching events";
      toast.error(msg);
      setError(msg);
      setEvents([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new event.
   */
  const createEvent = useCallback(async (eventData) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (eventData.firm_id && eventData.firm_id !== "null" && eventData.firm_id !== "undefined") {
      formData.append("firm_id", eventData.firm_id);
    }
    formData.append("event_name", eventData.event_name);
    formData.append("email", eventData.email);
    formData.append("date", eventData.date);
    
    if (eventData.from_time) {
      formData.append("from_time", eventData.from_time);
    }
    if (eventData.to_time) {
      formData.append("to_time", eventData.to_time);
    }
    if (eventData.description) {
      formData.append("description", eventData.description);
    }

    try {
      const response = await api.post("/events/create", formData, {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      if (response?.data?.success) {
        toast.success("Event created successfully");
        return response.data.payload;
      }

      toast.error(response?.data?.message || "Failed to create event");
      setError(response?.data?.message || "Failed to create event");
      return null;
    } catch (err) {
      const msg = err?.response?.data?.message || "Error creating event";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Edit an existing event by its eventId/guid.
   */
  const editEvent = useCallback(async (eventId, eventData) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (eventData.firm_id && eventData.firm_id !== "null" && eventData.firm_id !== "undefined") {
      formData.append("firm_id", eventData.firm_id);
    }
    formData.append("event_name", eventData.event_name);
    formData.append("email", eventData.email);
    formData.append("date", eventData.date);

    if (eventData.from_time) {
      formData.append("from_time", eventData.from_time);
    }
    if (eventData.to_time) {
      formData.append("to_time", eventData.to_time);
    }
    if (eventData.description) {
      formData.append("description", eventData.description);
    }

    try {
      const response = await api.post(`/events/${eventId}/edit`, formData, {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      if (response?.data?.success) {
        toast.success("Event updated successfully");
        return response.data.payload;
      }

      toast.error(response?.data?.message || "Failed to update event");
      setError(response?.data?.message || "Failed to update event");
      return null;
    } catch (err) {
      const msg = err?.response?.data?.message || "Error updating event";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete one or more events.
   * @param {string|string[]} guids - Single guid string or array of guid strings
   */
  const deleteEvent = useCallback(async (guids) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    const guidArray = Array.isArray(guids) ? guids : [guids];
    guidArray.forEach((guid) => {
      formData.append("guid[]", guid);
    });

    try {
      const response = await api.post("/events/delete", formData, {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      if (response?.data?.success) {
        toast.success(response.data.message || "Event deleted successfully");
        return response.data;
      }

      toast.error(response?.data?.message || "Failed to delete event");
      setError(response?.data?.message || "Failed to delete event");
      return null;
    } catch (err) {
      const msg = err?.response?.data?.message || "Error deleting event";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    events,
    setEvents,
    getEvents,
    getAllEvents,
    createEvent,
    editEvent,
    deleteEvent,
  };
}
