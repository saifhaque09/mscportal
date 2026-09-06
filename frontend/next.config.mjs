import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  devIndicators: {
    position: "top-right",
  },
  // Individual/taxfiler routes were consolidated from 8 fragmented top-level
  // segments into /individual/* and /taxfiler/*  — see src/config/routes.js.
  // These redirects keep old bookmarks/deep links working; query strings are
  // forwarded automatically by Next.js. Remove once traffic to the old paths
  // is negligible.
  async redirects() {
    return [
      { source: "/dashboard/individualclient", destination: "/individual/clients", permanent: true },
      { source: "/dashboard/individualclient/invite", destination: "/individual/clients/invite", permanent: true },
      { source: "/individualaccountant", destination: "/individual/clients/all", permanent: true },
      { source: "/individualaccountant/taxfiler/view", destination: "/individual/clients/view", permanent: true },
      { source: "/individualaccountant/invitation", destination: "/individual/invites", permanent: true },
      { source: "/individualaccountant/payments", destination: "/individual/payments", permanent: true },
      { source: "/individualaccountant/payments/add", destination: "/individual/payments/add", permanent: true },
      { source: "/individualaccountant/payments/edit", destination: "/individual/payments/edit", permanent: true },
      { source: "/individualaccountant/payments/view", destination: "/individual/payments/view", permanent: true },
      { source: "/individual-accountant-assign", destination: "/individual/accountants", permanent: true },
      { source: "/individual-client-enrolment", destination: "/individual/accountants/enrol", permanent: true },
      { source: "/taxfilerdashboard", destination: "/taxfiler/dashboard", permanent: true },
      { source: "/finalize-account", destination: "/taxfiler/finalize", permanent: true },
      { source: "/individualclient/view", destination: "/taxfiler/documents/view", permanent: true },
      { source: "/individualclient/subcategories", destination: "/taxfiler/documents", permanent: true },
      { source: "/individualclient/document/view", destination: "/taxfiler/documents/category", permanent: true },

      // Business routes: /clientmanagement/*, /dashboard/businessclient,
      // /createorganisation, /accountant-assign, /client-accountant-enrolment
      // consolidated into /business/*.
      { source: "/dashboard/businessclient", destination: "/business/clients", permanent: true },
      { source: "/createorganisation", destination: "/business/create", permanent: true },
      { source: "/clientmanagement/vieworganisation", destination: "/business/view", permanent: true },
      { source: "/clientmanagement/editorganisation", destination: "/business/edit", permanent: true },
      { source: "/clientmanagement/clientboard", destination: "/business/board", permanent: true },
      { source: "/clientmanagement/clientdashboard", destination: "/business/dashboard", permanent: true },
      { source: "/clientmanagement/clientdashboard/admin", destination: "/business/dashboard/admin", permanent: true },
      { source: "/clientmanagement/user", destination: "/business/users", permanent: true },
      { source: "/clientmanagement/user/inviteuser", destination: "/business/users/invite", permanent: true },
      { source: "/clientmanagement/invites", destination: "/business/invites", permanent: true },
      { source: "/clientmanagement/viewchecklist", destination: "/business/checklist", permanent: true },
      { source: "/clientmanagement/checklistsubcategory", destination: "/business/checklist/subcategory", permanent: true },
      { source: "/clientmanagement/viewchecklistdoc/admin", destination: "/business/checklist/documents/admin", permanent: true },
      { source: "/clientmanagement/viewchecklistdoc/client", destination: "/business/checklist/documents/client", permanent: true },
      { source: "/clientmanagement/viewalldocuments", destination: "/business/documents", permanent: true },
      { source: "/clientmanagement/prepaccounts", destination: "/business/prep-accounts", permanent: true },
      { source: "/clientmanagement/prepaccounts/review", destination: "/business/prep-accounts/review", permanent: true },
      { source: "/clientmanagement/prepaccounts/filing", destination: "/business/prep-accounts/filing", permanent: true },
      { source: "/clientmanagement/payments", destination: "/business/payments", permanent: true },
      { source: "/clientmanagement/payments/add", destination: "/business/payments/add", permanent: true },
      { source: "/clientmanagement/payments/edit", destination: "/business/payments/edit", permanent: true },
      { source: "/clientmanagement/payments/view", destination: "/business/payments/view", permanent: true },
      { source: "/accountant-assign", destination: "/business/accountants", permanent: true },
      { source: "/client-accountant-enrolment", destination: "/business/accountants/enrol", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
