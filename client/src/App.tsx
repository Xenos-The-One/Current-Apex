import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
import AdminDashboard from "./pages/AdminDashboard";
import AIAssistant from "./pages/AIAssistant";
import AICalling from "./pages/AICalling";
import Analytics from "./pages/Analytics";
import Appointments from "./pages/Appointments";
import Automations from "./pages/Automations";
import Billing from "./pages/Billing";
import Borrowers from "./pages/Borrowers";
import Campaigns from "./pages/Campaigns";
import ContentStudio from "./pages/ContentStudio";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Home from "./pages/Home";
import Pipeline from "./pages/Pipeline";
import ReferralPartners from "./pages/ReferralPartners";

function Router() {
  return (
    <Switch>
      {/* Landing / login */}
      <Route path="/" component={Home} />

      {/* Main CRM dashboard */}
      <Route path="/dashboard" component={Dashboard} />

      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />

      {/* Lead management */}
      <Route path="/pipeline" component={Pipeline} />

      {/* Borrower database */}
      <Route path="/borrowers" component={Borrowers} />

      {/* Contacts / referral partners */}
      <Route path="/contacts" component={ReferralPartners} />

      {/* Campaigns */}
      <Route path="/campaigns" component={Campaigns} />

      {/* Appointments */}
      <Route path="/appointments" component={Appointments} />

      {/* Workflow automations */}
      <Route path="/automations" component={Automations} />

      {/* Analytics */}
      <Route path="/analytics" component={Analytics} />

      {/* AI Calling */}
      <Route path="/calling" component={AICalling} />

      {/* AI Assistant */}
      <Route path="/ai" component={AIAssistant} />

      {/* Content Studio */}
      <Route path="/content" component={ContentStudio} />

      {/* Documents */}
      <Route path="/documents" component={Documents} />

      {/* Billing */}
      <Route path="/billing" component={Billing} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
