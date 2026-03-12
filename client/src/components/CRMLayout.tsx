import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Folder,
  Globe,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Phone,
  Search,
  Settings,
  Share2,
  Sparkles,
  UserX,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PWAInstallBanner, PushNotificationPrompt, IOSInstallBanner } from "./PWABanner";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
}

// ─── Admin Navigation (matches skill spec exactly) ─────────────────────────
function getAdminNav(): NavItem[] {
  return [
    { label: "Launchpad", href: "/dashboard", icon: Home },
    { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard, adminOnly: true },
    { label: "Client Dashboard", href: "/client-dashboard", icon: Users },
    { label: "Contacts", href: "/contacts", icon: Users },
    { label: "Activity", href: "/activity", icon: Zap },
    { label: "Marketing", href: "/marketing", icon: Mail },
    { label: "Social Media", href: "/social-media", icon: Share2 },
    { label: "Automations", href: "/automations", icon: Workflow },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "AI SEO Portal", href: "/seo", icon: Globe },
    { label: "Tools", href: "/tools", icon: Folder },
  ];
}

// ─── Client Navigation (LoanOS product plan — 13 items) ───────────────────
function getClientNav(): NavItem[] {
  return [
    { label: "Dashboard", href: "/client-dashboard", icon: Home },
    { label: "Contacts", href: "/contacts", icon: Users },
    { label: "Conversations", href: "/conversations", icon: MessageSquare },
    { label: "Calendar", href: "/appointments", icon: Calendar },
    { label: "Follow-Up Actions", href: "/follow-up-actions", icon: UserX },
    { label: "AI Success Coach", href: "/ai-coach", icon: Sparkles },
    { label: "Ads Performance", href: "/ads-performance", icon: Megaphone },
    { label: "Website", href: "/website", icon: Globe },
    { label: "SEO Insights", href: "/seo-insights", icon: Search },
    { label: "Content Approvals", href: "/content-approvals", icon: FileText },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];
}

interface SidebarItemProps {
  item: NavItem;
}

function SidebarItem({ item }: SidebarItemProps) {
  const [location] = useLocation();
  const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));

  return (
    <Link href={item.href}>
      <div className={`sidebar-nav-item ${isActive ? "active" : ""}`}>
        <item.icon className="icon" />
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <Badge variant="secondary" className="text-xs h-5 min-w-5 flex items-center justify-center bg-blue-500 text-white border-0">
            {item.badge}
          </Badge>
        ) : null}
      </div>
    </Link>
  );
}

interface CRMLayoutProps {
  children: React.ReactNode;
  agencyId?: number;
}

export default function CRMLayout({ children, agencyId }: CRMLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifData } = trpc.notifications.unreadCount.useQuery(
    { agencyId: agencyId ?? 1 },
    { enabled: !!user }
  );
  const unreadCount = notifData?.count ?? 0;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(getLoginUrl());
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const role = (user as any)?.role ?? "user";
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const navItems = isAdmin ? getAdminNav() : getClientNav();

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        w-[240px] flex-shrink-0 flex flex-col
        bg-sidebar text-sidebar-foreground
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/10 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate font-display">MortgageCRM</p>
            <p className="text-xs text-white/50 truncate capitalize">{role.replace("_", " ")} Portal</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(item => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </nav>

        {/* User profile */}
        <div className="border-t border-white/10 p-3 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-white/50 truncate capitalize">{role.replace("_", " ")}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 flex-shrink-0 bg-background">
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-muted"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <div className="w-5 h-0.5 bg-foreground mb-1" />
            <div className="w-5 h-0.5 bg-foreground mb-1" />
            <div className="w-5 h-0.5 bg-foreground" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 h-8">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search leads, borrowers..."
            />
          </div>

          <div className="flex-1" />

          {/* Notification bell */}
          <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0" onClick={() => navigate("/notifications")}>
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </header>

        {/* PWA Banners — install prompt + push notification opt-in */}
        <PWAInstallBanner />
        <IOSInstallBanner />
        <PushNotificationPrompt />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
