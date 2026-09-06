"use client";
import api from "@/utils/axiosInstance";
export default function useIndividualInvoiceApi() {
  const list = async (params={}) => (await api.get('/individual-invoices',{params})).data;
  const create = async (payload) => (await api.post('/individual-invoices',payload)).data;
  const pay = async (id,payload) => (await api.post(`/individual-invoices/${id}/payment`,payload)).data;
  const updateStatus = async (id,status) => (await api.patch(`/individual-invoices/${id}/status`,{status})).data;
  const download = async (id,receipt=false) => { const r=await api.get(`/individual-invoices/${id}/${receipt?'receipt':'pdf'}`,{responseType:'blob'}); if(!r.data||r.data.size===0) throw new Error('The document was empty.'); const u=URL.createObjectURL(r.data); const a=document.createElement('a'); a.href=u; a.download=`${receipt?'receipt':'invoice'}-${id}.pdf`; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),1000); };
  return {list,create,pay,download,updateStatus};
}


