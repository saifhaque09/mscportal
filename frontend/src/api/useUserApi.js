"use client";

import { useState } from "react";
import api from "@/utils/axiosInstance";
import { toast } from "react-toastify";

export default function useUserApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [userMeta, setUserMeta] = useState(null);
  const [accountantUser, setAccountantUser] = useState([]);
  

  // View User
  const viewUser = async (guid) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/users/${guid}/view`);
      if (response.data.success) {
        setUser(response.data.payload);
        return response.data.payload;
      } else {
        throw new Error(  "Failed to fetch user details");
      }
    } catch (err) {
      const msg =   "Error fetching user details";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Edit User
  const editUser = async (guid, data) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      // Handle nested objects if necessary, or just flat keys as per prompt "same data to be sent"
      // The prompt shows flat fields and roles (array).
      // Assuming form data fields match the keys in the JSON for the most part,
      // but for "roles", it might be complex. However, the design seems to focus on Basic/Business details.
      // I will simply append non-null values.
      if (data[key] !== null && data[key] !== undefined) {
          if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
              // specific handling for objects if API expects JSON string or dot notation
              // For now stringify if it's an object? Or just append? 
              // Usually APIs accept flattened keys or JSON string. 
              // Without specific instruction, I'll append as is or JSON.stringify if it's an array/object.
               formData.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
          } else {
              formData.append(key, data[key]);
          }
      }
    });
    
    // Explicitly handle some fields if needed from the form (like _method: PUT if Laravel)
    // But I'm using POST as per typical file upload APIs.

    try {
      const response = await api.post(`/users/${guid}/edit`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      if (response.data.success) {
        toast.success("Details saved successfully");
        return response.data.message;
      } else {
        throw new Error(  "Failed to update user");
      }
    } catch (err) {
      const msg =   "Error updating user";
      setError(msg);
      toast.error("Error saving details");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update Password
  const updatePassword = async (data) => {
    setLoading(true);
    setError(null);
    try {
        // Body is JSON raw: { "current_password": "...", "password": "...", "password_confirmation": "..." }
        const response = await api.post(`/password/update`, data);
        if (response.data.success || response.data.status === true) { // Handling potential different success flags
            toast.success(  "Password updated successfully");
            return response.data;
        } else {
            throw new Error(  "Failed to update password");
        }
    } catch (err) {
        const msg =   "Error updating password";
        setError(msg);
        toast.error(msg);
        return null;
    } finally {
        setLoading(false);
    }
  };

  // Send Reset Link
  const sendResetLink = async (email) => {
    setLoading(true);
    setError(null);
    try {
        const formData = new FormData();
        formData.append("email", email);
        
        const response = await api.post(`/auth/password/send_reset_link`, formData);
        if (response.data.success || response.data.status === true) {
             toast.success("Reset link sent to email");
             return response.data;
        } else {
             throw new Error("Failed to send reset link");
        }
    } catch (err) {
        let errorMsg = err?.response?.data?.message || err?.message || "Error sending reset link";
        if (typeof errorMsg === 'object') {
            const firstValue = Object.values(errorMsg)[0];
            errorMsg = Array.isArray(firstValue) ? firstValue[0] : (typeof firstValue === 'string' ? firstValue : "Error sending reset link");
        }
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
    } finally {
        setLoading(false);
    }
  };

  // Reset Password (using token)
  const resetPassword = async (token, email, password, passwordConfirmation) => {
    setLoading(true);
    setError(null);
    try {
        const formData = new FormData();
        formData.append("token", token);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("password_confirmation", passwordConfirmation);
        const response = await api.post(`auth/password/change`, formData);
        if (response.data.success || response.data.status === true) {
             toast.success(  "Password has been reset successfully");
             return response.data;
        } else {
             throw new Error(  "Failed to reset password");
        }
    } catch (err) {
        // const msg =   "Error resetting password";
        setError(err?.response?.data?.message);
        toast.error(err?.response?.data?.message);
        return null;
    } finally {
        setLoading(false);
    }
  };

  // Validate Reset Link (token + email)
  const validateResetLink = async (token, email) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("email", email);

      const response = await api.post("auth/password/validate-password-link", formData);

      if (response.data.success || response.data.status === true) {
        return { ok: true, data: response.data };
      }

      const msg = response?.data?.message || "Password link expired";
      setError(msg);
      return { ok: false, message: msg };
    } catch (err) {
      const msg = err?.response?.data?.message || "Password link expired";
      setError(msg);
      return { ok: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // Get General Settings
  const getGeneralSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/settings/general");
      if (response.data.success) {
        return response.data.payload;
      } else {
        if (response.data.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          return null;
        }
        throw new Error(  "Failed to fetch settings");
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      // Don't show toast for background settings fetch to avoid spamming on load
      return null;
    } finally {
      setLoading(false);
    }
  };


  // Save General Settings
  const updateGeneralSettings = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (data && typeof data === 'object') {
        Object.keys(data).forEach((key) => {
          if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
          }
        });
      }

      const response = await api.post("/settings/general", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Settings saved successfully");
        return response.data.payload;
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (err) {
      const msg = "Error saving settings";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Upload File (Logo/Favicon)
  const uploadFile = async (file, group) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("uploadfile", file);
    formData.append("group", group);

    try {
      const response = await api.post("/settings/app/file/upload", formData,

         {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success(`${group} uploaded successfully`);
        return response.data;
      } else {
        throw new Error(  `Failed to upload ${group}`);
      }
    } catch (err) {
      const msg =   `Error uploading ${group}`;
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get File (Logo/Favicon)
  const getFile = async (group) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/settings/app/file/get", { group });
      if (response.data.success) {
        return response.data.payload; // Assuming payload contains url or base64
      } else {
        if (response.data.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
        } else {
          console.warn(`Failed to fetch ${group}:`, response.data.message);
        }
        return null;
      }
    } catch (err) {
      console.error(`Error fetching ${group}:`, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete File (Logo/Favicon)
  const deleteFile = async (group) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/settings/file/delete", { group });
      if (response.data.success) {
        toast.success(`${group} deleted successfully`);
        return true;
      } else {
        throw new Error(  `Failed to delete ${group}`);
      }
    } catch (err) {
      const msg =   `Error deleting ${group}`;
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Upload Profile Image
  const uploadProfileImage = async (file, userGuid) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("profile_image", file);
    formData.append("user_guid", userGuid);

    try {
      const response = await api.post("/users/profile-image/upload", formData, {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Profile photo uploaded successfully");
        return response.data.payload;
      } else {
        throw new Error("Failed to upload profile photo");
      }
    } catch (err) {
      const msg = "Error uploading profile photo";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Remove Profile Image
  const removeProfileImage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/users/profile-image/remove");
      if (response.data.success) {
        toast.success("Profile photo removed successfully");
        return true;
      } else {
        throw new Error("Failed to remove profile photo");
      }
    } catch (err) {
      const msg = "Error removing profile photo";
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get Profile Image
  const getProfileImage = async (userGuid) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("user_guid", userGuid);

    try {
      const response = await api.post("/users/profile-image/get", formData);
      if (response.data.success) {
        return response.data.payload;
      } else {
        return null;
      }
    } catch (err) {
      console.error("Error fetching profile image:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update Login Settings (TFA)
  const updateLoginSettings = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/settings/login", data);
      if (response.data.success) {
        toast.success(  "Settings updated successfully");
        return response.data;
      } else {
        throw new Error(  "Failed to update settings");
      }
    } catch (err) {
      const msg =   "Error updating settings";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getLoginSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/settings/login");
      if (response.data.success) {
        return response.data.payload;
      } else {
        if (response.data.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          return null;
        }
        throw new Error(  "Failed to fetch settings");
      }
    } catch (err) {
      const msg =   "Error fetching settings";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateAppName = async (appName) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("app_name", appName);
    
    try {
      const response = await api.post("/settings/app/save", formData);
      if (response.data.success) {
        toast.success(  "App name updated successfully");
        return response.data;
      } else {
        throw new Error(  "Failed to update app name");
      }
    } catch (err) {
      const msg =   "Error updating app name";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };


  const getAppName = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/settings/app");
      if (response.data.success) {
        return response.data.payload;
       
      } else {
        throw new Error(  "Failed to fetch app name");
      }
    } catch (err) {
      const msg =   "Error fetching app name";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };


  const [staffList, setStaffList] = useState([]);
  const [staffMeta, setStaffMeta] = useState(null);
  const [recentOnboarding, setRecentOnboarding] = useState([]);

  const getRecentOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/users/recent");
      if (response.data.success) {
        setRecentOnboarding(response.data.payload || []);
        return response.data.payload;
      } else {
        setRecentOnboarding([]);
        return [];
      }
    } catch (err) {
      setError("Error fetching recent onboarding");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getAllAccountantUser = async (page, rows, searchKeyword, roles) => {
  setLoading(true);
  setError(null);

  const formData = new FormData();

  try {
    if (page) {
      formData.append("page", page);
    }

    if (rows) {
      formData.append("results_per_page", rows);
    }

    if (searchKeyword) {
      formData.append("search", searchKeyword);
    }

    if (roles?.length) {
      roles.forEach((role) => formData.append("roles[]", role));
    }

    const response = await api.post("/users/all", formData);

    if (response.data.success) {
      const payload = response.data.payload;

      setAccountantUser(payload?.data || []);  // ✅ FIXED
      setUserMeta(payload?.meta || {});

      return payload?.data;
    } else {
      if (response.data.message === "RECORDS_NOT_FOUND") {
        setAccountantUser([]);
        setUserMeta({});
        return [];
      }
      throw new Error(  "Failed to fetch accountant users");
    }

  } catch (err) {
    const msg =
     
      "Error fetching accountant users";

    setError(msg);
    toast.error(msg);
    return null;

  } finally {
    setLoading(false);
  }
};

  const getStaffList = async (page, resultsPerPage, search) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    if (page) formData.append("page", page);
    if (resultsPerPage) formData.append("results_per_page", resultsPerPage);
    if (search) formData.append("search", search);

    try {
      const response = await api.post("/users/staff/list", formData);
      if (response.data.success) {
        const payload = response.data.payload;
        setStaffList(payload?.data || []);
        setStaffMeta(payload?.meta || {});
        return payload;
      } else {
        if (response.data.message === "RECORDS_NOT_FOUND") {
          setStaffList([]);
          setStaffMeta({});
          return { data: [], meta: {} };
        }
        throw new Error("Failed to fetch staff list");
      }
    } catch (err) {
      setError("Error fetching staff list");
      toast.error("Error fetching staff list");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const toggleIndividualStatus = async (userId) => {
    const formData = new FormData();
    formData.append("user_id", userId);
    try {
      const response = await api.post("/users/individual-status/toggle", formData);
      if (response.data.success) {
        return response.data;
      }
      throw new Error("Failed to toggle status");
    } catch (err) {
      toast.error("Error toggling status");
      return null;
    }
  };

  const getInvitesCount = async () => {
    try {
      const response = await api.post(`/users/invites/count`);
      if (response?.data?.success) {
        return response.data.payload;
      }
      return null;
    } catch (err) {
      console.error("Error fetching invites count", err);
      return null;
    }
  };

  const getStaffCount = async () => {
    try {
      const response = await api.post(`/users/staff/count`);
      if (response?.data?.success) {
        return response.data.payload;
      }
      return null;
    } catch (err) {
      console.error("Error fetching staff count", err);
      return null;
    }
  };



  return {
    viewUser,
    editUser,
    updatePassword,
    sendResetLink,
    resetPassword,
    getGeneralSettings,
    updateGeneralSettings,
    uploadFile,
    getFile,
    deleteFile,
    uploadProfileImage,
    removeProfileImage,
    getProfileImage,
    updateLoginSettings,
    updateAppName,
    getAppName,
    getLoginSettings,
    getAllAccountantUser,
    getRecentOnboarding,
    validateResetLink,
    getInvitesCount,
    getStaffCount,
    getStaffList,
    toggleIndividualStatus,

    accountantUser,
    staffList,
    staffMeta,
    recentOnboarding,
    loading,
    error,
  };
}
