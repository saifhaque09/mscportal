"use client";

import { useState } from "react";
import api from "@/utils/axiosInstance";
import { toast } from "react-toastify";

export default function useBusinessPaymentApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAllBusinessPayments = async (page = 1, resultsPerPage = 10, search = "") => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("page", page);
      formData.append("results_per_page", resultsPerPage);
      if (search) {
        formData.append("search", search);
      }
      const response = await api.post(`/clients/business/payments/all`, formData);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Error fetching payments";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createBusinessPayment = async (firmGuid, paymentData) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      Object.keys(paymentData).forEach(key => {
        if (paymentData[key] !== undefined && paymentData[key] !== null) {
          formData.append(key, paymentData[key]);
        }
      });
      const response = await api.post(`/clients/business/${firmGuid}/payments/create`, formData);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Error creating payment";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const editBusinessPayment = async (firmGuid, paymentId, paymentData) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      Object.keys(paymentData).forEach(key => {
        if (paymentData[key] !== undefined && paymentData[key] !== null) {
          formData.append(key, paymentData[key]);
        }
      });
      const response = await api.post(`/clients/business/${firmGuid}/payments/${paymentId}/edit`, formData);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Error updating payment";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const viewBusinessPayment = async (firmGuid, paymentId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/clients/business/${firmGuid}/payments/${paymentId}/view`);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Error fetching payment details";
      setError(msg);
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getAllBusinessPayments,
    createBusinessPayment,
    editBusinessPayment,
    viewBusinessPayment,
  };
}
