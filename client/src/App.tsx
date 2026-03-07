import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AgencyProvider } from "./contexts/AgencyContext";

// ─── Landing ───────────────────────────────────────────────────────────────
import Home from "./pages/Home";

// ─── Dashboards ────────────────────────────────────────────────────────────
import Dashboard from "./pages/Dashboard";
import ClientDashboard from "./pages/ClientDashboard";
import AdminDashboard from "./pages/AdminDashboard";

// ─── Hub pages (GHL-style consolidated tabs) ───────────────────────────────
import ContactsHub from "./pages/ContactsHub";
import ActivityHub from "./pages/ActivityHub";
import MarketingHub from "./pages/MarketingHub";
import ReportsHub from "./pages/ReportsHub";
import ToolsHub from "./pages/ToolsHub";

// ─── Standalone pages ──────────────────────────────────────────────────────
import SocialMedia from "./pages/SocialMedia";
import Automations from "./pages/Automations";
import AICalling from "./pages/AICalling";
import AIAssistant from "./pages/AIAssistant";
import Documents from "./pages/Documents";
import Billing from "./pages/Billing";

// ─── Legacy pages (still accessible) ──────────────────────────────────────
import Pipeline from "./pages/Pipeline";
import Borrowers from "./pages/Borrowers";
import ReferralPartners from "./pages/ReferralPartners";
import Campaigns from "./pages/Campaigns";
import Appointments from "./pages/Appointments";
import Analytics from "./pages/Analytics";
import ContentStudio from "./pages/ContentStudio";
import Settings from "./pages/Settings";

function Router() {
  return (
    <Switch>
      {/* Landing / login */}
      <Route path="/" component={Home} />

      {/* ── Dashboards ── */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/client-dashboard" component={ClientDashboard} />
      <Route path="/admin" component={AdminDashboard} />

      {/* ── Hub pages (GHL-style with in-page tabs) ── */}
      {/* /contacts → Pipeline | Borrowers | Referral Partners tabs */}
      <Route path="/contacts" component={ContactsHub} />
      {/* /activity → Appointments | Call Review | Follow-Ups | Birthdays tabs */}
      <Route path="/activity" component={ActivityHub} />
      {/* /marketing → Email | SMS | AI Scripts | Templates tabs */}
      <Route path="/marketing" component={MarketingHub} />
      {/* /reports → Analytics | Metrics | Market | Funnel | Advanced tabs */}
      <Route path="/reports" component={ReportsHub} />
      {/* /tools → Content Studio | Inbox | Email Templates | Notifications tabs */}
      <Route path="/tools" component={ToolsHub} />

      {/* ── Standalone pages ── */}
      <Route path="/social-media" component={SocialMedia} />
      <Route path="/automations" component={Automations} />
      <Route path="/ai-calling" component={AICalling} />
      <Route path="/ai-assistant" component={AIAssistant} />
      <Route path="/documents" component={Documents} />
      <Route path="/billing" component={Billing} />

      {/* ── Legacy direct routes (backward compat) ── */}
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/borrowers" component={Borrowers} />
      <Route path="/referral-partners" component={ReferralPartners} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/content" component={ContentStudio} />

      {/* Settings */}
      <Route path="/settings" component={Settings} />

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
