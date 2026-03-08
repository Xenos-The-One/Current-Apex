/**
 * ContactsHub — Pipeline page with contact-type horizontal tabs.
 * Tabs: All Leads | Borrowers | RE Agents | Attorneys | Insurance | Title Co. | Builders | Lenders
 */
import { useLocation } from "wouter";
import { PageTabs } from "@/components/PageTabs";
import DashboardLayout from "@/components/DashboardLayout";
import { EmbeddedProvider } from "@/contexts/EmbeddedContext";
import LeadsList from "./LeadsList";

const TABS = [
  { label: "All Leads",        path: "/contacts" },
  { label: "Borrowers",        path: "/contacts/borrowers" },
  { label: "RE Agents",        path: "/contacts/re-agents" },
  { label: "Attorneys",        path: "/contacts/attorneys" },
  { label: "Insurance",        path: "/contacts/insurance" },
  { label: "Title Co.",        path: "/contacts/title" },
  { label: "Builders",         path: "/contacts/builders" },
  { label: "Lenders",          path: "/contacts/lenders" },
];

// Map tab path segment → contactType filter value
const TAB_TYPE_MAP: Record<string, string> = {
  "borrowers":  "borrower",
  "re-agents":  "real_estate_agent",
  "attorneys":  "attorney",
  "insurance":  "insurance_agent",
  "title":      "title_company",
  "builders":   "builder_developer",
  "lenders":    "lender",
};

export default function ContactsHub() {
  const [location] = useLocation();

  // Derive the contactType filter from the URL path segment
  const contactType = (() => {
    const seg = location.split("/contacts/")[1]?.split("?")[0] ?? "";
    return TAB_TYPE_MAP[seg] ?? "all";
  })();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full min-h-0">
        <PageTabs tabs={TABS} />
        <div className="flex-1 overflow-auto">
          <EmbeddedProvider>
            <LeadsList initialContactType={contactType} />
          </EmbeddedProvider>
        </div>
      </div>
    </DashboardLayout>
  );
}
