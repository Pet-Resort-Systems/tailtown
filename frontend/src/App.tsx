import React, { useEffect, Suspense, lazy } from "react";
import {
  Routes,
  Route,
  Navigate,
  BrowserRouter,
  useLocation,
} from "react-router-dom";
import {
  Box,
  CircularProgress,
  CssBaseline,
  ThemeProvider,
} from "@mui/material";
import { HelmetProvider } from "react-helmet-async";
import theme from "./theme";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SuperAdminProvider } from "./contexts/SuperAdminContext";
import { ShoppingCartProvider } from "./contexts/ShoppingCartContext";
import { HelpProvider } from "./contexts/HelpContext";
import AccessibilityFix from "./components/AccessibilityFix";
import ScrollFix from "./components/ScrollFix";
import ApiTester from "./components/debug/ApiTester";
import PageLoader from "./components/common/PageLoader";
import "./styles/mobile.css"; // Mobile-specific styles

// Layouts - Lazy loaded for code splitting
const MainLayout = lazy(() => import("./components/layouts/MainLayout"));
const AuthLayout = lazy(() => import("./components/layouts/AuthLayout"));

// Pages - Lazy loaded for code splitting
// All pages lazy loaded for optimal code splitting
const Login = lazy(() => import("./pages/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy loaded pages - Customer Management
const Customers = lazy(() => import("./pages/customers/Customers"));
const CustomerDetails = lazy(() => import("./pages/customers/CustomerDetails"));

// Lazy loaded pages - Analytics & Reports
const AnalyticsDashboard = lazy(
  () => import("./pages/analytics/AnalyticsDashboard")
);
const CustomerValueReport = lazy(
  () => import("./pages/analytics/CustomerValueReport")
);
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));

// Lazy loaded pages - Pet Management
const Pets = lazy(() => import("./pages/pets/Pets"));
const PetDetails = lazy(() => import("./pages/pets/PetDetails"));

// Lazy loaded pages - Reservations
const Reservations = lazy(() => import("./pages/reservations/Reservations"));
const ReservationDetails = lazy(
  () => import("./pages/reservations/ReservationDetails")
);
const ReservationEdit = lazy(
  () => import("./pages/reservations/ReservationEdit")
);

// Lazy loaded pages - Calendar
const CalendarPage = lazy(() => import("./pages/calendar/CalendarPage"));
const GroomingCalendarPage = lazy(
  () => import("./pages/calendar/GroomingCalendarPage")
);
const TrainingCalendarPage = lazy(
  () => import("./pages/calendar/TrainingCalendarPage")
);

// Lazy loaded pages - Services & Resources
const Services = lazy(() => import("./pages/services/Services"));
const ServiceDetails = lazy(() => import("./pages/services/ServiceDetails"));
const Resources = lazy(() => import("./pages/resources/Resources"));
const ResourceDetails = lazy(() => import("./pages/resources/ResourceDetails"));
const SuitesPage = lazy(() => import("./pages/suites/SuitesPage"));

