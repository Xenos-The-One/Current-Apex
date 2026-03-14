import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: GitBranch, label: "Pipeline", path: "/pipeline" },
  { icon: Users, label: "Contacts", path: "/contacts" },
  { icon: MessageSquare, label: "Chats", path: "/conversations" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
];

const CLIENT_NAV = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: GitBranch, label: "Pipeline", path: "/pipeline" },
  { icon: MessageSquare, label: "Inbox", path: "/inbox" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
];

function isClientRole(role?: string) {
  return role === "client_user" || role === "loa";
}

/**
 * MobileBottomNav — shown only in standalone (installed PWA) mode on small screens.
 * Provides thumb-friendly navigation for the 5 most-used sections.
 * Visibility is controlled via CSS: `display: none` in browser mode,
 * `display: flex` in `(display-mode: standalone)`.
 */
export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unread = unreadData?.count ?? 0;

  const isClient = isClientRole(user?.role);
  const navItems = isClient ? CLIENT_NAV : ADMIN_NAV;

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile navigation"
    >
      {navItems.map(({ icon: Icon, label, path }) => {
        const isActive = location === path || (path !== "/admin" && location.startsWith(path));
        return (
          <button
            key={path}
            onClick={() => setLocation(path)}
            className={`mobile-bottom-nav-item ${isActive ? "active" : ""}`}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {label === "Chats" && unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 min-w-3.5 flex items-center justify-center px-0.5 leading-none">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
            <span className="mobile-bottom-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
