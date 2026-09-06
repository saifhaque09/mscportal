import { useMemo, useState } from "react";
import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Home,
  Settings,
  Users,
  User,
  FileText,
  MessageCircle,
  List,
  Bell,
  Building2,
  HelpCircle,
  Headphones,
  BookOpen,
  MoreVertical,
  LogOut,
  StickyNote,
  CreditCard,
  FileKey,
  ChevronRight,
  Briefcase,
  Users2,
  User2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import useUserApi from "@/api/useUserApi";
import useLoginApi from "@/api/useLoginApi";
import { ROUTES } from "@/config/routes";


const menuItemsByRole = {
  accountant: {
    main: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home
      },
      // {
      //   title: "Individual Tax Filers",
      //   url: "/individual-tax-filers",
      //   icon: User,
      //   disabled: true
      // },
      {
        title: "Clients",
        icon: Briefcase,
        type: "group",
        isOpen: true,
        items: [
          { title: "Business", url: "/dashboard?view=business", disabled: false },
          { title: "Individual", url: "/organisation-details", disabled: true },
          // { title: "Client Employees", url: "/client-employees", disabled: true },
          // { title: "Client Previous Employees", url: "/client-prev-employees", disabled: true },
          // { title: "Co-Accountants", url: "/co-accountants", disabled: true },
        ]
      },
      {
        title: "Chat",
        url: "/chat",
        icon: MessageCircle,
        disabled: false,
      },
      {
        title: "Invoices",
        url: ROUTES.business.invoices,
        icon: FileText,
        disabled: false,
      },
      // {
      //   title: "Notifications",
      //   url: "/notifications",
      //   icon: Bell,
      //   badge: 15,
      //   disabled: true,
      // },
      // {
      //   title: "Settings-Notifications",
      //   url: "/settings/notifications",
      //   icon: Bell,
      //   badge: 15,
      //   disabled: true,
      // },
      // {
      //   title: "Settings-General",
      //   url: "/settings/general",
      //   icon: Settings,
      //   disabled: true,
      // },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        disabled: false,
      },
      {
        title: "Users",
        url: "/accountantuser",
        icon: User2,
        disabled: false
      },

    ],
    // more: [
    //   {
    //     title: "Documentation",
    //     url: "/documentation",
    //     icon: BookOpen,
    //     disabled: true,
    //   },
    //   {
    //     title: "Help",
    //     url: "/help",
    //     icon: HelpCircle,
    //     disabled: true,
    //   },
    //   {
    //     title: "Support",
    //     url: "/support",
    //     icon: Headphones,
    //     disabled: true,
    //   }
    // ]
  },
  Client: {
    main: [
      {
        title: "Dashboard",
        url: "/clientmanagement/clientdashboard",
        icon: Home,
      },
      // {
      //   title: "Current Year Transactions",
      //   url: "#",
      //   icon: List,
      //   disabled: true,
      // },
      // {
      //   title: "Previous Year Documents",
      //   url: "#",
      //   icon: StickyNote,
      //   disabled: true,
      // },
      // {
      //   title: "Current Payroll",
      //   url: "#",
      //   icon: List,
      //   disabled: true,
      // },
      // {
      //   title: "Previous Payroll",
      //   url: "#",
      //   icon: CreditCard,
      //   disabled: true,
      // },
      {
        title: "Chat",
        url: "/chat",
        icon: MessageCircle,
        disabled: false,
      },
      {
        title: "Invoices",
        url: ROUTES.business.invoices,
        icon: FileText,
        disabled: false,
      },
      // {
      //   title: "Notifications",
      //   url: "/notifications",
      //   icon: Bell,
      //   badge: 15,
      //   disabled: true,
      // },
      {
        title: "Business",
        url: "/organisation",
        icon: Building2,
        disabled: true
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        disabled: false
      },
      {
        title: "Users",
        url: "/clientmanagement/user",
        icon: User2,
        disabled: false
      },
    ],
    // more: [
    //   {
    //     title: "Documentation",
    //     url: "/documentation",
    //     icon: BookOpen,
    //     disabled: true,
    //   },
    //   {
    //     title: "Help",
    //     url: "/help",
    //     icon: HelpCircle,
    //     disabled: true,
    //   },
    //   {
    //     title: "Support",
    //     url: "/support",
    //     icon: Headphones,
    //     disabled: true,
    //   }
    // ]

  },
  employee: {
    main: [
      {
        title: "Dashboard",
        url: "/clientmanagement/clientdashboard",
        icon: Home,
      },
      // {
      //   title: "Current Year Transactions",
      //   url: "#",
      //   icon: List,
      //   disabled: true,
      // },
      // {
      //   title: "Previous Year Documents",
      //   url: "#",
      //   icon: StickyNote,
      //   disabled: true,
      // },
      // {
      //   title: "Current Payroll",
      //   url: "#",
      //   icon: List,
      //   disabled: true,
      // },
      // {
      //   title: "Previous Payroll",
      //   url: "#",
      //   icon: CreditCard,
      //   disabled: true,
      // },
      {
        title: "Chat",
        url: "/chat",
        icon: MessageCircle,
        disabled: false,
      },
      // {
      //   title: "Notifications",
      //   url: "/notifications",
      //   icon: Bell,
      //   badge: 15,
      //   disabled: true,
      // },
      {
        title: "Business",
        url: "/organisation",
        icon: Building2,
        disabled: true
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        disabled: false
      },
      // {
      //   title: "Users",
      //   url: "user",
      //   icon: User2,
      //   disabled: false
      // },
    ],
  }, 
  
  taxfiler: {
    main: [
      {
        title: "Dashboard",
        url: "/taxfilerdashboard",
        icon: Home,
      },
      // {
      //   title: "Current Year Transactions",
      //   url: "#",
      //   icon: List,
      //   disabled: true,
      // },
      // {
      //   title: "Previous Year Documents",
      //   url: "#",
      //   icon: StickyNote,
      //   disabled: true,
      // },
      // {
      //   title: "Current Payroll",
      //   url: "#",
      //   icon: List,
      //   disabled: true,
      // },
      // {
      //   title: "Previous Payroll",
      //   url: "#",
      //   icon: CreditCard,
      //   disabled: true,
      // },
      {
        title: "Chat",
        url: "/chat",
        icon: MessageCircle,
        disabled: false,
      },
      // {
      //   title: "Notifications",
      //   url: "/notifications",
      //   icon: Bell,
      //   badge: 15,
      //   disabled: true,
      // },
      {
        title: "Business",
        url: "/organisation",
        icon: Building2,
        disabled: true
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        disabled: false
      },
      // {
      //   title: "Users",
      //   url: "user",
      //   icon: User2,
      //   disabled: false
      // },
    ],
  }
};

