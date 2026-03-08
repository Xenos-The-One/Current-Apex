/**
 * ReportingHub — Consolidated reports page with GHL-style tab navigation.
 * Tabs: Analytics | Metrics | Market Analytics | Conversion Funnel | Advanced Reports
 */
import { useLocation } from "wouter";
import { PageTabs } from "@/components/PageTabs";
import DashboardLayout from "@/components/DashboardLayout";
import { EmbeddedProvider } from "@/contexts/EmbeddedContext";
import Analytics from "./Analytics";
import MetricsDashboard from "./MetricsDashboard";
import MarketAnalytics from "./MarketAnalytics";
import ConversionDashboard from "./ConversionDashboard";
import AdvancedReports from "./AdvancedReports";

const TABS = [
  { label: "Analytics", path: "/reporting" },
  { label: "Metrics", path: "/reporting/metrics" },
  { label: "Market Analytics", path: "/reporting/market" },
  { label: "Conversion Funnel", path: "/reporting/funnel" },
  { label: "Advanced Reports", path: "/reporting/advanced" },
];

export default function ReportingHub() {
  const [location] = useLocation();

  const activeTab = (() => {
    if (location.startsWith("/reporting/metrics") || location === "/metrics") return "metrics";
    if (location.startsWith("/reporting/market") || location === "/market-analytics") return "market";
    if (location.startsWith("/reporting/funnel") || location === "/conversion") return "funnel";
    if (location.startsWith("/reporting/advanced") || location === "/reports") return "advanced";
    return "analytics";
  })();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0">
        <PageTabs tabs={TABS} />
        <div className="flex-1 overflow-auto">
          <EmbeddedProvider>
            {activeTab === "analytics" && <Analytics />}
            {activeTab === "metrics" && <MetricsDashboard />}
            {activeTab === "market" && <MarketAnalytics />}
            {activeTab === "funnel" && <ConversionDashboard />}
            {activeTab === "advanced" && <AdvancedReports />}
          </EmbeddedProvider>
        </div>
      </div>
    </DashboardLayout>
  );
}