// Lazy loaded pages - Settings & Admin
const PriceRulesPage = lazy(() => import("./pages/settings/PriceRules"));
const PriceRuleDetailsPage = lazy(
  () => import("./pages/settings/PriceRuleDetailsPage")
);
const PaymentMethods = lazy(() => import("./pages/settings/PaymentMethods"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Users = lazy(() => import("./pages/settings/Users"));
const BusinessSettings = lazy(() => import("./pages/admin/BusinessSettings"));
const PriceRuleRedirect = lazy(
  () => import("./components/redirects/PriceRuleRedirect")
);

// Lazy loaded pages - Staff & Operations
const Scheduling = lazy(() => import("./pages/staff/Scheduling"));

// Tenant Management moved to separate admin-portal app (port 3001)
const OrderEntry = lazy(() => import("./pages/orders/OrderEntry"));
const CheckoutPage = lazy(() => import("./pages/checkout/CheckoutPage"));
const PrintKennelCards = lazy(() => import("./pages/kennels/PrintKennelCards"));

// Lazy loaded pages - Marketing
const MarketingHub = lazy(() => import("./pages/admin/marketing/MarketingHub"));
const SmsMarketing = lazy(() => import("./pages/admin/marketing/SmsMarketing"));
const EmailMarketing = lazy(
  () => import("./pages/admin/marketing/EmailMarketing")
);
const MessageTemplates = lazy(
  () => import("./pages/admin/marketing/MessageTemplates")
);

// Lazy loaded pages - Check-In
const CheckInWorkflow = lazy(() => import("./pages/check-in/CheckInWorkflow"));

// Lazy loaded pages - Super Admin
const SuperAdminLogin = lazy(() => import("./pages/super-admin/Login"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const SuperAdminRoute = lazy(() => import("./components/auth/SuperAdminRoute"));
const SuperAdminOnlyRoute = lazy(
  () => import("./components/auth/SuperAdminOnlyRoute")
);

// Lazy loaded pages - Tenant Management
const TenantManagement = lazy(() => import("./pages/admin/TenantManagement"));
const CheckInComplete = lazy(() => import("./pages/check-in/CheckInComplete"));
const CheckInTemplateManager = lazy(
  () => import("./pages/admin/CheckInTemplateManager")
);

// Lazy loaded pages - Checkout
const CheckoutWorkflow = lazy(
  () => import("./pages/checkout/CheckoutWorkflow")
);

// Lazy loaded pages - Checklists
const ChecklistTemplates = lazy(
  () => import("./pages/admin/ChecklistTemplates")
);
const ChecklistView = lazy(() => import("./pages/staff/ChecklistView"));

// Lazy loaded pages - Vaccine Management
const VaccineRequirements = lazy(
  () => import("./pages/admin/VaccineRequirements")
);

// Lazy loaded pages - Custom Icons
const CustomIcons = lazy(() => import("./pages/admin/CustomIcons"));

// Lazy loaded pages - Announcements
const AnnouncementManager = lazy(
  () => import("./pages/admin/AnnouncementManager")
);

// Lazy loaded pages - Loyalty Program
const LoyaltyProgram = lazy(() => import("./pages/admin/LoyaltyProgram"));

// Lazy loaded pages - Coupons
const CouponManagement = lazy(() => import("./pages/admin/CouponManagement"));

// Lazy loaded pages - Daycare Passes
const DaycarePassManagement = lazy(
  () => import("./pages/admin/DaycarePassManagement")
);

// Lazy loaded pages - Products/POS
const Products = lazy(() => import("./pages/products/Products"));

// Lazy loaded pages - Grooming
const GroomerAppointments = lazy(
  () => import("./pages/grooming/GroomerAppointments")
);

// Lazy loaded pages - Training
const TrainingClasses = lazy(() => import("./pages/training/TrainingClasses"));
const ClassEnrollments = lazy(
  () => import("./pages/training/ClassEnrollments")
);

// Lazy loaded pages - Report Cards
const ReportCards = lazy(() => import("./pages/reportCards/ReportCards"));

// Lazy loaded pages - Waitlist
const Waitlist = lazy(() => import("./pages/waitlist/Waitlist"));

// Public Booking Portal
const BookingPortal = lazy(() => import("./pages/booking/BookingPortal"));

// Mobile Pages
const MobileDashboard = lazy(() => import("./pages/mobile/MobileDashboard"));
const Checklists = lazy(() => import("./pages/mobile/Checklists"));
const TeamChat = lazy(() => import("./pages/mobile/TeamChat"));
const MySchedule = lazy(() => import("./pages/mobile/MySchedule"));
const MobileProfile = lazy(() => import("./pages/mobile/Profile"));
const MobileReportCards = lazy(
  () => import("./pages/mobile/MobileReportCards")
);

// Custom event and utility components

// Custom event for route changes
export const RouteChangeEvent = "app:route-change";

// Emit route change event
const RouteChangeListener = () => {
  const location = useLocation();

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(RouteChangeEvent, { detail: location })
    );
  }, [location]);

  return null;
};

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Super Admin Routes - Separate authentication */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route
          path="/super-admin/dashboard"
          element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/admin/tenants"
          element={
            <SuperAdminOnlyRoute>
              <TenantManagement />
            </SuperAdminOnlyRoute>
          }
        />

        {/* Public Booking Portal - No authentication required */}
        <Route path="/book" element={<BookingPortal />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              !isAuthenticated ? <Login /> : <Navigate to="/dashboard" />
            }
          />
          <Route
            path="/forgot-password"
            element={
              !isAuthenticated ? (
                <ForgotPassword />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
          <Route
            path="/reset-password"
            element={
              !isAuthenticated ? (
                <ResetPassword />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
        </Route>

        {/* Protected Routes */}
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
          />
          <Route
            path="/customers"
            element={isAuthenticated ? <Customers /> : <Navigate to="/login" />}
          />
          <Route
            path="/customers/:id"
            element={
              isAuthenticated ? <CustomerDetails /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/pets"
            element={isAuthenticated ? <Pets /> : <Navigate to="/login" />}
          />
          <Route
            path="/pets/:id"
            element={
              isAuthenticated ? <PetDetails /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/reservations"
            element={
              isAuthenticated ? <Reservations /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/reservations/:id"
            element={
              isAuthenticated ? (
                <ReservationDetails />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/reservations/:id/edit"
            element={
              isAuthenticated ? <ReservationEdit /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/calendar"
            element={
              isAuthenticated ? <CalendarPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/calendar/grooming"
            element={
              isAuthenticated ? (
                <GroomingCalendarPage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/calendar/training"
            element={
              isAuthenticated ? (
                <TrainingCalendarPage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/services"
            element={isAuthenticated ? <Services /> : <Navigate to="/login" />}
          />
          <Route
            path="/services/new"
            element={
              isAuthenticated ? <ServiceDetails /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/services/:id"
            element={
              isAuthenticated ? <ServiceDetails /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/resources"
            element={isAuthenticated ? <Resources /> : <Navigate to="/login" />}
          />
          <Route
            path="/resources/:id"
            element={
              isAuthenticated ? <ResourceDetails /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/suites"
            element={
              isAuthenticated ? <SuitesPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/kennels/print-cards"
            element={
              isAuthenticated ? <PrintKennelCards /> : <Navigate to="/login" />
            }
          />
          {/* Redirects for old price rules URLs */}
          <Route
            path="/price-rules"
            element={<Navigate to="/settings/price-rules" />}
          />
          <Route path="/price-rules/:id" element={<PriceRuleRedirect />} />
          <Route
            path="/settings"
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings/users"
            element={isAuthenticated ? <Users /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings/payment-methods"
            element={
              isAuthenticated ? <PaymentMethods /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/settings/business"
            element={
              isAuthenticated ? <BusinessSettings /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/settings/price-rules"
            element={
              isAuthenticated ? <PriceRulesPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/settings/price-rules/new"
            element={
              isAuthenticated ? (
                <PriceRuleDetailsPage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/settings/price-rules/:id"
            element={
              isAuthenticated ? (
                <PriceRuleDetailsPage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/staff/scheduling"
            element={
              isAuthenticated ? <Scheduling /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/orders/new"
            element={
              isAuthenticated ? <OrderEntry /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/checkout"
            element={
              isAuthenticated ? <CheckoutPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/reports"
            element={
              isAuthenticated ? <ReportsPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/analytics"
            element={
              isAuthenticated ? (
                <AnalyticsDashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/analytics/customers"
            element={
              isAuthenticated ? (
                <CustomerValueReport />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Marketing Routes */}
          <Route
            path="/admin/marketing"
            element={
              isAuthenticated ? <MarketingHub /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/marketing/sms"
            element={
              isAuthenticated ? <SmsMarketing /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/marketing/email"
            element={
              isAuthenticated ? <EmailMarketing /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/marketing/templates"
            element={
              isAuthenticated ? <MessageTemplates /> : <Navigate to="/login" />
            }
          />

          {/* Check-In Routes */}
          <Route
            path="/check-in/:reservationId"
            element={
              isAuthenticated ? <CheckInWorkflow /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/check-in/:checkInId/complete"
            element={
              isAuthenticated ? <CheckInComplete /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/check-in-templates"
            element={
              isAuthenticated ? (
                <CheckInTemplateManager />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Checkout Routes */}
          <Route
            path="/checkout/:reservationId"
            element={
              isAuthenticated ? <CheckoutWorkflow /> : <Navigate to="/login" />
            }
          />

          {/* Checklist Routes */}
          <Route
            path="/admin/checklist-templates"
            element={
              isAuthenticated ? (
                <ChecklistTemplates />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/staff/checklist/:id"
            element={
              isAuthenticated ? <ChecklistView /> : <Navigate to="/login" />
            }
          />

          {/* Vaccine Management Routes */}
          <Route
            path="/admin/vaccine-requirements"
            element={
              isAuthenticated ? (
                <VaccineRequirements />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Custom Icons Route */}
          <Route
            path="/admin/custom-icons"
            element={
              isAuthenticated ? <CustomIcons /> : <Navigate to="/login" />
            }
          />

          {/* Announcement Routes */}
          <Route
            path="/admin/announcements"
            element={
              isAuthenticated ? (
                <AnnouncementManager />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Loyalty Program Route */}
          <Route
            path="/admin/loyalty"
            element={
              isAuthenticated ? <LoyaltyProgram /> : <Navigate to="/login" />
            }
          />

          {/* Coupon Management Route */}
          <Route
            path="/admin/coupons"
            element={
              isAuthenticated ? <CouponManagement /> : <Navigate to="/login" />
            }
          />

          {/* Daycare Pass Management Route */}
          <Route
            path="/admin/daycare-passes"
            element={
              isAuthenticated ? (
                <DaycarePassManagement />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Products/POS Routes */}
          <Route
            path="/products"
            element={isAuthenticated ? <Products /> : <Navigate to="/login" />}
          />

          {/* Grooming Routes */}
          <Route
            path="/grooming/appointments"
            element={
              isAuthenticated ? (
                <GroomerAppointments />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Training Routes */}
          <Route
            path="/training/classes"
            element={
              isAuthenticated ? <TrainingClasses /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/training/classes/:classId/enrollments"
            element={
              isAuthenticated ? <ClassEnrollments /> : <Navigate to="/login" />
            }
          />

          {/* Report Card Routes */}
          <Route
            path="/report-cards"
            element={
              isAuthenticated ? <ReportCards /> : <Navigate to="/login" />
            }
          />

          {/* Waitlist Routes */}
          <Route
            path="/waitlist"
            element={isAuthenticated ? <Waitlist /> : <Navigate to="/login" />}
          />

          {/* Debug routes */}
          <Route path="/debug/api" element={<ApiTester />} />
        </Route>

        {/* Mobile Routes - No MainLayout wrapper */}
        <Route
          path="/mobile/dashboard"
          element={
            isAuthenticated ? <MobileDashboard /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/mobile/checklists"
          element={isAuthenticated ? <Checklists /> : <Navigate to="/login" />}
        />
        <Route
          path="/mobile/chat"
          element={isAuthenticated ? <TeamChat /> : <Navigate to="/login" />}
        />
        <Route
          path="/mobile/schedule"
          element={isAuthenticated ? <MySchedule /> : <Navigate to="/login" />}
        />
        <Route
          path="/mobile/report-cards"
          element={
            isAuthenticated ? <MobileReportCards /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/mobile/profile"
          element={
            isAuthenticated ? <MobileProfile /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/mobile"
          element={
            isAuthenticated ? (
              <Navigate to="/mobile/dashboard" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AccessibilityFix />
          <ScrollFix />
          <RouteChangeListener />
          <SuperAdminProvider>
            <AuthProvider>
              <ShoppingCartProvider>
                <HelpProvider>
                  <React.Suspense
                    fallback={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "100vh",
                        }}
                      >
                        <CircularProgress />
                      </Box>
                    }
                  >
                    <AppRoutes />
                  </React.Suspense>
                </HelpProvider>
              </ShoppingCartProvider>
            </AuthProvider>
          </SuperAdminProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;
