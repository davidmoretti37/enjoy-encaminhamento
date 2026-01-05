import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SchoolProvider } from "./contexts/SchoolContext";
import Home from "./pages/Home";
// Company Portal Pages
import CompanyPortalDashboard from "./pages/company/CompanyPortalDashboard";
import CompanyJobs from "./pages/company/CompanyJobs";
import CompanyScheduling from "./pages/company/CompanyScheduling";
import CompanySelection from "./pages/company/CompanySelection";
import CompanyEmployees from "./pages/company/CompanyEmployees";
import CompanyEmployeeDetail from "./pages/company/CompanyEmployeeDetail";
import CompanyPayments from "./pages/company/CompanyPayments";
import CompanySettings from "./pages/company/CompanySettings";
import AdminDashboard from "./pages/AdminDashboard";
// Candidate Portal Pages
import CandidateHome from "./pages/candidate/CandidateHome";
import CandidateJobs from "./pages/candidate/CandidateJobs";
import CandidateProfile from "./pages/candidate/CandidateProfile";
import CandidateApplications from "./pages/candidate/CandidateApplications";
import SchoolManagement from "./pages/SchoolManagement";
// New merged role-aware pages
import CandidatePage from "./pages/CandidatePage";
import CompanyPage from "./pages/CompanyPage";
import JobPage from "./pages/JobPage";
import ContractPage from "./pages/ContractPage";
import PaymentPage from "./pages/PaymentPage";
import CalendarPage from "./pages/CalendarPage";
import FeedbackManagement from "./pages/FeedbackManagement";
import RegionalManagement from "./pages/RegionalManagement";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AffiliateSchools from "./pages/AffiliateSchools";
import SchoolRegistration from "./pages/SchoolRegistration";
import SchoolDashboard from "./pages/SchoolDashboard";
import SchoolJobDescriptions from "./pages/school/SchoolJobDescriptions";
import Login from "./pages/Login";
import AdminCalendar from "./pages/AdminCalendar";
import PublicBooking from "./pages/PublicBooking";
import CompanyForm from "./pages/CompanyForm";
import MeetingConfirm from "./pages/MeetingConfirm";
import ContractSign from "./pages/ContractSign";
import CompanyRegister from "./pages/CompanyRegister";
import SettingsPage from "./pages/SettingsPage";
// Onboarding Pages
import CompanyOnboarding from "./pages/company/CompanyOnboarding";
import CandidateOnboarding from "./pages/candidate/CandidateOnboarding";
import VagasPage from "./pages/VagasPage";
import CompanyVagasPage from "./pages/CompanyVagasPage";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/vagas"} component={CompanyVagasPage} />
      <Route path={"/vagas/:jobId"} component={VagasPage} />
      <Route path={"/escola/registro"} component={SchoolRegistration} />
      <Route path={"/register/school"} component={SchoolRegistration} />
      <Route path={"/register/school/:token"} component={SchoolRegistration} />
      {/* Role-specific dashboards */}
      <Route path={"/affiliate/dashboard"} component={AffiliateDashboard} />
      <Route path={"/affiliate/schools"} component={AffiliateSchools} />
      <Route path={"/school/dashboard"} component={SchoolDashboard} />
      <Route path={"/school/job-descriptions/:companyId"} component={SchoolJobDescriptions} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/regional"} component={RegionalManagement} />
      <Route path={"/admin/feedback"} component={FeedbackManagement} />
      <Route path={"/admin/calendar"} component={AdminCalendar} />
      {/* Simplified role-aware pages (all roles use same URL) */}
      <Route path={"/candidates"} component={CandidatePage} />
      <Route path={"/companies"} component={CompanyPage} />
      <Route path={"/jobs"} component={JobPage} />
      <Route path={"/contracts"} component={ContractPage} />
      <Route path={"/payments"} component={PaymentPage} />
      <Route path={"/calendar"} component={CalendarPage} />
      <Route path={"/settings"} component={SettingsPage} />
      <Route path={"/company/dashboard"} component={CompanyPortalDashboard} />
      {/* Onboarding Routes */}
      <Route path={"/company/onboarding"} component={CompanyOnboarding} />
      <Route path={"/candidate/onboarding"} component={CandidateOnboarding} />
      {/* Candidate Portal Routes */}
      <Route path={"/candidate"} component={CandidateHome} />
      <Route path={"/candidate/vagas"} component={CandidateJobs} />
      <Route path={"/candidate/perfil"} component={CandidateProfile} />
      <Route path={"/candidate/candidaturas"} component={CandidateApplications} />
      {/* Company Portal Routes */}
      <Route path={"/company/portal"} component={CompanyPortalDashboard} />
      <Route path={"/company/jobs"} component={CompanyJobs} />
      <Route path={"/company/scheduling"} component={CompanyScheduling} />
      <Route path={"/company/selection"} component={CompanySelection} />
      <Route path={"/company/employees"} component={CompanyEmployees} />
      <Route path={"/company/employees/:employeeId"} component={CompanyEmployeeDetail} />
      <Route path={"/company/payments"} component={CompanyPayments} />
      <Route path={"/company/settings"} component={CompanySettings} />
      {/* Public routes - no auth required */}
      <Route path={"/book/:adminId"} component={PublicBooking} />
      <Route path={"/form/:adminId"} component={CompanyForm} />
      <Route path={"/meeting/confirm/:token"} component={MeetingConfirm} />
      <Route path={"/contract/:token"} component={ContractSign} />
      <Route path={"/company/register/:token"} component={CompanyRegister} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SchoolProvider>
            <Toaster />
            <Router />
          </SchoolProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
