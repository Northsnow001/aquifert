import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import Landing from "./pages/Landing";
import Platform from "./pages/Platform";
import WhyAquifert from "./pages/WhyAquifert";
import { MembershipPage } from "./pages/MembershipPage";
import ContactPage from "./pages/Contact";
import Help from "./pages/Help";
import Aquibot from "./pages/Aquibot";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import SetPassword from "./pages/SetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import Hub from "./pages/Hub";
import NitrogenReport from "./pages/NitrogenReport";
import Library from "./pages/Library";
import LibraryReport from "./pages/LibraryReport";
import NotFound from "./pages/NotFound";
import StyleGuide from "./pages/StyleGuide";
import { RequirePortal } from "@/components/AppLayout";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

import AdminDashboard from "./pages/admin/Dashboard";
import AdminCommunications from "./pages/admin/Communications";
import AdminRequests from "./pages/admin/Requests";
import AdminDrafts from "./pages/admin/Drafts";
import AdminOrders from "./pages/admin/Orders";
import AdminTrades from "./pages/admin/Trades";
import AdminDocControl from "./pages/admin/DocControl";
import AdminTracking from "./pages/admin/Tracking";
import AdminInsights from "./pages/admin/Insights";
import AdminUsers from "./pages/admin/Users";
import AdminFinance from "./pages/admin/Finance";
import AdminLibrary from "./pages/admin/Library";
import AdminPlans from "./pages/admin/Plans";
import AdminBilling from "./pages/admin/Billing";
import AdminLicences from "./pages/admin/Licences";
import LicensedData from "./pages/LicensedData";
import AnalyticsMarketData from "./pages/analytics/MarketData";
import AnalyticsSignal from "./pages/analytics/SignalFull";
import AnalyticsFreight from "./pages/analytics/FreightAnalytics";
import AnalyticsSupplyDemand from "./pages/analytics/SupplyDemand";
import AnalyticsTelex from "./pages/analytics/TelexFull";
import AnalyticsNewsletter from "./pages/analytics/Newsletter";
import AnalyticsAlerts from "./pages/analytics/Alerts";
import AdminNewsletter from "./pages/admin/NewsletterAdmin";
import AdminBrokers from "./pages/admin/Brokers";

import BuyerDashboard from "./pages/buyer/Dashboard";
import BuyerNewRequest from "./pages/buyer/NewRequest";
import BuyerQuotes from "./pages/buyer/Quotes";
import BuyerOrders from "./pages/buyer/Orders";
import BuyerMembership from "./pages/buyer/Membership";
import BuyerBilling from "./pages/buyer/Billing";
import PricingPage from "./pages/Pricing";
import BuyerInsights from "./pages/buyer/Insights";
import BuyerFinancing from "./pages/buyer/Financing";

import SupplierDashboard from "./pages/supplier/Dashboard";
import SupplierRequests from "./pages/supplier/Requests";
import SupplierOrders from "./pages/supplier/Orders";
import SupplierEarnings from "./pages/supplier/Earnings";
import SupplierProfile from "./pages/supplier/Profile";

import Aq1Telex from "./pages/aq1/Telex";
import Aq1Analysis from "./pages/aq1/Analysis";
import Aq1Signal from "./pages/aq1/Signal";
import Aq1UreaCalc from "./pages/aq1/UreaCalc";
import Aq1FreightTeaser from "./pages/aq1/FreightTeaser";
import Aq1OrderNow from "./pages/aq1/OrderNow";
import Aq1CommunityCall from "./pages/aq1/CommunityCall";
import Aq1UserGuide from "./pages/aq1/UserGuide";
import Aq1Contact from "./pages/aq1/Contact";
import Aq1PlanUsage from "./pages/aq1/PlanUsage";
import AdminAq1 from "./pages/admin/Aq1";

