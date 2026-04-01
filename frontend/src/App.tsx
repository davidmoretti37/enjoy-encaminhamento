import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthGuard from "./components/AuthGuard";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AgencyProvider } from "./contexts/AgencyContext";
import Home from "./pages/Home";
import ResetPassword from "./pages/ResetPassword";
// Company Portal Pages
import CompanyPortalDashboard from "./pages/company/CompanyPortalDashboard";
import CompanyJobs from "./pages/company/CompanyJobs";
import CompanyScheduling from "./pages/company/CompanyScheduling";
import CompanySelection from "./pages/company/CompanySelection";
import CompanyEmployees from "./pages/company/CompanyEmployees";
import CompanyEmployeeDetail from "./pages/company/CompanyEmployeeDetail";
import CompanyPayments from "./pages/company/CompanyPayments";
import CompanySettingsScreen from "./pages/company/CompanySettingsScreen";
// Candidate Portal Pages
import CandidateHome from "./pages/candidate/CandidateHome";
import CandidateJobs from "./pages/candidate/CandidateJobs";
import CandidateSettingsScreen from "./pages/candidate/CandidateSettingsScreen";
import CandidateApplications from "./pages/candidate/CandidateApplications";
import CandidateSignContract from "./pages/candidate/CandidateSignContract";
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
import AdminAgencies from "./pages/AdminAgencies";
import AgencyRegistration from "./pages/AgencyRegistration";
import AgencyDashboard from "./pages/AgencyDashboard";
import AgencyJobDescriptions from "./pages/agency/AgencyJobDescriptions";
import AgencyPortal from "./pages/agency/AgencyPortal";
import Login from "./pages/Login";
import PublicBooking from "./pages/PublicBooking";
import CompanyForm from "./pages/CompanyForm";
import MeetingConfirm from "./pages/MeetingConfirm";
import ContractSign from "./pages/ContractSign";
import CompanyRegister from "./pages/CompanyRegister";
import SettingsPage from "./pages/SettingsPage";
// Onboarding Pages
import CompanyOnboarding from "./pages/company/CompanyOnboarding";
import CompanyPendingContracts from "./pages/company/CompanyPendingContracts";
import CandidateOnboarding from "./pages/candidate/CandidateOnboarding";
import CompanyInviteAccept from "./pages/company/CompanyInviteAccept";
import CompanyJoin from "./pages/company/CompanyJoin";
import VagasPage from "./pages/VagasPage";
import CompanyVagasPage from "./pages/CompanyVagasPage";
// Public landing pages
import JovemAprendizPage from "./pages/JovemAprendizPage";
import EmpresasPage from "./pages/EmpresasPage";
import AssessoriaPage from "./pages/AssessoriaPage";
import CltPcdPage from "./pages/CltPcdPage";
import EstagioPage from "./pages/EstagioPage";
import PublicVagasPage from "./pages/PublicVagasPage";
import NotificationsScreen from "./pages/NotificationsScreen";
import ExternalSigningPage from "./pages/signing/ExternalSigningPage";
import AuthCallback from "./pages/AuthCallback";
// New Funnel Portals
import EmpresaPortal from "./pages/EmpresaPortal";
import CandidatoPortal from "./pages/CandidatoPortal";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
    <ScrollToTop />
    <Switch>
      {/* Public routes - no auth required */}
      <Route path={"/"} component={Home} />
      <Route path={"/jovem-aprendiz"} component={JovemAprendizPage} />
      <Route path={"/empresas"} component={EmpresasPage} />
      <Route path={"/assessoria"} component={AssessoriaPage} />
      <Route path={"/clt"} component={CltPcdPage} />
      <Route path={"/estagio"} component={EstagioPage} />
      <Route path={"/vagas"} component={PublicVagasPage} />
      <Route path={"/login"} component={Login} />
      <Route path={"/auth/callback"} component={AuthCallback} />
      <Route path={"/auth/reset-password"} component={ResetPassword} />
      <Route path={"/contract/:token"} component={ContractSign} />
      <Route path={"/company/register/:token"} component={CompanyRegister} />
      {/* Agency registration */}
      <Route path={"/register/agency/:token"} component={AgencyRegistration} />
      <Route path={"/register/agency"} component={AgencyRegistration} />
      <Route path={"/agencia/registro"} component={AgencyRegistration} />
      <Route path={"/meeting/confirm/:token"} component={MeetingConfirm} />
      <Route path={"/book/:adminId"} component={PublicBooking} />
      <Route path={"/form/:adminId"} component={CompanyForm} />
      <Route path={"/company/invite/:token"} component={CompanyInviteAccept} />
      <Route path={"/company/join"} component={CompanyJoin} />
      <Route path={"/assinar/:token"} component={ExternalSigningPage} />
      <Route path={"/404"} component={NotFound} />

      {/* All other routes require authentication */}
      <Route>
        <AuthGuard>
          <Switch>
            {/* Admin routes */}
            <Route path={"/admin/dashboard"} component={AffiliateDashboard} />
            <Route path={"/admin/agencies"} component={AdminAgencies} />
            <Route path={"/admin/regional"} component={RegionalManagement} />
            <Route path={"/admin/feedback"} component={FeedbackManagement} />

            {/* Agency routes - New Portal is default */}
            <Route path={"/agency/portal"} component={AgencyPortal} />
            <Route path={"/agency/dashboard"} component={AgencyPortal} />
            <Route path={"/companies"} component={AgencyPortal} />
            <Route path={"/agency/job-descriptions/:companyId"} component={AgencyJobDescriptions} />

            {/* Simplified role-aware pages */}
            <Route path={"/candidates"} component={CandidatePage} />
            <Route path={"/jobs"} component={JobPage} />
            <Route path={"/contracts"} component={ContractPage} />
            <Route path={"/payments"} component={PaymentPage} />
            <Route path={"/calendar"} component={CalendarPage} />
            <Route path={"/settings"} component={SettingsPage} />
            <Route path={"/notifications"} component={NotificationsScreen} />

            {/* Onboarding Routes */}
            <Route path={"/company/onboarding"} component={CompanyOnboarding} />
            <Route path={"/company/pending-contracts"} component={CompanyPendingContracts} />
            <Route path={"/candidate/onboarding"} component={CandidateOnboarding} />

            {/* NEW: Company Funnel Portal - replaces all old company routes */}
            <Route path={"/company/portal"} component={EmpresaPortal} />
            <Route path={"/company/dashboard"} component={EmpresaPortal} />
            <Route path={"/company/jobs"} component={EmpresaPortal} />
            <Route path={"/company/scheduling"} component={EmpresaPortal} />
            <Route path={"/company/selection"} component={EmpresaPortal} />
            <Route path={"/company/employees"} component={EmpresaPortal} />
            <Route path={"/company/employees/:employeeId"} component={EmpresaPortal} />
            <Route path={"/company/payments"} component={EmpresaPortal} />
            <Route path={"/company/settings"} component={CompanySettingsScreen} />
            <Route path={"/empresa"} component={EmpresaPortal} />
            <Route path={"/empresa/vagas"} component={CompanyVagasPage} />
            <Route path={"/empresa/vagas/:jobId"} component={VagasPage} />

            {/* NEW: Candidate Funnel Portal - replaces all old candidate routes */}
            <Route path={"/candidate"} component={CandidatoPortal} />
            <Route path={"/candidate/vagas"} component={CandidatoPortal} />
            <Route path={"/candidate/perfil"} component={CandidateSettingsScreen} />
            <Route path={"/candidate/settings"} component={CandidateSettingsScreen} />
            <Route path={"/candidate/candidaturas"} component={CandidatoPortal} />
            <Route path={"/candidate/contratos"} component={CandidatoPortal} />
            <Route path={"/candidato"} component={CandidatoPortal} />

            <Route component={NotFound} />
          </Switch>
        </AuthGuard>
      </Route>
    </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AgencyProvider>
            <Toaster />
            <Router />
          </AgencyProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
