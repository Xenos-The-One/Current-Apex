import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Users, FileText, Zap, Clock, BookOpen,
  Repeat2, Star, Shield, Search, TrendingUp, BarChart3,
  Target, Upload, CalendarDays, Megaphone, Bot, FlaskConical,
  Sparkles, Globe, Building2, Settings, ChevronLeft, ChevronRight,
  ArrowLeft, LogOut, PanelLeft,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/seo" },
      { icon: CalendarDays, label: "Calendar", path: "/seo/calendar" },
    ],
  },
  {
    label: "Clients",
    items: [
      { icon: Users, label: "All Clients", path: "/seo/clients" },
      { icon: Globe, label: "Client Portal", path: "/seo/client-portal" },
      { icon: Repeat2, label: "Recurring Plans", path: "/seo/recurring-plans" },
    ],
  },
  {
    label: "Content",
    items: [
      { icon: FileText, label: "All Content", path: "/seo/content" },
      { icon: Zap, label: "Bulk Generation", path: "/seo/bulk" },
      { icon: Clock, label: "Scheduling", path: "/seo/scheduling" },
      { icon: BookOpen, label: "Briefs", path: "/seo/briefs" },
      { icon: Repeat2, label: "Repurposing", path: "/seo/repurposing" },
      { icon: Star, label: "Quality Score", path: "/seo/quality-score" },
      { icon: Shield, label: "Approvals", path: "/seo/approvals" },
    ],
  },
  {
    label: "SEO & Research",
    items: [
      { icon: Search, label: "Keyword Research", path: "/seo/keyword-research" },
      { icon: TrendingUp, label: "SEO Audit", path: "/seo/seo-audit" },
      { icon: BarChart3, label: "Performance", path: "/seo/performance" },
      { icon: Target, label: "Keyword Gap", path: "/seo/keyword-gap" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { icon: BarChart3, label: "Analytics", path: "/seo/analytics" },
      { icon: Megaphone, label: "Reports", path: "/seo/reports" },
    ],
  },
  {
    label: "Publishing",
    items: [
      { icon: Upload, label: "Publishing", path: "/seo/publishing" },
      { icon: CalendarDays, label: "Scheduler", path: "/seo/publishing-scheduler" },
      { icon: BarChart3, label: "Pub. Analytics", path: "/seo/publishing-analytics" },
      { icon: Megaphone, label: "Ads Manager", path: "/seo/ads" },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { icon: Bot, label: "Templates", path: "/seo/templates" },
      { icon: FlaskConical, label: "A/B Testing", path: "/seo/ab-testing" },
      { icon: Sparkles, label: "Collaboration", path: "/seo/collaboration" },
      { icon: FileText, label: "Version History", path: "/seo/version-history" },
      { icon: Globe, label: "Design Standards", path: "/seo/design-standards" },
      { icon: Users, label: "AI Client Discovery", path: "/seo/ai-client-discovery" },
      { icon: Building2, label: "Google Business", path: "/seo/google-business-profile" },
    ],
  },
  {
    label: "Settings",
    items: [
      { icon: Settings, label: "Settings", path: "/seo/settings" },
    ],
  },
];

export default function SeoLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "agency_owner";

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full">
          <h1 className="text-2xl font-semibold tracking-tight text-center">Sign in to continue</h1>
          <Button
            onClick={() => { window.location.href = getLoginUrl(window.location.pathname); }}
            size="lg"
            className="w-full"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-semibold tracking-tight">Access Restricted</h1>
          <p className="text-muted-foreground">The SEO Portal is only available to agency administrators. Your content approvals are available in your dashboard.</p>
          <Button variant="outline" onClick={() => window.location.href = "/content-approvals"}>
            View Content Approvals
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* SEO Sidebar — full height, standalone */}
      <div
        className={cn(
          "border-r border-border/60 bg-sidebar flex flex-col transition-all duration-200 shrink-0",
          collapsed ? "w-14" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-border/60 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346016577/LMov9oD5hWD87TsDa4kZ8o/GradientLogoBlue2Green_5403585a.png"
                alt="Sterling Marketing"
                className="h-7 w-7 object-contain shrink-0"
              />
              <span className="text-base font-bold truncate">AI SEO Portal</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Back to CRM button */}
        <div className={cn("border-b border-border/40 shrink-0", collapsed ? "p-1.5" : "px-3 py-2")}>
          <Link href="/admin">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2 text-muted-foreground hover:text-foreground w-full",
                collapsed ? "justify-center px-0" : "justify-start"
              )}
              title={collapsed ? "Back to CRM" : undefined}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">Back to CRM</span>}
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="px-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      item.path === "/seo"
                        ? location === "/seo"
                        : location.startsWith(item.path) && item.path !== "/seo";
                    return (
                      <Link key={item.path} href={item.path}>
                        <button
                          className={cn(
                            "w-full flex items-center gap-2.5 rounded-md transition-colors",
                            collapsed ? "justify-center p-2" : "px-2.5 py-2",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                          {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                        </button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer — user profile */}
        <div className="border-t border-border/60 p-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8 border shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none">{user?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || "-"}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setLocation("/account")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
