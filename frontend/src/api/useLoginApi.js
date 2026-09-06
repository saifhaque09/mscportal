"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";
import extractErrorMessage from "@/utils/extractErrorMessage";
import { ROUTES } from "@/config/routes";

const roleDashboardMap = {
  admin: "/dashboard",
  client: "/clientmanagement/clientboard",
};

export default function useLoginApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

 
  

 
  const login = async ({ email, password }) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      if (response?.data?.success) {
        const data = response.data;

        // Case 1: OTP required
        if (data?.message === "OTP_SENT_FOR_2FA") {
          return {
            success: true,
            otpRequired: true,
          };
        }

        // Case 2: OTP NOT required → login complete
        const role = data.user.roles[0].name.toLowerCase();

         const firmGuid = data.user?.business?.guid;
        const firmId = data.user?.business?.id;
        const userGuid = data.user?.guid;


        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("userRole", role);
        if (role === "client"||role==="employee") {
          localStorage.setItem("firmGuid", firmGuid);
          if (firmId) localStorage.setItem("firmId", firmId);
        }
        localStorage.setItem("email", data.user.email);
        localStorage.setItem("user", data.user.first_name);
        localStorage.setItem("userGuid", userGuid);
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("aclMenu", JSON.stringify(data.user.roles[0]?.links ?? []));

        return {
          success: true,
          otpRequired: false,
          role,
        };
      }

      setError( "Login failed");
      toast.error( "Login failed");
      return null;
    } catch (err) {
      const msg = extractErrorMessage(err, "Invalid email or password");
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * VERIFY OTP
   */
  const verifyOtp = async ({ email, password, otp }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("otp", otp);

    try {
      const response = await api.post("/auth/login", formData);

      if (response?.data?.success) {
        // Fix: access_token is at the root, not inside user
        const { access_token, user } = response.data;
        
        const role = user?.roles[0]?.name.toLowerCase();
        const firmGuid = user?.business?.guid;
        const firmId = user?.business?.id;
        const userGuid = user?.guid;

        localStorage.setItem("access_token", access_token);
        localStorage.setItem("userRole", role);

        if (role === "client"||role==="employee") {
          localStorage.setItem("firmGuid", firmGuid);
          if (firmId) localStorage.setItem("firmId", firmId);
        }
        
        localStorage.setItem("email", user.email);
        localStorage.setItem("user", user.first_name);
        localStorage.setItem("userGuid", userGuid);
        localStorage.setItem("userId", user.id);
        localStorage.setItem("aclMenu", JSON.stringify(user?.roles?.[0]?.links ?? []));

        return {
          success: true,
          data: user,
          role,
        };
      }

      setError(response?.data?.message || "Invalid OTP");
      toast.error(response?.data?.message || "Invalid OTP");
      return null;
    } catch (err) {
      const msg = extractErrorMessage(err, "Invalid OTP");
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createPassword = async ({ hash, password, passwordConfirmation }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();

    formData.append("hash", hash);
    formData.append("password", password);
    formData.append("password_confirmation", passwordConfirmation);

    try {
      const response = await api.post("/auth/password/create", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success("Password created successfully!");
        
        // Redirect to login page after password creation
        setTimeout(() => {
          router.push(ROUTES.auth.login);
        }, 1500);
        
        return true;
      } else {
        throw new Error("Password creation failed");
      }
    } catch (err) {
      // const msg =   "Error creating password";
      toast.error(err?.response?.data?.message);
      setError(err?.response?.data?.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getInviteDetails = async (hash) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "users/invites/get",
        { hash },
        {
          headers: {
            Accept: "application/json",
            // Authorization: `Bearer 27|Lh94OEyu0134j71t8GTE60R14ZYI1F5p93j4LNkl4bc20a43`,
          },
        }
      );

      if (response?.data?.success) {
        return response.data?.payload;
      }

      let msg = response?.data?.message || "No record found";
      if (msg === "RECORDS_NOT_FOUND") {
        msg = "Invalid link has expired";
      }
      toast.error(msg);
      setError(msg);
      return null;
    } catch (err) {
      let msg = err?.response?.data?.message || "No record found";
      if (msg === "RECORDS_NOT_FOUND") {
        msg = "Invalid link has expired";
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
 
  const logout = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/logout", new FormData(), {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success(response.data.message || "Logged out successfully");
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      localStorage.clear();
      router.replace(ROUTES.auth.login);
      setLoading(false);
    }
  };

  return {
    login,
    verifyOtp,
    createPassword,
    getInviteDetails,
    logout,

    loading,
    error,
  };
}
