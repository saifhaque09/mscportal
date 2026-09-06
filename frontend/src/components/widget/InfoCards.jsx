"use client";

import React, { useEffect } from 'react';
import { Calendar } from 'lucide-react';
import useOrganisationApi from '@/api/useOrganisationApi';
import useClientManagementApi from '@/api/useClientManagementApi';

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getOrdinalSuffix = (d) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

// `month` may arrive as a number (1-12) or a month name string depending on the endpoint.
const formatMonthDay = (month, day) => {
  if (!month || !day) return null;
  let monthName;
  if (typeof month === "string" && isNaN(Number(month))) {
    const idx = fullMonthNames.findIndex((m) => m.toLowerCase() === month.toLowerCase());
    monthName = idx !== -1 ? monthNames[idx] : (monthNames.includes(month) ? month : null);
  } else {
    monthName = monthNames[parseInt(month, 10) - 1];
  }
  if (!monthName) return null;

  const dayNum = parseInt(day, 10);
  if (isNaN(dayNum)) return null;

  return `${dayNum}${getOrdinalSuffix(dayNum)} ${monthName}`;
};

// The backend's `tax_return` object uses the misspelled `occurance` key, not `occurrence`.
const getTaxOccurrence = (taxReturn) => taxReturn?.occurance ?? taxReturn?.occurrence ?? null;

const AVATAR_COLORS = [
  "bg-pink-200 text-pink-700",
  "bg-blue-200 text-blue-700",
  "bg-purple-200 text-purple-700",
  "bg-orange-200 text-orange-700",
  "bg-emerald-200 text-emerald-700",
];

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getAvatarColor(seed = "") {
  return AVATAR_COLORS[seed.length % AVATAR_COLORS.length];
}

function normalizeFirmMembers(payload) {
  if (!payload) return [];
  const members = [];
  Object.entries(payload).forEach(([key, roleMembers]) => {
    if (!Array.isArray(roleMembers)) return;
    roleMembers.forEach((m) => {
      members.push({
        id: m.id ?? m.guid,
        name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—",
        email: m.email || "—",
        seed: m.guid || m.email || String(m.id ?? key),
      });
    });
  });
  return members;
}

function normalizeBusinessUsers(users) {
  if (!Array.isArray(users)) return [];
  return users.map((u) => ({
    id: u.id ?? u.guid,
    name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—",
    email: u.email || "—",
    phone: u.mobile || null,
    seed: u.guid || u.email || String(u.id),
  }));
}

const UserCard = ({ user }) => (
  <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col items-start min-w-[180px] flex-1 overflow-hidden">
    <div
      className={`w-14 h-14 rounded-full mb-3 flex items-center justify-center font-bold text-lg flex-shrink-0 ${getAvatarColor(
        user.seed
      )}`}
    >
      {getInitials(user.name) || "?"}
    </div>
    <h3 className="font-semibold text-foreground text-sm mb-0.5 w-full truncate" title={user.name}>{user.name}</h3>
    <p className="text-[13px] text-muted-foreground mb-0.5 w-full truncate" title={user.email}>{user.email}</p>
    {user.phone && <p className="text-[13px] text-muted-foreground mb-0.5 w-full truncate" title={user.phone}>{user.phone}</p>}
    {user.country && <p className="text-[13px] text-muted-foreground w-full truncate" title={user.country}>{user.country}</p>}
  </div>
);

const isDeadlineApproaching = (month, day) => {
  if (!month || !day) return false;
  let monthNum;
  if (typeof month === "string" && isNaN(Number(month))) {
    const idx = fullMonthNames.findIndex((m) => m.toLowerCase() === month.toLowerCase());
    monthNum = idx !== -1 ? idx : (monthNames.includes(month) ? monthNames.indexOf(month) : -1);
  } else {
    monthNum = parseInt(month, 10) - 1;
  }
  if (monthNum < 0 || isNaN(monthNum)) return false;

  const dayNum = parseInt(day, 10);
  if (isNaN(dayNum)) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const targetThisYear = new Date(now.getFullYear(), monthNum, dayNum);
  const targetNextYear = new Date(now.getFullYear() + 1, monthNum, dayNum);

  const diffThisYear = Math.round((targetThisYear - today) / (1000 * 60 * 60 * 24));
  const diffNextYear = Math.round((targetNextYear - today) / (1000 * 60 * 60 * 24));

  // Red if it's within the next 15 days or up to 15 days past
  const isApproaching = (diff) => diff <= 15 && diff >= -15;

  return isApproaching(diffThisYear) || isApproaching(diffNextYear);
};

const InfoCards = ({ firmId, organisation }) => {
  const { getFirmMembers, firmMembers } = useOrganisationApi();
  const { getAllBusinessUsers, userData } = useClientManagementApi();

  // `organisation.guid` is the real database guid; `firmId` (URL param) may only be the
  // short business code, which the firm-members endpoint doesn't accept — see patterns/client-logo.md.
  const realGuid = organisation?.guid || firmId;

  useEffect(() => {
    if (realGuid) {
      getFirmMembers({ guid: realGuid, resultsPerPage: 50 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realGuid]);

  useEffect(() => {
    if (firmId) {
      getAllBusinessUsers(firmId, 1, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmId]);

  const accountants = normalizeFirmMembers(firmMembers);
  const clientAdmins = normalizeBusinessUsers(userData);

  const gstHstDate = organisation ? formatMonthDay(organisation.tax_return?.month, organisation.tax_return?.day) : null;
  const gstHstOccurrence = organisation ? getTaxOccurrence(organisation.tax_return) : null;
  const financialYearEndDate = organisation
    ? formatMonthDay(organisation.financial_year_end?.month, organisation.financial_year_end?.day)
    : null;

  const isFyeApproaching = organisation
    ? isDeadlineApproaching(organisation.financial_year_end?.month, organisation.financial_year_end?.day)
    : false;

  return (
    <div className="w-full flex flex-col gap-6">

      {/* GST/HST Returns */}
      <div className="bg-card border border-border rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-6 w-full">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[14px] font-bold text-foreground tracking-wide">GST/HST Returns</span>
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
        <h2 className="text-[28px] font-extrabold text-foreground mb-2">{gstHstDate || "N/A"}</h2>
        <p className="text-[13px] text-muted-foreground">
          {gstHstOccurrence ? `${gstHstOccurrence} — must submit all documents 15 days before this date.` : "Must submit all documents 15 days before this date."}
        </p>
      </div>

      {/* Financial Year End */}
      <div className="bg-card border border-border rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-6">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[14px] font-bold text-foreground tracking-wide">Financial Year End</span>
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
        <h2 className={`text-[28px] font-extrabold mb-2 ${isFyeApproaching ? 'text-destructive' : 'text-foreground'}`}>
          {financialYearEndDate || "N/A"}
        </h2>
        <p className="text-[13px] text-muted-foreground">Must submit all documents 15 days before this date.</p>
      </div>

      {/* Accountant Assigned Section */}
      <div className="mt-2">
        <h2 className="text-[17px] font-bold text-foreground tracking-wide mb-4">Accountant Assigned</h2>
        {accountants.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No accountants assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {accountants.map((u) => <UserCard key={u.id} user={u} />)}
          </div>
        )}
      </div>

      {/* Client Admins Section */}
      <div className="mt-2">
        <h2 className="text-[17px] font-bold text-foreground tracking-wide mb-4">Client Admins</h2>
        {clientAdmins.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No client admins found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {clientAdmins.map((u) => <UserCard key={u.id} user={u} />)}
          </div>
        )}
      </div>

    </div>
  );
};

export default InfoCards;