export function AppSidebar() {

  const [authorized, setAuthorized] = useState(false);
  const userRole = useMemo(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userRole") || "client";
    }
    return "client";
  }, []);

  const roleData = menuItemsByRole[userRole] || menuItemsByRole.Client;
  const mainItems = Array.isArray(roleData) ? roleData : roleData.main || [];
  const moreItems = !Array.isArray(roleData) ? roleData.more || [] : [];
  const router = useRouter();

  const [openGroups, setOpenGroups] = useState({ "Business Users": true });

  const { viewUser, getAppName, editUser, updatePassword, sendResetLink, loading: apiLoading } = useUserApi();
  const { logout } = useLoginApi();
  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };
  const [userName, setUserName] = useState('');
  const [userGuid, setUserGuid] = useState('');

  const [appName, setAppName] = useState('');
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const fetchAppName = async () => {
      setIsAppLoading(true);
      try {
        const data = await getAppName();
        if (data && data.app_name) {
          setAppName(data.app_name);
        }
      } finally {
        setIsAppLoading(false);
      }
    };
    fetchAppName();
  }, []);

  useEffect(() => {
    setUserName(localStorage.getItem("user") || '');
    setUserGuid(localStorage.getItem("userGuid") || '');
  }, []);

  const refreshUserName = async (guidOverride) => {
    const guid = guidOverride || userGuid || localStorage.getItem("userGuid");
    if (!guid) return;

    try {
      const userData = await viewUser(guid);
      const nextName = userData?.first_name || '';
      if (nextName) {
        setUserName(nextName);
        localStorage.setItem("user", nextName);
      }
    } catch (error) {
      console.error("Error refreshing user name", error);
    }
  };
