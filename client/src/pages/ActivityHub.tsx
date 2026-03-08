/**
 * ActivityHub — Consolidated activity page with GHL-style tab navigation.
 * Tabs: Appointments | Call Review | Follow-Ups | Birthdays
 */
import { useLocation } from "wouter";
import { PageTabs } from "@/components/PageTabs";
import DashboardLayout from "@/components/DashboardLayout";
import { EmbeddedProvider } from "@/contexts/EmbeddedContext";
import Appointments from "./Appointments";
import CallReview from "./CallReview";
import SuggestedFollowUps from "./SuggestedFollowUps";
import Birthdays from "./Birthdays";

const TABS = [
  { label: "Appointments", path: "/activity" },
  { label: "Call Review", path: "/activity/call-review" },
  { label: "Follow-Ups", path: "/activity/follow-ups" },
  { label: "Birthdays", path: "/activity/birthdays" },
];

export default function ActivityHub() {
  const [location] = useLocation();

  const activeTab = (() => {
    if (location.startsWith("/activity/call-review") || location === "/call-review") return "call-review";
    if (location.startsWith("/activity/follow-ups") || location === "/follow-ups") return "follow-ups";
    if (location.startsWith("/activity/birthdays") || location === "/birthdays") return "birthdays";
    return "appointments";
  })();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0">
        <PageTabs tabs={TABS} />
        <div className="flex-1 overflow-auto">
          <EmbeddedProvider>
            {activeTab === "appointments" && <Appointments />}
            {activeTab === "call-review" && <CallReview />}
            {activeTab === "follow-ups" && <SuggestedFollowUps />}
            {activeTab === "birthdays" && <Birthdays />}
          </EmbeddedProvider>
        </div>
      </div>
    </DashboardLayout>
  );
}