const STAFF = ["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"];

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={window.location.hash === "#design-system" ? <StyleGuide /> : <Landing />} />
        <Route path="/design-system" element={<StyleGuide />} />
        <Route path="/platform" element={<Platform />} />
        <Route path="/why-aquifert" element={<WhyAquifert />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/help" element={<Help />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/hub" element={<RequirePortal allow={["ADMIN","OPERATIONS","FINANCE","SUPPORT","BUYER","SUPPLIER"]}><Hub /></RequirePortal>} />
        <Route path="/nitrogen-report" element={<RequirePortal allow={["ADMIN","OPERATIONS","FINANCE","SUPPORT","BUYER","SUPPLIER"]}><NitrogenReport /></RequirePortal>} />

        <Route path="/admin" element={<RequirePortal allow={STAFF}><AdminDashboard /></RequirePortal>} />
        <Route path="/admin/communications" element={<RequirePortal allow={STAFF}><AdminCommunications /></RequirePortal>} />
        <Route path="/admin/requests" element={<RequirePortal allow={STAFF}><AdminRequests /></RequirePortal>} />
        <Route path="/admin/drafts" element={<RequirePortal allow={STAFF}><AdminDrafts /></RequirePortal>} />
        <Route path="/admin/orders" element={<RequirePortal allow={STAFF}><AdminOrders /></RequirePortal>} />
        <Route path="/admin/orders/:id" element={<RequirePortal allow={STAFF}><AdminOrders /></RequirePortal>} />
        <Route path="/admin/trades" element={<RequirePortal allow={STAFF}><AdminTrades /></RequirePortal>} />
        <Route path="/admin/trades/:id" element={<RequirePortal allow={STAFF}><AdminTrades /></RequirePortal>} />
        <Route path="/admin/documents" element={<RequirePortal allow={STAFF}><AdminDocControl /></RequirePortal>} />
        <Route path="/admin/tracking" element={<RequirePortal allow={STAFF}><AdminTracking /></RequirePortal>} />
        <Route path="/admin/insights" element={<RequirePortal allow={STAFF}><AdminInsights /></RequirePortal>} />
        <Route path="/admin/library" element={<RequirePortal allow={STAFF}><AdminLibrary /></RequirePortal>} />
        <Route path="/admin/library/:id" element={<RequirePortal allow={STAFF}><AdminLibrary /></RequirePortal>} />
        <Route path="/admin/users" element={<RequirePortal allow={["ADMIN"]}><AdminUsers /></RequirePortal>} />
        <Route path="/admin/finance" element={<RequirePortal allow={["ADMIN", "FINANCE"]}><AdminFinance /></RequirePortal>} />

        <Route path="/buyer" element={<RequirePortal allow={["BUYER"]}><BuyerDashboard /></RequirePortal>} />
        <Route path="/buyer/request" element={<RequirePortal allow={["BUYER"]} membersOnly><BuyerNewRequest /></RequirePortal>} />
        <Route path="/buyer/quotes" element={<RequirePortal allow={["BUYER"]} membersOnly><BuyerQuotes /></RequirePortal>} />
        <Route path="/buyer/orders" element={<RequirePortal allow={["BUYER"]} membersOnly><BuyerOrders /></RequirePortal>} />
        <Route path="/buyer/membership" element={<RequirePortal allow={["BUYER"]}><BuyerMembership /></RequirePortal>} />
        <Route path="/buyer/billing" element={<RequirePortal allow={["BUYER"]}><BuyerBilling /></RequirePortal>} />
        <Route path="/buyer/insights" element={<RequirePortal allow={["BUYER"]} membersOnly><BuyerInsights /></RequirePortal>} />
        <Route path="/buyer/financing" element={<RequirePortal allow={["BUYER"]} membersOnly><BuyerFinancing /></RequirePortal>} />
        <Route path="/aquibot" element={<RequirePortal allow={["BUYER", "SUPPLIER", "ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"]}><Aquibot /></RequirePortal>} />
        <Route path="/library" element={<RequirePortal allow={["BUYER", "SUPPLIER", "ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"]}><Library /></RequirePortal>} />
        <Route path="/library/:slug" element={<RequirePortal allow={["BUYER", "SUPPLIER", "ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"]}><LibraryReport /></RequirePortal>} />

        <Route path="/supplier" element={<RequirePortal allow={["SUPPLIER"]}><SupplierDashboard /></RequirePortal>} />
        <Route path="/supplier/requests" element={<RequirePortal allow={["SUPPLIER"]}><SupplierRequests /></RequirePortal>} />
        <Route path="/supplier/orders" element={<RequirePortal allow={["SUPPLIER"]}><SupplierOrders /></RequirePortal>} />
        <Route path="/supplier/earnings" element={<RequirePortal allow={["SUPPLIER"]}><SupplierEarnings /></RequirePortal>} />
        <Route path="/supplier/profile" element={<RequirePortal allow={["SUPPLIER"]}><SupplierProfile /></RequirePortal>} />

        <Route path="/account/telex" element={<RequirePortal allow={["BUYER", ...STAFF]}><Aq1Telex /></RequirePortal>} />
        <Route path="/account/analysis" element={<RequirePortal allow={["BUYER", ...STAFF]}><Aq1Analysis /></RequirePortal>} />
        <Route path="/account/analysis/:slug" element={<RequirePortal allow={["BUYER", ...STAFF]}><Aq1Analysis /></RequirePortal>} />
        <Route path="/account/signal" element={<RequirePortal allow={["BUYER", ...STAFF]}><Aq1Signal /></RequirePortal>} />
        <Route path="/account/nitrogen-report" element={<Navigate to="/nitrogen-report" replace />} />
        <Route path="/account/urea-calculator" element={<RequirePortal allow={["BUYER"]}><Aq1UreaCalc /></RequirePortal>} />
        <Route path="/account/freight-analytics" element={<RequirePortal allow={["BUYER", ...STAFF]}><Aq1FreightTeaser /></RequirePortal>} />
        <Route path="/account/order-now" element={<RequirePortal allow={["BUYER"]}><Aq1OrderNow /></RequirePortal>} />
        <Route path="/account/community-call" element={<RequirePortal allow={["BUYER", ...STAFF]}><Aq1CommunityCall /></RequirePortal>} />
        <Route path="/account/user-guide" element={<RequirePortal allow={["BUYER", ...STAFF]}><Aq1UserGuide /></RequirePortal>} />
        <Route path="/account/contact" element={<RequirePortal allow={["BUYER", ...STAFF]}><Aq1Contact /></RequirePortal>} />
        <Route path="/account/plan" element={<RequirePortal allow={["BUYER"]}><Aq1PlanUsage /></RequirePortal>} />
        <Route path="/admin/aq1" element={<RequirePortal allow={STAFF}><AdminAq1 /></RequirePortal>} />
        <Route path="/admin/plans" element={<RequirePortal allow={["ADMIN"]}><AdminPlans /></RequirePortal>} />
        <Route path="/admin/billing" element={<RequirePortal allow={["ADMIN", "FINANCE"]}><AdminBilling /></RequirePortal>} />
        <Route path="/admin/licences" element={<RequirePortal allow={["ADMIN"]}><AdminLicences /></RequirePortal>} />
        <Route path="/licensed-data" element={<RequirePortal allow={["BUYER", "SUPPLIER", "ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"]}><LicensedData /></RequirePortal>} />
        <Route path="/analytics/telex" element={<RequirePortal allow={["BUYER", ...STAFF]}><AnalyticsTelex /></RequirePortal>} />
        <Route path="/analytics/market-data" element={<RequirePortal allow={["BUYER", ...STAFF]}><AnalyticsMarketData /></RequirePortal>} />
        <Route path="/analytics/signal" element={<RequirePortal allow={["BUYER", ...STAFF]}><AnalyticsSignal /></RequirePortal>} />
        <Route path="/analytics/freight" element={<RequirePortal allow={["BUYER", ...STAFF]}><AnalyticsFreight /></RequirePortal>} />
        <Route path="/analytics/supply-demand" element={<RequirePortal allow={["BUYER", ...STAFF]}><AnalyticsSupplyDemand /></RequirePortal>} />
        <Route path="/analytics/newsletter" element={<RequirePortal allow={["BUYER", ...STAFF]}><AnalyticsNewsletter /></RequirePortal>} />
        <Route path="/analytics/alerts" element={<RequirePortal allow={["BUYER", ...STAFF]}><AnalyticsAlerts /></RequirePortal>} />
        <Route path="/admin/newsletter" element={<RequirePortal allow={STAFF}><AdminNewsletter /></RequirePortal>} />
        <Route path="/admin/brokers" element={<RequirePortal allow={STAFF}><AdminBrokers /></RequirePortal>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
