/**
 * ToolsHub — Consolidated tools page with GHL-style tab navigation.
 * Tabs: Content Studio | Client Inbox | Email Templates | Notifications | Notif. Center
 */
import { useLocation } from "wouter";
import { PageTabs } from "@/components/PageTabs";
import DashboardLayout from "@/components/DashboardLayout";
import { EmbeddedProvider } from "@/contexts/EmbeddedContext";
import ContentStudio from "./ContentStudio";
import ClientInbox from "./ClientInbox";
import EmailTemplates from "./EmailTemplates";
import Notifications from "./Notifications";
import NotificationCenter from "./NotificationCenter";

const TABS = [
  { label: "Content Studio", path: "/tools" },
  { label: "Client Inbox", path: "/tools/inbox" },
  { label: "Email Templates", path: "/tools/email-templates" },
  { label: "Notifications", path: "/tools/notifications" },
  { label: "Notif. Center", path: "/tools/notification-center" },
];

export default function ToolsHub() {
  const [location] = useLocation();

  const activeTab = (() => {
    if (location.startsWith("/tools/inbox") || location === "/client-inbox") return "inbox";
    if (location.startsWith("/tools/email-templates") || location === "/email-templates") return "email-templates";
    if (location.startsWith("/tools/notification-center") || location === "/notification-center") return "notification-center";
    if (location.startsWith("/tools/notifications") || location === "/notifications") return "notifications";
    return "content-studio";
  })();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0">
        <PageTabs tabs={TABS} />
        <div className="flex-1 overflow-auto">
          <EmbeddedProvider>
            {activeTab === "content-studio" && <ContentStudio />}
            {activeTab === "inbox" && <ClientInbox />}
            {activeTab === "email-templates" && <EmailTemplates />}
            {activeTab === "notifications" && <Notifications />}
            {activeTab === "notification-center" && <NotificationCenter />}
          </EmbeddedProvider>
        </div>
      </div>
    </DashboardLayout>
  );
}
