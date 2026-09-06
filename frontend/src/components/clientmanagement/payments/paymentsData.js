// Shared option constants and presentational helpers for business-client
// payment pages. Payment records themselves come from the real
// useBusinessPaymentApi hook, not mock data.

export const TAX_YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

export const PAYMENT_STATUS_OPTIONS = ["Pending", "Paid", "Cancelled"];

export const PAYMENT_TYPE_OPTIONS = ["Cash", "E-Payment"];

export function getInitials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0)?.toUpperCase() ?? "";
  const second = words[1]?.charAt(0)?.toUpperCase() ?? "";
  return `${first}${second}` || "--";
}

const AVATAR_STYLES = [
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

export function getAvatarStyle(index = 0) {
  return AVATAR_STYLES[Math.abs(index) % AVATAR_STYLES.length];
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === "") return "--";
  return `C$${Number(amount).toLocaleString()}`;
}

export function formatDisplayDate(isoDate) {
  if (!isoDate) return "--";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