console.log(userRole,'ssssss')
  useEffect(() => {
    const handleRefreshUser = () => {
      refreshUserName();
    };

    window.addEventListener("refresh-user", handleRefreshUser);
    return () => {
      window.removeEventListener("refresh-user", handleRefreshUser);
    };
  }, [userGuid, ]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");


    if (!token) {
      router.replace("/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  //check if user profile is complete

  useEffect(() => {
    const checkUserProfile = async () => {

      if (userGuid && (userRole === 'client' || userRole === 'employee'|| userRole === 'taxfiler')) {
        try {
          const userData = await viewUser(userGuid);
          if (userData) {
            const { mobile } = userData;
            const meta = userData.meta || {};
            const sin_number = meta.sin_number;
            const dob = meta.dob;
            const maritalStatus = meta.marital?.status;
            const bank_details = meta.bank_details;


            const missingFields = [];
            if (!sin_number) missingFields.push("SIN");

            if (missingFields.length > 0) {
              const missingParam = encodeURIComponent(missingFields.join(", "));
              router.push(`/profile?userGuid=${userGuid}&incomplete=1&missing=${missingParam}`);
            }
          }
        } catch (error) {
          console.error("Error fetching user details for redirection check", error);
        }
      }
    };

    if (userGuid && userRole && authorized) {
      checkUserProfile();
    }
  }, [userGuid, userRole, authorized]);

  const handleLogout = async () => {
    await logout();
  };

  if (!authorized) {
    return null; // or a loader
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-4 py-2">
          {isAppLoading ? (
            <Skeleton className="h-7 w-32" />
          ) : (
            <h2 className="text-lg font-bold">{appName}</h2>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                if (item.type === 'group') {
                  const isOpen = openGroups[item.title];
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => toggleGroup(item.title)}
                        className="flex justify-between items-center w-full"
                      >
                        <div className="flex items-center gap-2">
                          {item.icon && <item.icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                      </SidebarMenuButton>
                      {isOpen && (
                        <SidebarMenuSub>
                          {item.items.map(subItem => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild disabled={subItem.disabled}>
                                <a href={subItem.url} className={subItem.disabled ? "pointer-events-none opacity-50" : ""}>
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild disabled={item.disabled}>
                     <div
      onClick={async (e) => {
        const normalizedRole = String(userRole || "").toLowerCase();

        if (item.disabled) return;

        // TAXFILER CASE
        if (
          normalizedRole === "taxfiler" &&
          item.url === "/taxfilerdashboard"
        ) {
          const isComplete = await ensureTaxfilerProfileComplete();

          if (isComplete) {
            router.push("/taxfilerdashboard");
          }
        } else {
          // NORMAL NAVIGATION
          router.push(item.url);
        }
      }}
      className={
        item.disabled
          ? "pointer-events-none opacity-50 flex justify-between items-center cursor-not-allowed"
          : "flex justify-between items-center cursor-pointer"
      }
    >
                        <div className="flex items-center gap-2">
                          {item.icon && <item.icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <span className="text-xs text-blue-600 font-medium">{item.badge}</span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {moreItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>More</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {moreItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild disabled={item.disabled}>
                      <a href={item.url} className={item.disabled ? "pointer-events-none opacity-50" : ""}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>

                  </div>
                  <MoreVertical className="cursor-pointer ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      {/* <span className="truncate text-xs">m@example.com</span> */}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/profile?userGuid=${userGuid}`)}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {/* <DropdownMenuItem>
                  <FileKey className="mr-2 h-4 w-4" />
                  Reset Password
                </DropdownMenuItem> */}
                {/* <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  Login Report
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
