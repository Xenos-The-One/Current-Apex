import { useAuth } from "@/_core/hooks/useAuth";
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
  CreditCard,
  FileText,
  Folder,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  Settings,
  Share2,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { useState } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}

function getAdminNav(): NavItem[] {
  return [
    { label: "Launchpad", href: "/dashboard", icon: Home },
    { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Agencies", href: "/admin/agencies", icon: Building2 },
    { label: "Users", href: "/admin/users", icon: Users },
    {
      label: "Contacts", href: "/contacts", icon: Users,
      children: [
        { label: "Pipeline", href: "/pipeline", icon: ChevronRight },
        { label: "Borrowers", href: "/borrowers", icon: ChevronRight },
        { label: "Referral Partners", href: "/contacts", icon: ChevronRight },
      ],
    },
    {
      label: "Activity", href: "/appointments", icon: Zap,
      children: [
        { label: "Appointments", href: "/appointments", icon: Calendar },
        { label: "AI Calling", href: "/calling", icon: Phone },
      ],
    },
    {
      label: "Marketing", href: "/campaigns", icon: Mail,
      children: [
        { label: "Campaigns", href: "/campaigns", icon: Mail },
        { label: "Content Studio", href: "/content", icon: FileText },
        { label: "Automations", href: "/automations", icon: Workflow },
      ],
    },
    {
      label: "Reports", href: "/analytics", icon: BarChart3,
      children: [
        { label: "Analytics", href: "/analytics", icon: BarChart3 },
      ],
    },
    { label: "AI Assistant", href: "/ai", icon: Sparkles },
    { label: "Documents", href: "/documents", icon: Folder },
    { label: "Billing", href: "/billing", icon: CreditCard },
  ];
}

function getClientNav(): NavItem[] {
  return [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    {
      label: "Pipeline", href: "/pipeline", icon: Users,
      children: [
        { label: "All Leads", href: "/pipeline", icon: ChevronRight },
        { label: "Borrowers", href: "/borrowers", icon: ChevronRight },
        { label: "RE Agents", href: "/pipeline?type=re_agent", icon: ChevronRight },
        { label: "Attorneys", href: "/pipeline?type=attorney", icon: ChevronRight },
      ],
    },
    { label: "Borrower Database", href: "/borrowers", icon: BookOpen },
    { label: "Referral Partners", href: "/contacts", icon: Users },
    { label: "Appointments", href: "/appointments", icon: Calendar },
    { label: "AI Calling", href: "/calling", icon: Phone },
    {
      label: "Campaigns", href: "/campaigns", icon: Mail,
      children: [
        { label: "Email & SMS", href: "/campaigns", icon: Mail },
        { label: "Content Studio", href: "/content", icon: FileText },
      ],
    },
    { label: "Automations", href: "/automations", icon: Workflow },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    { label: "AI Assistant", href: "/ai", icon: Sparkles },
    { label: "Documents", href: "/documents", icon: Folder },
    { label: "Billing", href: "/billing", icon: CreditCard },
  ];
}

interface SidebarItemProps {
  item: NavItem;
  depth?: number;
}

function SidebarItem({ item, depth = 0 }: SidebarItemProps) {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(() => {
    if (!item.children) return false;
    return item.children.some(c => location.startsWith(c.href));
  });

  const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href) && !item.children);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`sidebar-nav-item w-full ${expanded ? "text-white" : ""}`}
          style={{ paddingLeft: depth > 0 ? `${0.75 + depth * 0.75}rem` : undefined }}
        >
          <item.icon className="icon" />
          <span className="flex-1 text-left">{item.label}</span>
          {expanded ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
        </button>
        {expanded && (
          <div className="mt-0.5 space-y-0.5">
            {item.children.map(child => (
              <SidebarItem key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href}>
      <div
        className={`sidebar-nav-item ${isActive ? "active" : ""}`}
        style={{ paddingLeft: depth > 0 ? `${0.75 + depth * 0.75}rem` : undefined }}
      >
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
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const navItems = isAdmin ? getAdminNav() : getClientNav();

  const effectiveAgencyId = agencyId ?? (user as any)?.agencyId ?? 1;
  const { data: notifData } = trpc.notifications.unreadCount.useQuery(
    { agencyId: effectiveAgencyId },
    { enabled: !!user }
  );

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className="flex flex-col w-60 flex-shrink-0 overflow-y-auto"
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border-color)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4" style={{ borderBottom: "1px solid var(--sidebar-border-color)" }}>
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm font-display truncate">MortgageCRM</p>
            <p className="text-xs truncate" style={{ color: "var(--sidebar-muted-fg)" }}>
              {isAdmin ? "Admin Portal" : "Agent Portal"}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </nav>

        {/* User footer */}
        <div className="px-2 py-3" style={{ borderTop: "1px solid var(--sidebar-border-color)" }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="sidebar-nav-item w-full">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-blue-500 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
                  <p className="text-xs truncate" style={{ color: "var(--sidebar-muted-fg)" }}>{user?.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-border flex-shrink-0">
          <div />
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-4 h-4" />
                    {(notifData?.count ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notifData!.count > 9 ? "9+" : notifData!.count}
                      </span>
                    )}
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
