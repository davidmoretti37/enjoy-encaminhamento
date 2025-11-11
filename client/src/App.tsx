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
import ApplicationManagement from "./pages/ApplicationManagement";
import ContractManagement from "./pages/ContractManagement";
import PaymentManagement from "./pages/PaymentManagement";
import FeedbackManagement from "./pages/FeedbackManagement";
import AIMatchingManagement from "./pages/AIMatchingManagement";
import SchoolRegistration from "./pages/SchoolRegistration";
import Login from "./pages/Login";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register/school/:token"} component={SchoolRegistration} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/schools"} component={SchoolManagement} />
      <Route path={"/admin/candidates"} component={CandidateManagement} />
      <Route path={"/admin/companies"} component={CompanyManagement} />
      <Route path={"/admin/jobs"} component={JobManagement} />
      <Route path={"/admin/applications"} component={ApplicationManagement} />
      <Route path={"/admin/contracts"} component={ContractManagement} />
      <Route path={"/admin/payments"} component={PaymentManagement} />
      <Route path={"/admin/feedback"} component={FeedbackManagement} />
      <Route path={"/admin/ai-matching"} component={AIMatchingManagement} />
      <Route path={"/company/dashboard"} component={CompanyDashboard} />
      <Route path={"/dashboard"} component={AdminDashboard} />
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
