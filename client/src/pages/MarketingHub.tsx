/**
 * MarketingHub — Consolidated marketing page with GHL-style tab navigation.
 * Tabs: Email | SMS | AI Scripts | Templates
 * (Social Media and Automations are now standalone sidebar items)
 */
import { useLocation } from "wouter";
import { PageTabs } from "@/components/PageTabs";
import DashboardLayout from "@/components/DashboardLayout";
import { EmbeddedProvider } from "@/contexts/EmbeddedContext";
import EmailCampaigns from "./EmailCampaigns";
import SMSCampaigns from "./SmsCampaigns";
import AIScriptGenerator from "./AIScriptGenerator";
import Templates from "./Templates";

const TABS = [
  { label: "Email",       path: "/marketing" },
  { label: "SMS",         path: "/marketing/sms" },
  { label: "AI Scripts",  path: "/marketing/ai-scripts" },
  { label: "Templates",   path: "/marketing/templates" },
];

export default function MarketingHub() {
  const [location] = useLocation();

  const activeTab = (() => {
    if (location.startsWith("/marketing/sms") || location === "/sms-campaigns") return "sms";
    if (location.startsWith("/marketing/ai-scripts") || location === "/ai-scripts") return "ai-scripts";
    if (location.startsWith("/marketing/templates") || location === "/templates") return "templates";
    return "email";
  })();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0">
        <PageTabs tabs={TABS} />
        <div className="flex-1 overflow-auto">
          <EmbeddedProvider>
            {activeTab === "email" && <EmailCampaigns />}
            {activeTab === "sms" && <SMSCampaigns />}
            {activeTab === "ai-scripts" && <AIScriptGenerator />}
            {activeTab === "templates" && <Templates />}
          </EmbeddedProvider>
        </div>
      </div>
    </DashboardLayout>
  );
}
