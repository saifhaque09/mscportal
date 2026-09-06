import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import useLoginApi from "@/api/useLoginApi";
import AppLogo from "@/components/global/AppLogo";
import NotificationBell from "@/components/global/NotificationBell";
import {
  Home,
  Clock,
  DollarSign,
  CreditCard,
  ListTodo,
  Calendar,
  Check,
  MessageSquare,
  Settings,
  User,
  LogOut,
  BookText,
  User2,
  ChartArea,
  History
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

const TaxFilerSidebar = () => {
  const router = useRouter();
  const [userGuid, setUserGuid] = useState('');
  const [userRole, setUserRole] = useState('client');
  const [userName, setUserName] = useState('');
  const { logout } = useLoginApi();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserGuid(localStorage.getItem("userGuid") || '');
      setUserRole(localStorage.getItem("userRole") || 'client');
      setUserName(localStorage.getItem("user") || '');
    }
  }, []);

  const handleLogout = async () => {
    await logout();
  };
  return (
      <Sidebar collapsible="none" className="w-[260px] shrink-0 bg-background border-r border-border">
      {/* Header */}
      <SidebarHeader className="flex flex-row items-center justify-between p-6 border-b border-border">
        <AppLogo />
        <Home className="w-5 h-5 text-muted-foreground" />
      </SidebarHeader>

      <SidebarContent className="p-6 space-y-6">
        {/* Business Account */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-base font-bold text-foreground mb-4 p-0 h-auto">
            Individual Tax Filer
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid grid-cols-2 gap-3">
              {/* <button onClick={() => router.push("/clientmanagement/clientboard")} className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <Home className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Client Board
                </span>
              </button> */}
              <button onClick={() => router.push(ROUTES.taxfiler.dashboard)} className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <BookText className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Doc Boards
                </span>
              </button>
              <button onClick={() => router.push('/taxfiler/invoices')} className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <DollarSign className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Payments
                </span>
              </button>
              <button onClick={() => router.push('/taxfiler/invoices')} className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <CreditCard className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">Invoices</span>
              </button>
              {/* <button disabled className="opacity-50 cursor-not-allowed bg-muted border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <CreditCard className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">Payroll</span>
              </button> */}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Individual Tax Filers */}
        {/* <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-base font-bold text-foreground mb-4 p-0 h-auto">
            Individual Tax Filers
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <ListTodo className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">
                  DocBoard
                </span>
              </button>
              <button className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <DollarSign className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Payments
                </span>
              </button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup> */}

        {/* Communications */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-base font-bold text-foreground mb-4 p-0 h-auto">
            Communications
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid grid-cols-2 gap-3">
              <button disabled className="opacity-50 cursor-not-allowed bg-muted border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                 <MessageSquare className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Chat
                </span>
              </button>
              <NotificationBell />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Task Progress */}
        

        {/* Settings & Profile */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-base font-bold text-foreground mb-4 p-0 h-auto">
            Settings & Profile
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => router.push(ROUTES.account.settings)} className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <Settings className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Settings
                </span>
              </button>
              <button onClick={() => router.push(`${ROUTES.account.profile}?userGuid=${userGuid}`)} className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <User className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">Profile</span>
              </button>
              {(userRole === 'client' || userRole === 'Client') && (
                <button onClick={() => router.push(ROUTES.business.users)} className="col-span-2 border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                  <User2 className="w-5 h-5 text-foreground" />
                  <span className="text-xs font-medium text-foreground">Users</span>
                </button>
              )}
              <button onClick={() => router.push(ROUTES.account.activityLogs)} className="border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-colors">
                <History className="w-5 h-5 text-foreground" />
                <span className="text-xs font-medium text-foreground">Activity Logs</span>
              </button>
            </div>

            {userName && (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
                  <User className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{capitalize(userRole)}</p>
                </div>
              </div>
            )}

            <button onClick={handleLogout} className="flex items-center justify-center w-full gap-2 bg-red-100 hover:bg-red-200 text-red-500 px-4 py-2 rounded-lg transition-colors font-medium text-sm">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default TaxFilerSidebar;
