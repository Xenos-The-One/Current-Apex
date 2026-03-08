import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import SeoLayout from "./SeoLayout";

// Lazy load all SEO pages
const Dashboard = lazy(() => import("./Dashboard"));
const Clients = lazy(() => import("./Clients"));
const ClientDetail = lazy(() => import("./ClientDetail"));
const Content = lazy(() => import("./Content"));
const ContentDetail = lazy(() => import("./ContentDetail"));
const BulkGeneration = lazy(() => import("./BulkGeneration"));
const Scheduling = lazy(() => import("./Scheduling"));
const Templates = lazy(() => import("./Templates"));
const Collaboration = lazy(() => import("./Collaboration"));
const VersionHistory = lazy(() => import("./VersionHistory"));
const QualityScore = lazy(() => import("./QualityScore"));
const SeoAudit = lazy(() => import("./SeoAudit"));
const Analytics = lazy(() => import("./Analytics"));
const Repurposing = lazy(() => import("./Repurposing"));
const Publishing = lazy(() => import("./Publishing"));
const Briefs = lazy(() => import("./Briefs"));
const ClientPortal = lazy(() => import("./ClientPortal"));
const ClientPortalWhitelabel = lazy(() => import("./ClientPortalWhitelabel"));
const Reports = lazy(() => import("./Reports"));
const Settings = lazy(() => import("./Settings"));
const ClientOnboarding = lazy(() => import("./ClientOnboarding"));
const RecurringPlans = lazy(() => import("./RecurringPlans"));
const ABTesting = lazy(() => import("./ABTesting"));
const Calendar = lazy(() => import("./Calendar"));
const KeywordResearch = lazy(() => import("./KeywordResearch"));
const Approvals = lazy(() => import("./Approvals"));
const Performance = lazy(() => import("./Performance"));
const DesignStandards = lazy(() => import("./DesignStandards"));
const PublishingAnalytics = lazy(() => import("./PublishingAnalytics"));
const PublishingScheduler = lazy(() => import("./PublishingScheduler"));
const AISuggestedClients = lazy(() => import("./AISuggestedClients"));
const GoogleBusinessProfile = lazy(() => import("./GoogleBusinessProfile"));
const AdsManager = lazy(() => import("./AdsManager"));
const KeywordGap = lazy(() => import("./KeywordGap"));
const BriefForm = lazy(() => import("./BriefForm"));

// Portal pages
const PortalLogin = lazy(() => import("./portal/PortalLogin"));
const PortalDashboard = lazy(() => import("./portal/PortalDashboard"));
const PortalContent = lazy(() => import("./portal/PortalContent"));
const PortalContentDetail = lazy(() => import("./portal/PortalContentDetail"));
const PortalCalendar = lazy(() => import("./portal/PortalCalendar"));
const PortalPerformance = lazy(() => import("./portal/PortalPerformance"));
const PortalPublishing = lazy(() => import("./portal/PortalPublishing"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export default function SeoRouter() {
  return (
    <SeoLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path="/seo" component={Dashboard} />
          <Route path="/seo/clients" component={Clients} />
          <Route path="/seo/clients/:id" component={ClientDetail} />
          <Route path="/seo/content" component={Content} />
          <Route path="/seo/content/:id" component={ContentDetail} />
          <Route path="/seo/bulk" component={BulkGeneration} />
          <Route path="/seo/scheduling" component={Scheduling} />
          <Route path="/seo/templates" component={Templates} />
          <Route path="/seo/collaboration" component={Collaboration} />
          <Route path="/seo/version-history" component={VersionHistory} />
          <Route path="/seo/quality-score" component={QualityScore} />
          <Route path="/seo/seo-audit" component={SeoAudit} />
          <Route path="/seo/analytics" component={Analytics} />
          <Route path="/seo/repurposing" component={Repurposing} />
          <Route path="/seo/publishing" component={Publishing} />
          <Route path="/seo/briefs" component={Briefs} />
          <Route path="/seo/client-portal" component={ClientPortal} />
          <Route path="/seo/client-view" component={ClientPortalWhitelabel} />
          <Route path="/seo/reports" component={Reports} />
          <Route path="/seo/settings" component={Settings} />
          <Route path="/seo/onboarding" component={ClientOnboarding} />
          <Route path="/seo/recurring-plans" component={RecurringPlans} />
          <Route path="/seo/ab-testing" component={ABTesting} />
          <Route path="/seo/calendar" component={Calendar} />
          <Route path="/seo/keyword-research" component={KeywordResearch} />
          <Route path="/seo/approvals" component={Approvals} />
          <Route path="/seo/performance" component={Performance} />
          <Route path="/seo/design-standards" component={DesignStandards} />
          <Route path="/seo/publishing-analytics" component={PublishingAnalytics} />
          <Route path="/seo/publishing-scheduler" component={PublishingScheduler} />
          <Route path="/seo/ai-client-discovery" component={AISuggestedClients} />
          <Route path="/seo/google-business-profile" component={GoogleBusinessProfile} />
          <Route path="/seo/ads" component={AdsManager} />
          <Route path="/seo/keyword-gap" component={KeywordGap} />
          <Route path="/seo/brief/:token" component={BriefForm} />
          {/* Portal routes */}
          <Route path="/seo/portal/login" component={PortalLogin} />
          <Route path="/seo/portal/dashboard" component={PortalDashboard} />
          <Route path="/seo/portal/content/:id" component={PortalContentDetail} />
          <Route path="/seo/portal/content" component={PortalContent} />
          <Route path="/seo/portal/calendar" component={PortalCalendar} />
          <Route path="/seo/portal/performance" component={PortalPerformance} />
          <Route path="/seo/portal/publishing" component={PortalPublishing} />
        </Switch>
      </Suspense>
    </SeoLayout>
  );
}
