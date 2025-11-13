import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ChatProvider } from "./contexts/ChatContext";
import { FloatingChatButton } from "./components/FloatingChatButton";
import { ChatPanel } from "./components/ChatPanel";
import Home from "./pages/Home";
import CompanyDashboard from "./pages/CompanyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SchoolManagement from "./pages/SchoolManagement";
import CandidateManagement from "./pages/CandidateManagement";
import CompanyManagement from "./pages/CompanyManagement";
import JobManagement from "./pages/JobManagement";
import ContractManagement from "./pages/ContractManagement";
import PaymentManagement from "./pages/PaymentManagement";
import FeedbackManagement from "./pages/FeedbackManagement";
import AIMatchingManagement from "./pages/AIMatchingManagement";
import AffiliateManagement from "./pages/AffiliateManagement";
import RegionalManagement from "./pages/RegionalManagement";
import CreateAffiliateInvitation from "./pages/CreateAffiliateInvitation";
import AffiliateAcceptInvitation from "./pages/AffiliateAcceptInvitation";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AffiliateSchools from "./pages/AffiliateSchools";
import AffiliateCandidates from "./pages/AffiliateCandidates";
import AffiliateCompanies from "./pages/AffiliateCompanies";
import AffiliateJobs from "./pages/AffiliateJobs";
import AffiliateContracts from "./pages/AffiliateContracts";
import AffiliatePayments from "./pages/AffiliatePayments";
import SchoolRegistration from "./pages/SchoolRegistration";
import SchoolDashboard from "./pages/SchoolDashboard";
import SchoolCandidates from "./pages/SchoolCandidates";
import SchoolCompanies from "./pages/SchoolCompanies";
import Login from "./pages/Login";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register/school/:token"} component={SchoolRegistration} />
      <Route path={"/affiliate/accept/:token"} component={AffiliateAcceptInvitation} />
      <Route path={"/affiliate/dashboard"} component={AffiliateDashboard} />
      <Route path={"/affiliate/schools"} component={AffiliateSchools} />
      <Route path={"/affiliate/companies"} component={AffiliateCompanies} />
      <Route path={"/affiliate/candidates"} component={AffiliateCandidates} />
      <Route path={"/affiliate/jobs"} component={AffiliateJobs} />
      <Route path={"/affiliate/applications"}>
        {() => {
          window.location.href = "/affiliate/candidates";
          return null;
        }}
      </Route>
      <Route path={"/affiliate/contracts"} component={AffiliateContracts} />
      <Route path={"/affiliate/payments"} component={AffiliatePayments} />
      <Route path={"/school/dashboard"} component={SchoolDashboard} />
      <Route path={"/school/candidates"} component={SchoolCandidates} />
      <Route path={"/school/companies"} component={SchoolCompanies} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/regional"} component={RegionalManagement} />
      <Route path={"/admin/create-affiliate"} component={CreateAffiliateInvitation} />
      <Route path={"/admin/affiliates"}>
        {() => {
          window.location.href = "/admin/regional";
          return null;
        }}
      </Route>
      <Route path={"/admin/schools"}>
        {() => {
          window.location.href = "/admin/regional";
          return null;
        }}
      </Route>
      <Route path={"/admin/candidates"} component={CandidateManagement} />
      <Route path={"/admin/companies"} component={CompanyManagement} />
      <Route path={"/admin/jobs"} component={JobManagement} />
      <Route path={"/admin/applications"}>
        {() => {
          window.location.href = "/admin/candidates";
          return null;
        }}
      </Route>
      <Route path={"/admin/contracts"} component={ContractManagement} />
      <Route path={"/admin/payments"} component={PaymentManagement} />
      <Route path={"/admin/feedback"} component={FeedbackManagement} />
      <Route path={"/admin/ai-matching"} component={AIMatchingManagement} />
      <Route path={"/company/dashboard"} component={CompanyDashboard} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <ChatProvider>
          <TooltipProvider>
            <Toaster />
            <div className="flex h-screen overflow-hidden">
              <div className="flex-1 overflow-auto">
                <Router />
              </div>
              <ChatPanel />
            </div>
            <FloatingChatButton />
          </TooltipProvider>
        </ChatProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
