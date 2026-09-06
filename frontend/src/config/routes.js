// Single source of truth for every frontend URL. Import ROUTES instead of
// hardcoding path strings in router.push()/router.replace()/<Link href>.
//
// Keys are grouped by domain (business/individual/taxfiler/account/admin).
// The business/individual/taxfiler domains have already been physically
// moved to match their keys (see next.config.js for the old-path redirects
// and AclSeeder.php for the synced menu paths); account/admin/documents
// still live at their pre-refactor folder locations pending the same move.
// When a domain is moved, only the string values here need to change
// (plus a redirects() entry and the backend AclSeeder.php path) — call
// sites don't, since they all reference these constants instead of literals.
//
// Dynamic query params (?guid=, ?userGuid=, etc.) are intentionally left to
// call sites to append — param names vary across pages and baking them in
// here risked silently changing behavior during this refactor.

export const ROUTES = {
  dashboard: {
    root: "/dashboard",
    businessClients: "/business/clients",
    individualClients: "/individual/clients",
    individualClientInvite: "/individual/clients/invite",
    calendar: "/dashboard/calendar",
    deadlines: "/dashboard/deadlines",
    deadlinesForClient: (clientId) => `/dashboard/deadlines/${clientId}`,
  },

  business: {
    create: "/business/create",
    view: "/business/view",
    edit: "/business/edit",
    board: "/business/board",
    dashboard: "/business/dashboard",
    dashboardAdmin: "/business/dashboard/admin",
    users: "/business/users",
    inviteUser: "/business/users/invite",
    invites: "/business/invites",
    checklist: "/business/checklist",
    checklistSubcategory: "/business/checklist/subcategory",
    checklistDocAdmin: "/business/checklist/documents/admin",
    checklistDocClient: "/business/checklist/documents/client",
    allDocuments: "/business/documents",
    prepAccounts: "/business/prep-accounts",
    prepAccountsReview: "/business/prep-accounts/review",
    prepAccountsFiling: "/business/prep-accounts/filing",
    payments: "/business/payments",
    paymentsAdd: "/business/payments/add",
    paymentsEdit: "/business/payments/edit",
    paymentsView: "/business/payments/view",
    invoices: "/business/invoices",
    invoicesNew: "/business/invoices/new",
    accountants: "/business/accountants",
    accountantEnrol: "/business/accountants/enrol",
  },

  individual: {
    accountantRoot: "/individual/clients/all",
    taxfilerView: "/individual/clients/view",
    invitation: "/individual/invites",
    payments: "/individual/payments",
    paymentsAdd: "/individual/payments/add",
    paymentsEdit: "/individual/payments/edit",
    paymentsView: "/individual/payments/view",
    accountants: "/individual/accountants",
    accountantEnrol: "/individual/accountants/enrol",
  },

  taxfiler: {
    dashboard: "/taxfiler/dashboard",
    finalize: "/taxfiler/finalize",
    clientView: "/taxfiler/documents/view",
    clientSubcategories: "/taxfiler/documents",
    clientDocumentView: "/taxfiler/documents/category",
  },

  account: {
    profile: "/profile",
    settings: "/settings",
    activityLogs: "/activity-logs",
    payroll: "/payroll",
    myDocuments: "/mydocuments",
    myDocumentsFiling: "/mydocuments/filing",
  },

  admin: {
    accountantUsers: "/accountantuser",
    invitations: "/invitations",
    rolesAndPermissions: "/roles-and-permissions",
    defaultChecklist: "/defaultchecklist",
    defaultChecklistSubcategory: "/defaultchecklistsubcategory",
  },

  documents: {
    view: "/documents/view",
    viewer: "/documentViewer",
  },

  auth: {
    login: "/login",
    forgotPassword: "/forgot-password",
    createPassword: "/createpassword",
    changePassword: "/changepassword",
    privacyPolicy: "/privacy-policy",
    termsOfService: "/terms-of-service",
  },
};
