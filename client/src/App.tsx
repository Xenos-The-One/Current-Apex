import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import Home from "./pages/Home";
import Info from "./pages/Info";
import GetStarted from "./pages/GetStarted";
import OnboardingSuccess from "./pages/OnboardingSuccess";
import ClientOnboarding from "./pages/ClientOnboarding";
import AdminDashboard from "./pages/AdminDashboard";
import AgencyDetail from "./pages/AgencyDetail";
import ClientDashboard from "./pages/ClientDashboard";
import LeadsList from "./pages/LeadsList";
import LeadDetail from "./pages/LeadDetail";
import NewLead from "./pages/NewLead";
import LeadImport from "./pages/LeadImport";
import SocialMedia from "./pages/SocialMedia";
import NewSocialPost from "./pages/NewSocialPost";
import AIScriptGenerator from "./pages/AIScriptGenerator";
import EmailCampaigns from "./pages/EmailCampaigns";
import SMSCampaigns from "./pages/SmsCampaigns";
import ContentApprovals from "./pages/ContentApprovals";
import MyContent from "./pages/MyContent";
import IndigoLabsLanding from "./pages/IndigoLabsLanding";
import Analytics from "./pages/Analytics";
import Templates from "./pages/Templates";
import WebinarRegistration from "./pages/WebinarRegistration";
import CampaignDashboard from "./pages/CampaignDashboard";
import BookAppointment from "./pages/BookAppointment";
import LeadCapture from "./pages/LeadCapture";
import Appointments from "./pages/Appointments";
import AdminLeads from "./pages/AdminLeads";
import MortgageLanding from "./pages/MortgageLanding";
import PartnerProgram from "./pages/PartnerProgram";
import Birthdays from "./pages/Birthdays";
import WebinarLanding from "./pages/WebinarLanding";
import Notifications from "./pages/Notifications";
import NotificationCenter from "./pages/NotificationCenter";
import EmailTemplates from "./pages/EmailTemplates";
import ClientInbox from "./pages/ClientInbox";
import RefinanceCalculator from "./pages/RefinanceCalculator";
import FirstTimeBuyerGuide from "./pages/FirstTimeBuyerGuide";
import MetricsDashboard from "./pages/MetricsDashboard";
import LoaDashboard from "./pages/LoaDashboard";
import Account from "./pages/Account";
import BorrowerDatabase from "./pages/BorrowerDatabase";
import BorrowerForm from "./pages/BorrowerForm";
import BorrowerDetail from "./pages/BorrowerDetail";
import ReferralPartners from "./pages/ReferralPartners";
import ReferralPartnerDetail from "./pages/ReferralPartnerDetail";
import MarketAnalytics from "./pages/MarketAnalytics";
import BorrowerImport from "./pages/BorrowerImport";
import AgentWebinarMarch26 from "./pages/AgentWebinarMarch26";
import HomebuwerWebinarMarch6 from "./pages/HomebuwerWebinarMarch6";
import CampaignMonitoring from "./pages/CampaignMonitoring";
import CallReview from "./pages/CallReview";
import ConversionDashboard from "./pages/ConversionDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import SeoRouter from "./pages/seo/SeoRouter";
import ContentStudio from "./pages/ContentStudio";
import Conversations from "./pages/Conversations";
import WorkflowAutomations from "./pages/WorkflowAutomations";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import SuggestedFollowUps from "./pages/SuggestedFollowUps";
import PublicBooking from "./pages/PublicBooking";
import PartnerPortal from "./pages/PartnerPortal";
import AdvancedReports from "./pages/AdvancedReports";
import ActivateAccount from "./pages/ActivateAccount";
import Launchpad from "./pages/Launchpad";
// OnboardingSnapshot removed — /onboarding-snapshot now redirects to /admin
import ContactsHub from "./pages/ContactsHub";
import ActivityHub from "./pages/ActivityHub";
import MarketingHub from "./pages/MarketingHub";
import ReportingHub from "./pages/ReportingHub";
import ToolsHub from "./pages/ToolsHub";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/info" component={Info} />
      <Route path="/get-started" component={GetStarted} />
      <Route path="/onboarding/success" component={OnboardingSuccess} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/agencies/:id" component={AgencyDetail} />
      <Route path="/dashboard" component={ClientDashboard} />
      {/* ── Consolidated Hub routes (new GHL-style tab pages) ── */}
      <Route path="/contacts" component={ContactsHub} />
      <Route path="/contacts/borrowers" component={ContactsHub} />
      <Route path="/contacts/re-agents" component={ContactsHub} />
      <Route path="/contacts/attorneys" component={ContactsHub} />
      <Route path="/contacts/insurance" component={ContactsHub} />
      <Route path="/contacts/title" component={ContactsHub} />
      <Route path="/contacts/builders" component={ContactsHub} />
      <Route path="/contacts/lenders" component={ContactsHub} />
      <Route path="/contacts/referral-partners" component={ContactsHub} />
      <Route path="/activity" component={ActivityHub} />
      <Route path="/activity/call-review" component={ActivityHub} />
      <Route path="/activity/follow-ups" component={ActivityHub} />
      <Route path="/activity/birthdays" component={ActivityHub} />
      <Route path="/marketing" component={MarketingHub} />
      <Route path="/marketing/sms" component={MarketingHub} />
      <Route path="/marketing/ai-scripts" component={MarketingHub} />
      <Route path="/marketing/templates" component={MarketingHub} />
      {/* ── Standalone sidebar pages ── */}
      <Route path="/social" component={SocialMedia} />
      <Route path="/social/new" component={NewSocialPost} />
      <Route path="/automations" component={WorkflowAutomations} />
      <Route path="/automations/:id/builder" component={WorkflowBuilder} />
      <Route path="/reporting" component={ReportingHub} />
      <Route path="/reporting/metrics" component={ReportingHub} />
      <Route path="/reporting/market" component={ReportingHub} />
      <Route path="/reporting/funnel" component={ReportingHub} />
      <Route path="/reporting/advanced" component={ReportingHub} />
      <Route path="/tools" component={ToolsHub} />
      <Route path="/tools/inbox" component={ToolsHub} />
      <Route path="/tools/email-templates" component={ToolsHub} />
      <Route path="/tools/notifications" component={ToolsHub} />
      <Route path="/tools/notification-center" component={ToolsHub} />
      {/* ── Legacy routes kept for backward compatibility ── */}
      <Route path="/leads" component={ContactsHub} />
      <Route path="/leads/new" component={NewLead} />
      <Route path="/leads/import" component={LeadImport} />
      <Route path="/leads/:id" component={LeadDetail} />

      <Route path="/ai-scripts" component={MarketingHub} />
      <Route path="/email-campaigns" component={MarketingHub} />
      <Route path="/sms-campaigns" component={MarketingHub} />
      <Route path="/content-approvals" component={ContentApprovals} />
      <Route path="/my-content" component={MyContent} />
      <Route path="/indigo-labs" component={IndigoLabsLanding} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/templates" component={Templates} />
      <Route path="/webinar/dpa" component={WebinarRegistration} />
      <Route path="/webinar/agents-march-26" component={AgentWebinarMarch26} />
      <Route path="/webinar/homebuyers-march-6" component={HomebuwerWebinarMarch6} />
      <Route path="/webinar" component={WebinarLanding} />
      <Route path="/refinance" component={RefinanceCalculator} />
      <Route path="/first-time-buyer" component={FirstTimeBuyerGuide} />
      <Route path="/campaigns/dashboard" component={CampaignDashboard} />
      <Route path="/campaigns" component={CampaignMonitoring} />
      {/* ── Legacy activity routes → ActivityHub ── */}
      <Route path="/call-review" component={ActivityHub} />
      <Route path="/appointments" component={ActivityHub} />
      <Route path="/birthdays" component={ActivityHub} />
      <Route path="/follow-ups" component={ActivityHub} />
      {/* ── Legacy reporting routes → ReportingHub ── */}
      <Route path="/conversion" component={ReportingHub} />
      <Route path="/metrics" component={ReportingHub} />
      <Route path="/market-analytics" component={ReportingHub} />
      <Route path="/reports" component={ReportingHub} />
      {/* ── Legacy tools routes → ToolsHub ── */}
      <Route path="/notifications" component={ToolsHub} />
      <Route path="/notification-center" component={ToolsHub} />
      <Route path="/email-templates" component={ToolsHub} />
      <Route path="/client-inbox" component={ToolsHub} />
      <Route path="/content-studio" component={ToolsHub} />
      <Route path="/workflows" component={WorkflowAutomations} />
      {/* ── Legacy contacts routes → ContactsHub ── */}
      <Route path="/borrowers" component={ContactsHub} />
      <Route path="/referral-partners" component={ContactsHub} />
      {/* ── Detail routes (keep as standalone) ── */}
      <Route path="/borrowers/import" component={BorrowerImport} />
      <Route path="/borrowers/new" component={BorrowerForm} />
      <Route path="/borrowers/:id/edit" component={BorrowerForm} />
      <Route path="/borrowers/:id" component={BorrowerDetail} />
      <Route path="/referral-partners/:id" component={ReferralPartnerDetail} />
      <Route path="/book" component={BookAppointment} />
      <Route path="/lead" component={LeadCapture} />
      <Route path="/mortgage" component={MortgageLanding} />
      <Route path="/partner" component={PartnerProgram} />
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/loa" component={LoaDashboard} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsConditions} />
      <Route path="/conversations" component={Conversations} />
      <Route path="/workflows/:id/builder" component={WorkflowBuilder} />
      <Route path="/activate-account" component={ActivateAccount} />
      <Route path="/launchpad" component={Launchpad} />
      <Route path="/client-onboarding" component={ClientOnboarding} />
      <Route path="/account-setup" component={ClientOnboarding} />
      <Route path="/onboarding-snapshot" component={() => { if (typeof window !== 'undefined') window.location.replace('/admin'); return null; }} />
      <Route path="/book/:slug" component={PublicBooking} />
      <Route path="/partner-portal" component={PartnerPortal} />
      <Route path="/seo/:rest*" component={SeoRouter} />
      <Route path="/seo" component={SeoRouter} />
      <Route path="/account" component={Account} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <ImpersonationProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ImpersonationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
