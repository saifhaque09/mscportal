"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { Home, LogOut, User } from "lucide-react";
import { ROUTES } from "@/config/routes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import useLoginApi from "@/api/useLoginApi";
import AppLogo from "@/components/global/AppLogo";
import NotificationBell from "@/components/global/NotificationBell";

const FALLBACK_MENU = [
  { id: "fallback-dashboard", title: "Dashboard", icon: "Home", path: "/dashboard" },
  { id: "fallback-clients", title: "Clients", icon: "Briefcase", path: "/business/clients" },
  { id: "fallback-create-client", title: "Create Client", icon: "UserPlus", path: "/business/create" },
  { id: "fallback-chat", title: "Chat", icon: "MessageCircle", path: "/chat" },
  {
    id: "fallback-invoices",
    title: "Invoices",
    icon: "FileText",
    path: ROUTES.business.invoices,
  },
  { id: "fallback-payments", title: "Payments", icon: "CreditCard", path: "/individual/payments" },
  {
    id: "fallback-individual-invoices",
    title: "Individual T4 invoices",
    icon: "ReceiptText",
    path: "/business/individual-invoices",
  },
  {
    id: "fallback-individual-payment-log",
    title: "Individual payment log",
    icon: "History",
    path: "/business/individual-invoices/payments",
  },
  {
    id: "fallback-settings",
    title: "Settings & Profile",
    icon: "Settings",
    children: [
      { id: "fallback-settings-item", title: "Settings", icon: "Settings", path: "/settings" },
      { id: "fallback-profile-item", title: "Profile", icon: "User", path: "/profile" },
    ],
  },
];

// The sidebar is server-driven — these entries come back in the login response
// as `user.roles[0].links` (ACL rows, cached in localStorage as `aclMenu`), so
// the real switch is the `status` flag on those rows backend-side. Until that
// lands they're greyed out here for the roles that shouldn't use them: still
// listed, but dimmed and not clickable.
// Business Account's own "Assign Accountant" (/accountant-assign) is
// deliberately NOT in this list — only the Individual Tax Filers one is.
const RESTRICTED_MENU_PATHS = new Set([
  "/payroll", // Business Account → Payroll
  "/clientmanagement/payments", // Business Account → Payments
  "/individual-accountant-assign", // Individual Tax Filers → Assign Accountant
  "/individualaccountant/payments", // Individual Tax Filers → Payments
]);

const RESTRICTED_MENU_ROLES = new Set(["admin", "accountant"]);

// Greying a link out does not protect the route — anyone typing the URL still
// lands on the page. Route-level access is `ProtectedRoute`'s job.
function isRestrictedPath(role, path) {
  return RESTRICTED_MENU_ROLES.has(role) && RESTRICTED_MENU_PATHS.has(path);
}

function resolveIcon(name) {
  return LucideIcons[name] ?? Home;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

const DynamicSidebar = () => {
  const router = useRouter();
  const [userGuid] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("userGuid") || "" : ""
  );
  const [userName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("user") || "" : ""
  );
  const [userRole] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("userRole") || "" : ""
  );
  const [menu] = useState(() => {
    if (typeof window === "undefined") return FALLBACK_MENU;
    try {
      const parsed = JSON.parse(localStorage.getItem("aclMenu") || "[]");
      if (parsed.length === 0) return FALLBACK_MENU;

      // ACL data can be partial or stale after new modules are enabled. Keep
      // server-provided entries, but append the core portal links so the
      // sidebar never loses access to invoices, individual billing, payments,
      // profile, or settings.
      const paths = new Set();
      parsed.forEach((item) => {
        if (item.path) paths.add(item.path);
        (item.children || []).forEach((child) => child.path && paths.add(child.path));
      });
      const businessItems = [
        { id: "fallback-create-client", title: "Create Client", icon: "UserPlus", path: "/business/create" },
      ];
      const individualItems = [
        { id: "fallback-individual-invoices", title: "Individual T4 invoices", icon: "ReceiptText", path: "/business/individual-invoices" },
        { id: "fallback-individual-payment-log", title: "Individual payment log", icon: "History", path: "/business/individual-invoices/payments" },
      ];
      const grouped = parsed.map((section) => {
        const title = String(section.title || "").toLowerCase();
        if (title.includes("business account")) {
          const existing = new Set((section.children || []).map((item) => item.path));
          return { ...section, children: [...(section.children || []), ...businessItems.filter((item) => !existing.has(item.path))] };
        }
        if (title.includes("individual tax filer") || title.includes("individual client")) {
          const existing = new Set((section.children || []).map((item) => item.path));
          return { ...section, children: [...(section.children || []), ...individualItems.filter((item) => !existing.has(item.path))] };
        }
        return section;
      });
      return grouped;
    } catch {
      return FALLBACK_MENU;
    }
  });
  const { logout } = useLoginApi();

  const handleLogout = async () => {
    await logout();
  };

  const navigateTo = (path) => {
    if (!path || path.startsWith("#")) return;
    router.push(path === ROUTES.account.profile ? `${ROUTES.account.profile}?userGuid=${userGuid}` : path);
  };

  return (
    <Sidebar collapsible="none" className="w-[260px] shrink-0 bg-background border-r border-border">
      <SidebarHeader className="flex flex-row items-center justify-between p-6 border-b border-border">
        <AppLogo />
        <Home className="w-5 h-5 text-muted-foreground" />
      </SidebarHeader>

      <SidebarContent className="p-6 space-y-6">
        {menu.map((section) => {
          const SectionIcon = resolveIcon(section.icon);
          const children = section.children ?? [];

          if (children.length === 0) {
            return (
              <SidebarGroup key={section.id} className="p-0">
                <SidebarGroupContent>
                  <button
                    onClick={() => navigateTo(section.path)}
                    className="w-full border border-border rounded-xl p-4 flex flex-row items-center justify-center gap-3 hover:bg-accent transition-colors"
                  >
                    <SectionIcon className="w-5 h-5 text-foreground" />
                    <span className="text-sm font-bold text-foreground">{section.title}</span>
                  </button>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup key={section.id} className="p-0">
              <SidebarGroupLabel className="text-base font-bold text-foreground mb-4 p-0 h-auto">
                {section.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="grid grid-cols-2 gap-3">
                  {children.map((item) => {
                    const ItemIcon = resolveIcon(item.icon);
                    const restricted = isRestrictedPath(userRole, item.path);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={restricted}
                        aria-disabled={restricted}
                        title={restricted ? `${item.title} is not available` : undefined}
                        onClick={() => navigateTo(item.path)}
                        className={
                          restricted
                            ? "border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                            : "border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors"
                        }
                      >
                        <ItemIcon
                          className={
                            restricted
                              ? "w-5 h-5 text-muted-foreground"
                              : "w-5 h-5 text-foreground"
                          }
                        />
                        <span
                          className={
                            restricted
                              ? "text-xs font-medium text-muted-foreground"
                              : "text-xs font-medium text-foreground"
                          }
                        >
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        <SidebarGroup className="p-0">
          <SidebarGroupContent className="space-y-3">
            {userName && (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
                  <User className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{capitalize(userRole)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center flex-1 gap-2 bg-red-100 hover:bg-red-200 text-red-500 px-4 py-2 rounded-lg transition-colors font-medium text-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
              <NotificationBell variant="compact" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default DynamicSidebar;
