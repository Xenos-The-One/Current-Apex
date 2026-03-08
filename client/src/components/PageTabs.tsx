/**
 * PageTabs — GHL-style horizontal tab bar at the top of a page.
 * Used to consolidate related pages into a single sidebar entry.
 *
 * Usage:
 *   <PageTabs tabs={[
 *     { label: "Email", path: "/marketing/email" },
 *     { label: "SMS", path: "/marketing/sms" },
 *   ]} />
 */
import { useLocation } from "wouter";

export type PageTab = {
  label: string;
  path: string;
  /** Optional badge count shown next to the label */
  badge?: number;
};

interface PageTabsProps {
  tabs: PageTab[];
  className?: string;
}

export function PageTabs({ tabs, className = "" }: PageTabsProps) {
  const [location, setLocation] = useLocation();

  return (
    <div
      className={`flex items-center gap-0 border-b border-border bg-background ${className}`}
    >
      {tabs.map((tab, idx) => {
        // Check if any more-specific tab is active before matching this one
        const moreSpecificActive = tabs.some(
          (other, otherIdx) =>
            otherIdx !== idx &&
            other.path.length > tab.path.length &&
            other.path.startsWith(tab.path) &&
            (location === other.path ||
              location.startsWith(other.path + "/") ||
              location.startsWith(other.path + "?"))
        );
        const isActive =
          !moreSpecificActive &&
          (location === tab.path ||
            location.startsWith(tab.path + "/") ||
            location.startsWith(tab.path + "?"));

        return (
          <button
            key={tab.path}
            onClick={() => setLocation(tab.path)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium transition-colors whitespace-nowrap
              ${
                isActive
                  ? "text-primary border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px"
              }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
