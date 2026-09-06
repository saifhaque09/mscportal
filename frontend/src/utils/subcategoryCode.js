// Shared shape/formatting helpers for a business client's subcategory code
// entries (Prep Account Step 2 entry form, Step 3 code summary).
// Record fields: code, value, status + the optional invoice detail fields.

export const EMPTY_CODE_ROW = {
  code: "",
  value: "",
  vendor_name: "",
  invoice_date: "",
  invoice_number: "",
  gst_hst_tax: "",
};

// The listing returns invoice_date as a full ISO timestamp; native date
// inputs only accept YYYY-MM-DD, and that's also how we display it.
export const toDateInputValue = (iso) => (iso ? String(iso).slice(0, 10) : "");

// Every field on a code/invoice record is mandatory on both add and update.
export const CODE_FIELD_LABELS = {
  vendor_name: "Name of vendor",
  invoice_date: "Date of invoice",
  invoice_number: "Invoice Number",
  code: "Code",
  gst_hst_tax: "GST/HST Tax",
  value: "Value",
};

export const CODE_FIELDS = Object.keys(CODE_FIELD_LABELS);

// Money-ish fields: digits with at most two decimals, no negatives.
const AMOUNT_FIELDS = ["gst_hst_tax", "value"];
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const fieldValue = (row, field) => String(row?.[field] ?? "").trim();

export const isCodeRowEmpty = (row) =>
  CODE_FIELDS.every((field) => fieldValue(row, field) === "");

// Returns { field: message } — empty object means the row is valid.
export const validateCodeRow = (row) => {
  const errors = {};

  CODE_FIELDS.forEach((field) => {
    const label = CODE_FIELD_LABELS[field];
    const value = fieldValue(row, field);

    if (value === "") {
      errors[field] = `${label} is required`;
      return;
    }
    if (AMOUNT_FIELDS.includes(field) && !AMOUNT_PATTERN.test(value)) {
      errors[field] = `${label} must be a number (up to 2 decimals)`;
    }
    if (field === "invoice_date" && Number.isNaN(new Date(value).getTime())) {
      errors[field] = `${label} is not a valid date`;
    }
  });

  return errors;
};

export const hasCodeRowErrors = (errors) =>
  Boolean(errors) && Object.keys(errors).length > 0;

export const toEditableRow = (row) => ({
  code: row.code ?? "",
  value: row.value ?? "",
  vendor_name: row.vendor_name ?? "",
  invoice_date: toDateInputValue(row.invoice_date),
  invoice_number: row.invoice_number ?? "",
  gst_hst_tax: row.gst_hst_tax ?? "",
});
