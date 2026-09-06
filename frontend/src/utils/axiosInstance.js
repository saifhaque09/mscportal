import axios from "axios";
import { toast } from "react-toastify";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_LOCAL_API_URL,

});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response?.status === 204) {
      const suppressToast = response?.config?.suppressNoRecordsToast;
      if (!suppressToast) {
        toast.info("No records found");
      }
      return {
        ...response,
        data: {
          success: true,
          message: "No records found",
          payload: { data: [], meta: {} },
        },
      };
    }
    return response;
  },
  (error) => {
    if (
      error?.response?.status === 401 &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
