import { useState } from "react";

import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";
import { useCallback } from "react";

export default function useSettingsApi() {
    const [allTemplatesData, setAllTemplatesData] = useState([]);
    const [loader, setLoader] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
  const getAllEmailTemplates = async () => {
//   setLoading(true);
//   setError("");

  setLoader(true);

  try {
    const response = await api.get(
      `/settings/email_templates/all`,

     
    );
    if (response?.data?.success) {
      setAllTemplatesData(response.data.payload);
    //   setMeta(response.data.payload?.meta);
      return response.data.payload;

    } else if (
      response?.data?.message === "RECORDS_NOT_FOUND" ||
      response?.data?.message === "NO_RECORDS_FOUND"
    ) {
      // Empty list — not an error, no notification needed.
      setAllTemplatesData([]);
    } else {
      toast.error("Failed to fetch email templates");
      setError("Failed to fetch email templates");
    }
  } catch (err) {
    const msg =
        "Error fetching email templates";
    toast.error(msg);
    // setError(msg);
  } finally {
    setLoader(false);
  }
};
  const saveEmailTemplate = async ({ templateId, name, subject, body }) => {
    if (!templateId) {
      toast.error("Template id missing");
      return false;
    }
    setSaving(true);

    const formData = new FormData();
    formData.append("name", name || "");
    formData.append("subject", subject || "");
    formData.append("body", body || "");

    try {
      const response = await api.post(
        `/settings/email_templates/${templateId}/save`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success(  "Template saved");
        return true;
      }

      toast.error(  "Failed to save template");
      return false;
    } catch (err) {
      const msg =
          "Error saving email template";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };
return{
    getAllEmailTemplates,
    saveEmailTemplate,
    allTemplatesData,
    loader,
    saving,
    error
}
}
