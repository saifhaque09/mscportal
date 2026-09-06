import { useState } from "react";

import { toast } from "react-toastify";
import api from "@/utils/axiosInstance";
import extractErrorMessage from "@/utils/extractErrorMessage";
import { useCallback } from "react";
export default function useOrganisationApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [organisationData, setOrganisationData] = useState(null);
  const [businessClients, setBusinessClients] = useState([]);
  const [allInvites, setAllInvites] = useState([]);
  const [accountantInvitesData,setAccountantInvitesData]=useState([])
  const [organisationGuid, setOrganisationGuid] = useState(null);
  const [meta, setMeta] = useState(null);
  const [taxFilerData,setTaxFilerData]=useState([])
const [taxFilerMeta,settaxFilerMeta]=useState(null)
  const [viewOrganisationData, setViewOrganisationData] = useState(null);
  const [AgreementfileData,setAgreementFileData]=useState([])
const [organizationViewData,setorganizationViewData]=useState([])
  const [individualUsers, setIndividualUsers] = useState([]);
  const [individualUsersMeta, setIndividualUsersMeta] = useState(null);
  const [firmsWithAssignments, setFirmsWithAssignments] = useState([]);
  const [firmsWithAssignmentsMeta, setFirmsWithAssignmentsMeta] = useState(null);
  const [firmMembers, setFirmMembers] = useState(null);
  const [firmMembersMeta, setFirmMembersMeta] = useState(null);
  const [individualMembers, setIndividualMembers] = useState(null);
  const [individualMembersMeta, setIndividualMembersMeta] = useState(null);
  const [firmUsers, setFirmUsers] = useState([]);
  const [calendarClients, setCalendarClients] = useState([]);
  const [calendarClientsLoading, setCalendarClientsLoading] = useState(false);
  const [occurrenceOptions, setOccurrenceOptions] = useState([]);
  const [myPermissions, setMyPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");

  const getTaxReturnOccurrences = async (business_category) => {
    if (!business_category) {
      setOccurrenceOptions([]);
      return [];
    }
    try {
      const formData = new FormData();
      formData.append("business_category", business_category);
      const response = await api.post("/clients/business/tax-return-occurrences", formData, {
        headers: { Accept: "application/json" },
      });
      if (response?.data?.success) {
        const options = response.data.payload?.occurance_options || [];
        setOccurrenceOptions(options);
        return options;
      }
      setOccurrenceOptions([]);
      return [];
    } catch {
      setOccurrenceOptions([]);
      return [];
    }
  };

  const createOrganisation = async ({
    firm_name,
    contact_email,
    contact_mobile,
    province,
    city,
    postal,
    country_code,
    country_name,
    address,
    gst_number,
    hst_number,
    pst_number,
    business_account_details,
    tax_returns_due_date,
    tax_return_occurrence,
    tax_return_month,
    tax_return_day,
    business_categories,
    client_agreement,
    financial_year_end_month,
    financial_year_end_day,
    payment_type,
    weekly_day,
    weekly_month,
  }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("firm_name", firm_name);
    if (contact_email) formData.append("contact_email", contact_email);
    formData.append("contact_mobile", contact_mobile);
    formData.append("province", province);
    formData.append("city", city);
    formData.append("postal", postal);
    formData.append("country_code", country_code);
    formData.append("country_name", country_name);
    if (address) formData.append("address", address);
    if (gst_number) formData.append("gst_number", gst_number);
    if (hst_number) formData.append("hst_number", hst_number);
    if (pst_number) formData.append("pst_number", pst_number);
    if (business_account_details) formData.append("business_account_details[]", business_account_details);
    if (tax_returns_due_date) formData.append("tax_returns_due_date", tax_returns_due_date);
    if (tax_return_occurrence) formData.append("tax_return[occurrence]", tax_return_occurrence);
    if (tax_return_month) formData.append("tax_return[month]", tax_return_month);
    if (tax_return_day) formData.append("tax_return[day]", tax_return_day);
    if (business_categories) formData.append("business_categories[]", business_categories);
    if (client_agreement) formData.append("client_agreement", client_agreement);
    if (financial_year_end_month) formData.append("financial_year_end_month", financial_year_end_month);
    if (financial_year_end_day) formData.append("financial_year_end_day", financial_year_end_day);
    if (payment_type) formData.append("payment_type", payment_type);
    if (weekly_day) formData.append("weekly_day", weekly_day);
    if (weekly_month) formData.append("weekly_month", weekly_month);

    try {
      const response = await api.post("/clients/business/create", formData, {
        headers: { Accept: "application/json", "Content-Type": "multipart/form-data" },
      });

      if (response?.data?.success === true) {
        const payload = response.data.payload || response.data.message;
        setOrganisationData(payload);
        setOrganisationGuid(payload.guid); 

        toast.success("Organisation created successfully");

        return payload.guid;
      }

      throw new Error("Organisation creation failed");
    } catch (err) {
      const msg = extractErrorMessage(err, "Error creating organisation");
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const editOrganisation = async ({
  firm_name,
    contact_email,
    contact_mobile,
    province,
    city,
    postal,
    country_code,
    country_name,
    address,
    gst_number,
    hst_number,
    pst_number,
    business_account_details,
    tax_returns_due_date,
    tax_return_occurrence,
    tax_return_month,
    tax_return_day,
    business_categories,
     client_agreement,
     financial_year_end_month,
     financial_year_end_day,
     payment_type,
     weekly_day,
     weekly_month,
     firmGuid,
  }) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("firm_name", firm_name);
    if (contact_email) formData.append("contact_email", contact_email);
    formData.append("contact_mobile", contact_mobile);
    formData.append("province", province);
    formData.append("city", city);
    formData.append("postal", postal);
    formData.append("country_code", country_code);
    formData.append("country_name", country_name);
    

    if (address) formData.append("address", address);
    if (gst_number) formData.append("gst_number", gst_number);
    if (hst_number) formData.append("hst_number", hst_number);
    if (pst_number) formData.append("pst_number", pst_number);
    if (business_account_details) formData.append("business_account_details[]", business_account_details);
    if (tax_returns_due_date) formData.append("tax_returns_due_date", tax_returns_due_date);
    if (tax_return_occurrence) formData.append("tax_return[occurrence]", tax_return_occurrence);
    if (tax_return_month) formData.append("tax_return[month]", tax_return_month);
    if (tax_return_day) formData.append("tax_return[day]", tax_return_day);
    if (business_categories) formData.append("business_categories[]", business_categories);
    if (client_agreement) formData.append("client_agreement", client_agreement);
    if (financial_year_end_month) formData.append("financial_year_end_month", financial_year_end_month);
    if (financial_year_end_day) formData.append("financial_year_end_day", financial_year_end_day);
    if (payment_type) formData.append("payment_type", payment_type);
    if (weekly_day) formData.append("weekly_day", weekly_day);
    if (weekly_month) formData.append("weekly_month", weekly_month);

    try {
      const response = await api.post(
        `/clients/business/${firmGuid}/edit`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
        toast.success("Organisation updated successfully");
        return response.data; // Return data on success
      }

      throw new Error("Organisation update failed");
    } catch (err) {
      const msg = extractErrorMessage(err, "Error updating organisation");
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
const getAllTaxFilersUsers = useCallback(async ({
    search,
    page = 1,
    resultsPerPage = 10,
    status,
    orderBy,
    deleted,
  } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (resultsPerPage !== undefined && resultsPerPage !== null) {
      formData.append("results_per_page", resultsPerPage);
    }
    if (search) formData.append("search", search);
    if (page !== undefined && page !== null) formData.append("page", page);

    const statuses = Array.isArray(status) ? status : status ? [status] : [];
    statuses.forEach((s) => {
      if (s !== undefined && s !== null && String(s).trim() !== "") {
        formData.append("status[]", String(s));
      }
    });

    // Always request TaxFiler users only
    formData.append("roles[]", "Taxfiler");

    if (orderBy) formData.append("order_by", orderBy);
    if (deleted !== undefined && deleted !== null) {
      formData.append("deleted", String(deleted));
    }

    try {
      const response = await api.post(`individual/taxfilers`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setTaxFilerData(response.data.payload?.data || []);
        settaxFilerMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (response?.data?.message === "RECORDS_NOT_FOUND") {
        setTaxFilerData([]);
        settaxFilerMeta(response.data.payload?.meta || null);
        return response.data.payload ?? null;
      }

      toast.error("Failed to fetch tax filers");
      setError("Failed to fetch tax filers");
      setTaxFilerData([]);
      settaxFilerMeta(null);
      return null;
    } catch (err) {
      const msg = "Error fetching tax filers";
      toast.error(msg);
      setError(msg);
      setTaxFilerData([]);
      settaxFilerMeta(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  const viewOrganisation = async ({ firmGuid }) => {
    setLoading(true);
    setError("");

    try {
      const firmId = firmGuid || localStorage.getItem("firmGuid");
      const response = await api.post(`/clients/business/${firmId}/view`, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setViewOrganisationData(response.data);
        setorganizationViewData(response)
        return response.data;
        
      }
      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setViewOrganisationData(null);
        return null;
      }

      throw new Error("Organisation fetching failed");
    } catch (err) {
      const msg =   "Error fetching organisation";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const getFirmUsers = async ({ firmGuid }) => {
    setLoading(true);
    setError("");

    try {
      const firmId = firmGuid || localStorage.getItem("firmGuid");
      const response = await api.post(`/clients/business/${firmId}/users`, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setFirmUsers(response.data.payload?.data || []);
        return response.data.payload?.data || [];
      }
      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setFirmUsers([]);
        return [];
      }

      throw new Error("Fetching organisation users failed");
    } catch (err) {
      const msg = "Error fetching organisation users";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const editAgreement = async ({ firmGuid, document, file_hash, title }) => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("document", document);
      formData.append("file_hash", file_hash);
      if (title) formData.append("title", title);
      const response = await api.post(
        `/clients/business/${firmGuid}/agreement/edit`,
        formData,
        { headers: { Accept: "application/json", "Content-Type": "multipart/form-data" } }
      );
      if (response?.data?.success) {
        toast.success("Agreement updated successfully");
        return response.data;
      }
      throw new Error("Agreement update failed");
    } catch (err) {
      const msg = "Error updating agreement";
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const viewAgreementsFile = async ({ firmGuid }) => {
    setLoading(true);
    setError("");

    try {
      const firmId = firmGuid || localStorage.getItem("firmGuid");
      const response = await api.post(`/clients/business/${firmId}/agreement/get`, {
 
      });

     
        setAgreementFileData(response?.data?.payload);
        // setorganizationViewData(response)
        return response.data;
      

      throw new Error("Organisation fetching failed");
    } catch (err) {
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getFirmContext = async (guid) => {
    // If we have a guid, just verify it or return it.
    // Ideally this would fetch the user's firm if they are a client and no guid is provided.
    // For now, let's reuse viewOrganisation logic or a lighter endpoint if available.
    // Based on user request "call firmGuid using api", 
    // we can try to fetch the viewOrganisation and extract the ID.
    
    // If we are a client, we might not have the GUID in URL but it might be in our session/profile?
    // But since I don't see a "me" endpoint usage yet, I will best-effort this:
    // Try to fetch organization details if guid is provided OR fallback to localStorage.
    
    const contextId = guid || localStorage.getItem("firmGuid");
    if (!contextId) return null;

    const data = await viewOrganisation({ firmGuid: contextId });
    return data?.payload?.guid || null; 
  };


  const getAllBusinessClients = async({ currentPage, rowsPerPage, search } = {}) => {
  setLoading(true);
  setError("");

  const formData = new FormData();
  if (currentPage !== undefined && currentPage !== null) {
    formData.append("page", currentPage);
  }

  if (rowsPerPage !== undefined && rowsPerPage !== null) {
    formData.append("results_per_page", rowsPerPage);
  }

  if (search) {
    formData.append("search", search);
  }

  try {
    const response = await api.post(
      `/clients/business/all`,
      formData,
      { headers: { Accept: "application/json" } }
    );

    if (response?.data?.success) {
      setBusinessClients(response.data.payload?.data);
      setMeta(response.data.payload?.meta);
      return response.data.payload;
    } else {
      if (response?.data?.message === "RECORDS_NOT_FOUND") {
        // Empty list — not an error, no notification needed.
        setBusinessClients([]);
      } else {
        // Fixed toastId so the 30s auto-refresh poll in AllOrganisationTable
        // can't stack a duplicate toast on every failed retry — react-toastify
        // skips re-showing a toast with an id that's already on screen.
        toast.error("Failed to fetch business clients", { toastId: "business-clients-fetch-error" });
      }
      setError("Failed to fetch business clients");
      return null;
    }
  } catch (err) {
    const msg =
        "Error fetching business clients";
    toast.error(msg, { toastId: "business-clients-fetch-error" });
    setError(msg);
  } finally {
    setLoading(false);
  }
};

  /**
   * Lightweight business client list for the calendar's client filter sidebar.
   */
  const getBusinessClientsForCalendar = useCallback(async ({ search } = {}) => {
    setCalendarClientsLoading(true);
    setError("");

    try {
      const response = await api.get("clients/business/list", {
        params: search ? { search } : undefined,
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        const data = response.data.payload || [];
        setCalendarClients(data);
        return data;
      }

      if (response?.data?.message === "RECORDS_NOT_FOUND") {
        setCalendarClients([]);
        return [];
      }

      toast.error("Failed to fetch clients");
      setError("Failed to fetch clients");
      return null;
    } catch (err) {
      const msg = "Error fetching clients";
      toast.error(msg);
      setError(msg);
      setCalendarClients([]);
      return null;
    } finally {
      setCalendarClientsLoading(false);
    }
  }, []);

  const deleteBusinessClient = async (clientGuid) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("guid[]", clientGuid);

    try {
      const response = await api.post(`clients/business/delete`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success("Client deleted successfully");
        return true;
      } else {
        toast.error("Failed to delete client");
        return false;
      }
    } catch (err) {
      const msg =   "Error deleting client";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Send invites individually instead of as array
  const sendInvite = async (guid, inviteData) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    const index = 0;
    formData.append(`invite[${index}][email]`, inviteData?.email ?? "");
    if(inviteData?.mobile){
    formData.append(`invite[${index}][mobile]`, inviteData?.mobile ?? "");
    }
    formData.append(`invite[${index}][first_name]`, inviteData?.first_name ?? "");
    if (inviteData?.last_name) {
      formData.append(`invite[${index}][last_name]`, inviteData.last_name);
    }
    formData.append(`invite[${index}][role]`, inviteData?.role ?? "");
    if (inviteData?.dob) {
      formData.append(`invite[${index}][dob]`, inviteData.dob);
    }
    if (inviteData?.sin_number) {
      formData.append(`invite[${index}][sin_number]`, inviteData.sin_number);
    }
    if (inviteData?.address) {
      formData.append(`invite[${index}][address]`, inviteData.address);
    }
    if (inviteData?.marital?.status) {
      formData.append(
        `invite[${index}][marital][status]`,
        inviteData.marital.status
      );
    }
    if (inviteData?.marital?.spouse_name) {
      formData.append(
        `invite[${index}][marital][spouse_name]`,
        inviteData.marital.spouse_name
      );
    }
    if (inviteData?.marital?.spouse_dob) {
      formData.append(
        `invite[${index}][marital][spouse_dob]`,
        inviteData.marital.spouse_dob
      );
    }
    if (inviteData?.marital?.spouse_sin_number) {
      formData.append(
        `invite[${index}][marital][spouse_sin_number]`,
        inviteData.marital.spouse_sin_number
      );
    }
    if (inviteData?.marital?.spouse_status) {
      formData.append(
        `invite[${index}][marital][spouse_status]`,
        inviteData.marital.spouse_status
      );
    }

    try {


      const firmGuid = guid || localStorage.getItem("firmGuid");
      const response = await api.post(
        `clients/business/${firmGuid}/invites/send`,
        formData,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (
        response?.data.message === "RECORD_CREATED" ||
        response?.data?.success === true ||
        response?.data?.success === "true"
      ) {
        toast.success(response?.data?.message || "INVITES_SENT");
        return true;
      } else {
        toast.error("Invite sending failed. Please try again.");
        setError("Invite sending failed. Please try again.");
        return false;
      }
    } catch (err) {
      const msg =   "Error sending invite";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };
    const inviteTaxFiler = async (guid, inviteData) => {
     setLoading(true);
     setError("");

     const formData = new FormData();
     const index = 0;

     const email = String(inviteData?.email ?? "").trim();
     const mobile = String(inviteData?.mobile ?? "").trim();
     const firstName = String(inviteData?.first_name ?? "").trim();
     const lastName = String(inviteData?.last_name ?? "").trim();
     const name = String(inviteData?.name ?? `${firstName} ${lastName}`).trim();
     const role = String(inviteData?.role ?? "").trim();

     // API expects: invite[i][email], invite[i][mobile], invite[i][name], invite[i][role]
     // Keep first_name/last_name too for backward compatibility.
     formData.append(`invite[${index}][email]`, email);
     if (mobile) formData.append(`invite[${index}][mobile]`, mobile);
     if (name) formData.append(`invite[${index}][name]`, name);
     if (firstName) formData.append(`invite[${index}][first_name]`, firstName);
     if (lastName) formData.append(`invite[${index}][last_name]`, lastName);
     if (role) formData.append(`invite[${index}][role]`, role);
     if (inviteData?.dob) {
       formData.append(`invite[${index}][dob]`, inviteData.dob);
     }
     if (inviteData?.sin_number) {
       formData.append(`invite[${index}][sin_number]`, inviteData.sin_number);
    }
    if (inviteData?.address) {
      formData.append(`invite[${index}][address]`, inviteData.address);
    }
    if (inviteData?.country) {
      formData.append(`invite[${index}][country]`, inviteData.country);
    }
    if (inviteData?.country_code) {
      formData.append(`invite[${index}][country_code]`, inviteData.country_code);
    }
    if (inviteData?.province) {
      formData.append(`invite[${index}][province]`, inviteData.province);
    }
    if (inviteData?.marital?.status) {
      formData.append(
        `invite[${index}][marital][status]`,
        inviteData.marital.status
      );
    }
    if (inviteData?.marital?.spouse_name) {
      formData.append(
        `invite[${index}][marital][spouse_name]`,
        inviteData.marital.spouse_name
      );
    }
    if (inviteData?.marital?.spouse_dob) {
      formData.append(
        `invite[${index}][marital][spouse_dob]`,
        inviteData.marital.spouse_dob
      );
    }
    if (inviteData?.marital?.spouse_sin_number) {
      formData.append(
        `invite[${index}][marital][spouse_sin_number]`,
        inviteData.marital.spouse_sin_number
      );
    }
    if (inviteData?.marital?.spouse_status) {
      formData.append(
        `invite[${index}][marital][spouse_status]`,
        inviteData.marital.spouse_status
      );
    }

     try {


       const response = await api.post(
         `individual/business/invites/send`,
         formData,
         {
          headers: { Accept: "application/json" },
        }
      );

      if (
        response?.data.message === "RECORD_CREATED" ||
        response?.data?.success === true ||
        response?.data?.success === "true"
      ) {
        toast.success(response?.data?.message || "INVITES_SENT");
        return true;
      } else {
        toast.error("Invite sending failed. Please try again.");
        setError("Invite sending failed. Please try again.");
        return false;
      }
    } catch (err) {
      const msg =   "Error sending invite";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };
const InviteAllUsers = async (inviteData) => {
  setLoading(true);
  setError("");

  try {
    const formData = new FormData();
    const index = 0; // ready for bulk support later

    // Required fields
    formData.append(`invite[${index}][email]`, inviteData.email);
    if(inviteData?.mobile){
    formData.append(`invite[${index}][mobile]`, inviteData.mobile || "");
    }
    formData.append(`invite[${index}][first_name]`, inviteData.first_name);
    formData.append(`invite[${index}][role]`, inviteData.role);

    // Optional fields
    if (inviteData.last_name) {
      formData.append(`invite[${index}][last_name]`, inviteData.last_name);
    }

    if (inviteData.dob) {
      formData.append(`invite[${index}][dob]`, inviteData.dob);
    }

    if (inviteData.sin_number) {
      formData.append(`invite[${index}][sin_number]`, inviteData.sin_number);
    }

    if (inviteData.address) {
      formData.append(`invite[${index}][address]`, inviteData.address);
    }

    // Marital info
    if (inviteData.marital?.status) {
      formData.append(
        `invite[${index}][marital][status]`,
        inviteData.marital.status
      );
    }

    if (inviteData.marital?.spouse_name) {
      formData.append(
        `invite[${index}][marital][spouse_name]`,
        inviteData.marital.spouse_name
      );
    }

    if (inviteData.marital?.spouse_dob) {
      formData.append(
        `invite[${index}][marital][spouse_dob]`,
        inviteData.marital.spouse_dob
      );
    }

    if (inviteData.marital?.spouse_sin_number) {
      formData.append(
        `invite[${index}][marital][spouse_sin_number]`,
        inviteData.marital.spouse_sin_number
      );
    }

    if (inviteData.marital?.spouse_status) {
      formData.append(
        `invite[${index}][marital][spouse_status]`,
        inviteData.marital.spouse_status
      );
    }

    const response = await api.post("users/invites/send", formData);

    if (
      response?.data?.success === true ||
      response?.data?.success === "true" ||
      response?.data?.message === "RECORD_CREATED"
    ) {
      toast.success(response?.data?.message || "INVITES_SENT");
      return true;
    }

    toast.error("Invite sending failed. Please try again.");
    setError("Invite sending failed. Please try again.");
    return false;

  } catch (err) {
    const msg =   "Error sending invite";
    toast.error(msg);
    setError(msg);
    return false;
  } finally {
    setLoading(false);
  }
};

  // Get all invites for a specific client
  const getAllInvites = async (guid) => {
    setLoading(true);
    setError("");

    if (!guid) {
      console.error("Client GUID is required in getAllInvites");
      toast.error("Client GUID is required");
      setLoading(false);
      return null;
    }


    try {

      const firmGuid = guid || localStorage.getItem("firmGuid");
      const response = await api.post(
        `/clients/business/${firmGuid}/invites/all`,
        {},
        {
          headers: { Accept: "application/json" },
        }
      );

      if (response?.data?.success) {
      
        setAllInvites(response.data.payload?.data || []);
        setMeta(response.data.payload?.meta);
        return response.data.payload;
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          // Empty list — not an error, no notification needed.
          setAllInvites([]);
        } else {
          toast.error("Failed to fetch invites");
        }
        setError("Failed to fetch invites");
        return null;
      }
    } catch (err) {
      const msg =   "Error fetching invites";
      toast.error(msg);
      setError(msg);
      setAllInvites([])
      return null;
    } finally {
      setLoading(false);
    }
  };
  const getAllAccountantInvites = async () => {
    setLoading(true);
    setError("");

    


    try {

      // const firmGuid = localStorage.getItem("firmGuid") || guid;
      const response = await api.post(
        `users/invites/all`,
        {},

      );

      if (response?.data?.success) {
      
        setAccountantInvitesData(response.data.payload?.data || []);
        setMeta(response.data.payload?.meta);
        return response.data.payload;
      } else {
        if (response?.data?.message === "RECORDS_NOT_FOUND") {
          setAccountantInvitesData([]);
        } else {
          toast.error("Failed to fetch invites");
        }
        setError("Failed to fetch invites");
        return null;
      }
    } catch (err) {
      const msg =   "Error fetching invites";
      toast.error(msg);
      setError(msg);
      setAccountantInvitesData([])
      return null;
    } finally {
      setLoading(false);
    }
  };
  const resendInvite = async (guid, emails) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    const emailList = Array.isArray(emails) ? emails : [emails];
    emailList.forEach((email) => {
      if (email) {
        formData.append("email[]", email);
      }
    });

    try {
      const response = await api.post(
        `/clients/business/${guid}/invites/resend`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success(response.data.message || "Invite resent successfully");
        return true;
      } else {
        toast.error("Failed to resend invite");
        return false;
      }
    } catch (err) {
      const msg =   "Error resending invite";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };
  const resendInviteAccountant = async (emails) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    const emailList = Array.isArray(emails) ? emails : [emails];
    emailList.forEach((email) => {
      if (email) {
        formData.append("email[]", email);
      }
    });

    try {
      const response = await api.post(
        `users/invites/resend`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success(response.data.message || "Invite resent successfully");
        return true;
      } else {
        toast.error("Failed to resend invite");
        return false;
      }
    } catch (err) {
      const msg =   "Error resending invite";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };
  const deleteInvite = async (guid, emails) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    const emailList = Array.isArray(emails) ? emails : [emails];
    emailList.forEach((email) => {
      if (email) {
        formData.append("email[]", email);
      }
    });

    try {
      const response = await api.post(
        `/clients/business/${guid}/invites/delete`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success(response.data.message || "Invite deleted successfully");
        return true;
      } else {
        toast.error("Failed to delete invite");
        return false;
      }
    } catch (err) {
      const msg =   "Error deleting invite";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };
  const getAllIndividualUsers = useCallback(async ({
    search,
    page = 1,
    resultsPerPage = 10,
    status,
    orderBy,
    deleted,
  } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    if (resultsPerPage !== undefined && resultsPerPage !== null) {
      formData.append("results_per_page", resultsPerPage);
    }
    if (search) formData.append("search", search);
    if (page !== undefined && page !== null) formData.append("page", page);

    const statuses = Array.isArray(status) ? status : status ? [status] : [];
    statuses.forEach((s) => {
      if (s !== undefined && s !== null && String(s).trim() !== "") {
        formData.append("status[]", String(s));
      }
    });

    // Always request TaxFiler users only
    formData.append("roles[]", "Taxfiler");

    if (orderBy) formData.append("order_by", orderBy);
    if (deleted !== undefined && deleted !== null) {
      formData.append("deleted", String(deleted));
    }

    try {
      const response = await api.post(`clients/business/individual/invites/all`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setIndividualUsers(response.data.payload?.data || []);
        setIndividualUsersMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (response?.data?.message === "RECORDS_NOT_FOUND") {
        setIndividualUsers([]);
        setIndividualUsersMeta(response.data.payload?.meta || null);
        return response.data.payload ?? null;
      }

      toast.error("Failed to fetch tax filers");
      setError("Failed to fetch tax filers");
      setIndividualUsers([]);
      setIndividualUsersMeta(null);
      return null;
    } catch (err) {
      const msg = "Error fetching tax filers";
      toast.error(msg);
      setError(msg);
      setIndividualUsers([]);
      setIndividualUsersMeta(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const [organizationRoles, setOrganizationRoles] = useState([]);
  const [organizationRolesMeta, setOrganizationRolesMeta] = useState(null);
  const [organizationPermissions, setOrganizationPermissions] = useState([]);

  const getAllOrganizationRoles = useCallback(async ({
    page = 1,
    resultsPerPage = 10,
    search,
  } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("results_per_page", resultsPerPage);
    formData.append("page", page);
    if (search) formData.append("search", search);

    try {
      const response = await api.post("organizations/roles/all", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setOrganizationRoles(response.data.payload?.data || []);
        setOrganizationRolesMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setOrganizationRoles([]);
        setOrganizationRolesMeta(null);
        return null;
      }

      toast.error("Failed to fetch roles");
      setError("Failed to fetch roles");
      return null;
    } catch (err) {
      toast.error("Error fetching roles");
      setError("Error fetching roles");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const deleteOrganizationRole = useCallback(async ({ id, name, code }) => {
    if (!id) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("code", code);

    try {
      const response = await api.post(`organizations/roles/${id}/delete`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success("Role deleted successfully");
        return true;
      }

      toast.error(response?.data?.message || "Failed to delete role");
      return null;
    } catch (err) {
      let msg = "Error deleting role";
      if (err?.response?.data?.message) {
        if (typeof err.response.data.message === "object") {
          msg = Object.values(err.response.data.message).flat().join(", ");
        } else {
          msg = err.response.data.message;
        }
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const getAllOrganizationPermissions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("organizations/permissions/all", {}, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setOrganizationPermissions(response.data.payload || []);
        return response.data.payload;
      }

      setOrganizationPermissions([]);
      return null;
    } catch (err) {
      setOrganizationPermissions([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const getMyPermissions = useCallback(async ({ userGuid, path, category, icon } = {}) => {
    setPermissionsLoading(true);
    setPermissionsError("");

    const formData = new FormData();
    if (path) formData.append("path", path);
    if (category) formData.append("category", category);
    if (icon) formData.append("icon", icon);

    try {
      const response = await api.post(`organizations/firms/users/${userGuid}/permissions`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        const organizations = response.data.payload?.organizations || [];
        setMyPermissions(organizations);
        return organizations;
      }

      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setMyPermissions([]);
        return [];
      }

      toast.error("Failed to fetch permissions");
      setPermissionsError("Failed to fetch permissions");
      setMyPermissions([]);
      return null;
    } catch (err) {
      const msg = "Error fetching permissions";
      toast.error(msg);
      setPermissionsError(msg);
      setMyPermissions([]);
      return null;
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

 const editOrganizationRole = useCallback(async ({ id, name, permissions = [] }) => {
    if (!id || !name) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);
    permissions.forEach((permId) => {
      formData.append("permissions[]", permId);
    });

    try {
      const response = await api.post(`organizations/roles/${id}/edit`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success("Role updated successfully");
        return response.data.payload;
      }

      toast.error(response?.data?.message || "Failed to update role");
      return null;
    } catch (err) {
      let msg = "Error updating role";
      if (err?.response?.data?.message) {
        if (typeof err.response.data.message === "object") {
          msg = Object.values(err.response.data.message).flat().join(", ");
        } else {
          msg = err.response.data.message;
        }
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const createOrganizationRole = useCallback(async ({ name, code, permissions = [] }) => {
    if (!name || !code) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("code", code);
    permissions.forEach((id) => {
      formData.append("permissions[]", id);
    });

    try {
      const response = await api.post("organizations/roles/create", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        toast.success("Role created successfully");
        return response.data.payload;
      }

      toast.error(response?.data?.message || "Failed to create role");
      return null;
    } catch (err) {
      let msg = "Error creating role";
      if (err?.response?.data?.message) {
        if (typeof err.response.data.message === "object") {
          msg = Object.values(err.response.data.message).flat().join(", ");
        } else {
          msg = err.response.data.message;
        }
      }
      toast.error(msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const removeFirmMember = useCallback(async ({ guid, user_id, organization_role_id }) => {
    if (!guid || !user_id || !organization_role_id) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("user_id", user_id);
    formData.append("organization_role_id", organization_role_id);

    try {
      const response = await api.post(
        `organizations/firms/${guid}/members/remove`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success("Member removed successfully");
        return response.data.payload ?? true;
      }

      toast.error(response?.data?.message || "Failed to remove member");
      return null;
    } catch (err) {
      toast.error("Error removing member");
      setError("Error removing member");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const updateFirmMemberRole = useCallback(async ({ guid, user_id, organization_role_id }) => {
    if (!guid || !user_id || !organization_role_id) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("user_id", user_id);
    formData.append("organization_role_id", organization_role_id);

    try {
      const response = await api.post(
        `organizations/firms/${guid}/members/update-role`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success("Role updated successfully");
        return response.data.payload;
      }

      toast.error(response?.data?.message || "Failed to update role");
      return null;
    } catch (err) {
      toast.error("Error updating role");
      setError("Error updating role");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const assignFirmMember = useCallback(async ({ guid, user_id, organization_role_id }) => {
    if (!guid || !user_id || !organization_role_id) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("user_id", user_id);
    formData.append("organization_role_id", organization_role_id);

    try {
      const response = await api.post(
        `organizations/firms/${guid}/members/assign`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success("Member assigned successfully");
        return response.data.payload;
      }

      toast.error(response?.data?.message || "Failed to assign member");
      return null;
    } catch (err) {
      toast.error("Error assigning member");
      setError("Error assigning member");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const getMyTaxfilerTeam = useCallback(async () => {
    try {
      const response = await api.get(`organizations/taxfilers/my/team`);
      if (response?.data?.success) {
        return response.data.payload?.team ?? [];
      }
      return [];
    } catch (err) {
      console.error("Error fetching my taxfiler team", err);
      return [];
    }
  }, []);

 const getFirmMembers = useCallback(async ({
    guid,
    page = 1,
    resultsPerPage = 10,
    search,
  } = {}) => {
    if (!guid) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("results_per_page", resultsPerPage);
    formData.append("page", page);
    if (search) formData.append("search", search);

    try {
      const response = await api.post(`organizations/firms/${guid}/members`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setFirmMembers(response.data.payload);
        setFirmMembersMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (
        response?.data?.message === "MEMBERS_NOT_FOUND" || 
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND" ||
        response?.data?.message === "No records found"
      ) {
        setFirmMembers(null);
        setFirmMembersMeta(null);
        return null;
      }

      toast.error(response?.data?.message || "Failed to fetch firm members");
      setError(response?.data?.message || "Failed to fetch firm members");
      return null;
    } catch (err) {
      toast.error("Error fetching firm members");
      setError("Error fetching firm members");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Individual/Taxfiler-client counterparts of removeFirmMember/
  // updateFirmMemberRole/assignFirmMember/getFirmMembers above — same
  // organizationRole catalog, same request/response shape, just keyed to
  // a taxfiler guid instead of a firm guid.
  const removeIndividualMember = useCallback(async ({ guid, user_id, organization_role_id }) => {
    if (!guid || !user_id || !organization_role_id) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("user_id", user_id);
    formData.append("organization_role_id", organization_role_id);

    try {
      const response = await api.post(
        `organizations/taxfilers/${guid}/members/remove`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success("Member removed successfully");
        return response.data.payload ?? true;
      }

      toast.error(response?.data?.message || "Failed to remove member");
      return null;
    } catch (err) {
      toast.error("Error removing member");
      setError("Error removing member");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateIndividualMemberRole = useCallback(async ({ guid, user_id, organization_role_id }) => {
    if (!guid || !user_id || !organization_role_id) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("user_id", user_id);
    formData.append("organization_role_id", organization_role_id);

    try {
      const response = await api.post(
        `organizations/taxfilers/${guid}/members/update-role`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success("Role updated successfully");
        return response.data.payload;
      }

      toast.error(response?.data?.message || "Failed to update role");
      return null;
    } catch (err) {
      toast.error("Error updating role");
      setError("Error updating role");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignIndividualMember = useCallback(async ({ guid, user_id, organization_role_id }) => {
    if (!guid || !user_id || !organization_role_id) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("user_id", user_id);
    formData.append("organization_role_id", organization_role_id);

    try {
      const response = await api.post(
        `organizations/taxfilers/${guid}/members/assign`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success("Member assigned successfully");
        return response.data.payload;
      }

      toast.error(response?.data?.message || "Failed to assign member");
      return null;
    } catch (err) {
      toast.error("Error assigning member");
      setError("Error assigning member");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getIndividualMembers = useCallback(async ({
    guid,
    page = 1,
    resultsPerPage = 10,
    search,
  } = {}) => {
    if (!guid) return null;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("results_per_page", resultsPerPage);
    formData.append("page", page);
    if (search) formData.append("search", search);

    try {
      const response = await api.post(`organizations/taxfilers/${guid}/members`, formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setIndividualMembers(response.data.payload);
        setIndividualMembersMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (
        response?.data?.message === "MEMBERS_NOT_FOUND" ||
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setIndividualMembers(null);
        setIndividualMembersMeta(null);
        return null;
      }

      toast.error(response?.data?.message || "Failed to fetch client members");
      setError(response?.data?.message || "Failed to fetch client members");
      return null;
    } catch (err) {
      toast.error("Error fetching client members");
      setError("Error fetching client members");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const getAllFirmsWithAssignments = useCallback(async ({
    page = 1,
    resultsPerPage = 10,
    search,
  } = {}) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("results_per_page", resultsPerPage);
    formData.append("page", page);
    if (search) formData.append("search", search);

    try {
      const response = await api.post("organizations/firms/all", formData, {
        headers: { Accept: "application/json" },
      });

      if (response?.data?.success) {
        setFirmsWithAssignments(response.data.payload?.data || []);
        setFirmsWithAssignmentsMeta(response.data.payload?.meta || null);
        return response.data.payload;
      }

      if (
        response?.data?.message === "RECORDS_NOT_FOUND" ||
        response?.data?.message === "NO_RECORDS_FOUND"
      ) {
        setFirmsWithAssignments([]);
        setFirmsWithAssignmentsMeta(response.data.payload?.meta || null);
        return response.data.payload ?? null;
      }

      toast.error("Failed to fetch firms");
      setError("Failed to fetch firms");
      setFirmsWithAssignments([]);
      setFirmsWithAssignmentsMeta(null);
      return null;
    } catch (err) {
      toast.error("Error fetching firms");
      setError("Error fetching firms");
      setFirmsWithAssignments([]);
      setFirmsWithAssignmentsMeta(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

 const deleteAccountantInvite = async (emails) => {
    setLoading(true);
    setError("");

    const formData = new FormData();
    const emailList = Array.isArray(emails) ? emails : [emails];
    emailList.forEach((email) => {
      if (email) {
        formData.append("email[]", email);
      }
    });

    try {
      const response = await api.post(
        `users/invites/delete`,
        formData,
        { headers: { Accept: "application/json" } }
      );

      if (response?.data?.success) {
        toast.success(response.data.message || "Invite deleted successfully");
        return true;
      } else {
        toast.error("Failed to delete invite");
        return false;
      }
    } catch (err) {
      const msg =   "Error deleting invite";
      toast.error(msg);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };
  return {
    createOrganisation,
    getAllBusinessClients,
    deleteBusinessClient,
    sendInvite,
    getAllInvites,
    resendInvite, 
    deleteInvite,
    editOrganisation,
    viewOrganisation,
    viewOrganisationData,
    getFirmContext,
    organisationGuid,
    allInvites,
    loading,
    error,
    organisationData,
    businessClients,
    meta,
    organizationViewData,
    InviteAllUsers,
    getAllIndividualUsers,
    individualUsers,
    individualUsersMeta,
    getAllAccountantInvites,
    accountantInvitesData,
    resendInviteAccountant,
    deleteAccountantInvite,
    viewAgreementsFile,AgreementfileData,
        getAllTaxFilersUsers,
    taxFilerData,
    taxFilerMeta,
    inviteTaxFiler,
    getAllFirmsWithAssignments,
    firmsWithAssignments,
    firmsWithAssignmentsMeta,
    getFirmMembers,
    firmMembers,
    firmMembersMeta,
    removeFirmMember,
    updateFirmMemberRole,
    assignFirmMember,
    getIndividualMembers,
    individualMembers,
    individualMembersMeta,
    removeIndividualMember,
    updateIndividualMemberRole,
    assignIndividualMember,
    getFirmUsers,
    firmUsers,
    deleteOrganizationRole,
    createOrganizationRole,
    editOrganizationRole,
    getAllOrganizationRoles,
    organizationRoles,
    organizationRolesMeta,
    getAllOrganizationPermissions,
    organizationPermissions,
    getTaxReturnOccurrences,
    occurrenceOptions,
    editAgreement,
    getMyPermissions,
    getMyTaxfilerTeam,
    myPermissions,
    permissionsLoading,
    permissionsError,
    getBusinessClientsForCalendar,
    calendarClients,
    calendarClientsLoading,
  };
}
