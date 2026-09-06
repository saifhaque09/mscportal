"use client";
import api from "@/utils/axiosInstance";
export default function useInvoiceApi() {
  const list = async (params = {}) => (await api.get("/invoices", { params })).data;
  const create = async (payload) => (await api.post("/invoices", payload)).data;
  const download = async (id) => {
    const response = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data); const link = document.createElement("a");
    link.href = url; link.download = `invoice-${id}.pdf`; link.click(); URL.revokeObjectURL(url);
  };
  const recordPayment = async (id, amount) => (await api.post(`/invoices/${id}/payment`, { amount })).data;
  const downloadReceipt = async (id) => {
    const response = await api.get(`/invoices/${id}/receipt`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = `receipt-${id}.pdf`; link.click(); URL.revokeObjectURL(url);
  };
  const updateStatus = async (id, status) => (await api.patch(`/invoices/${id}/status`, { status })).data;
  return { list, create, download, recordPayment, downloadReceipt, updateStatus };
}
