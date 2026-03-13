import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AIAssistantWidget from "@/components/AIAssistantWidget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  UserCircle,
  Mail,
  MessageSquare,
  Calendar,
  BarChart3,
  FileText,
  Sparkles,
  Building2,
  CalendarClock,
  Gift,
  Bell,
  BellRing,
  UserCheck,
  TrendingUp,
  Settings,
  Database,
  Handshake,
  PieChart,
  Phone,
  Search,
  Inbox,
  MailOpen,
  Clapperboard,
  CheckSquare,
  Plus,
  UserPlus,
  Upload,
  Megaphone,
  ChevronDown,
  Workflow,
  BellDot,
  ChevronsUpDown,
  CircleDot,
  Rocket,
  Home,
  Target,
  Zap,
  ChevronRight,
  Share2,
  Instagram,
  Bot,
  MapPin,
  Globe,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CSSProperties, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useIsEmbedded } from "@/contexts/EmbeddedContext";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { GlobalSearch, useGlobalSearch } from "./GlobalSearch";
import { AlertCircle } from "lucide-react";

// ─── Client Onboarding Banner ─────────────────────────────────────────────────
function ClientOnboardingBanner({ setLocation }: { setLocation: (path: string) => void }) {
  const { data: onboardingStatus } = trpc.clientOnboarding.getStatus.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  if (!onboardingStatus || onboardingStatus.completed) return null;

  return (
    <div className="mx-2 mt-2 mb-1 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-amber-800 leading-tight">Setup Incomplete</p>
          <p className="text-[10px] text-amber-600 mt-0.5 leading-tight">Complete your business profile to unlock content generation.</p>
          <button
            onClick={() => setLocation("/account-setup")}
            className="mt-1.5 text-[10px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition-colors"
          >
            Complete Setup →
          </button>
        </div>
      </div>
    </div>
  );
}

type MenuItem = {
  icon: any;
  label: string;
  path: string;
  adminOnly?: boolean;
  loaVisible?: boolean;
  roles?: string[];
  section?: string;
};

// ─── Admin sidebar: grouped sections ────────────────────────────────────────
type MenuSection = { id: string; label: string; icon: any; items: MenuItem[] };

const adminMenuSections: MenuSection[] = [
  {
    id: "overview", label: "Overview", icon: Home,
    items: [
      { icon: Building2, label: "Admin Dashboard", path: "/admin" },
    ],
  },
  {
    id: "contacts", label: "Contacts", icon: Users,
    items: [
      // Single entry — tabs: Pipeline | Borrowers | Referral Partners
      { icon: UserCircle, label: "Contacts", path: "/contacts" },
    ],
  },
  {
    id: "activity", label: "Activity", icon: CalendarClock,
    items: [
      // Single entry — tabs: Appointments | Call Review | Follow-Ups | Birthdays
      { icon: CalendarClock, label: "Activity", path: "/activity" },
      { icon: MessageSquare, label: "Conversations", path: "/conversations" },
    ],
  },
  {
    id: "marketing", label: "Marketing", icon: Megaphone,
    items: [
      // Single entry — tabs: Email | SMS | AI Scripts | Templates
      { icon: Megaphone, label: "Marketing", path: "/marketing" },
    ],
  },
  {
    id: "automations", label: "Automations", icon: Workflow,
    items: [
      { icon: Workflow, label: "Automations", path: "/automations" },
    ],
  },
  {
    id: "reporting", label: "Reporting", icon: BarChart3,
    items: [
      // Single entry — tabs: Analytics | Metrics | Market | Funnel | Advanced
      { icon: BarChart3, label: "Reports", path: "/reporting" },
    ],
  },
  {
    id: "seo", label: "AI SEO", icon: Search,
    items: [
      // Standalone — keeps its own dedicated route
      { icon: Search, label: "AI SEO Portal", path: "/seo" },
    ],
  },
  {
    id: "payments", label: "Payments", icon: PieChart,
    items: [
      { icon: PieChart, label: "Payments & Subscriptions", path: "/payments" },
    ],
  },
  {
    id: "tools", label: "Tools", icon: Settings,
    items: [
      // Single entry — tabs: Content Studio | Inbox | Email Templates | Notifications
      { icon: Settings, label: "Tools", path: "/tools" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

// ─── Client sidebar: grouped sections ────────────────────────────────────────
const clientMenuSections: MenuSection[] = [
  {
    id: "home", label: "Home", icon: Home,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: UserPlus, label: "Account Setup", path: "/account-setup" },
    ],
  },
  {
    id: "contacts", label: "Contacts", icon: Users,
    items: [
      { icon: Users, label: "Contacts", path: "/contacts" },
      { icon: BellDot, label: "Follow-Ups", path: "/follow-ups" },
      { icon: Target, label: "Pipeline", path: "/pipeline" },
    ],
  },
  {
    id: "engage", label: "Engage", icon: MessageSquare,
    items: [
      { icon: Calendar, label: "Calendar", path: "/calendar" },
      { icon: MessageSquare, label: "Conversations", path: "/conversations" },
      { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
      { icon: Zap, label: "Follow-Up Sequences", path: "/drip-sequences" },
    ],
  },
  {
    id: "communicate", label: "Communicate", icon: Phone,
    items: [
      { icon: Bot, label: "AI Calling", path: "/ai-calling" },
      { icon: Mail, label: "Email Campaigns", path: "/email-campaigns" },
      { icon: MessageSquare, label: "SMS Campaigns", path: "/sms-campaigns" },
    ],
  },
  {
    id: "content", label: "Content & Ads", icon: Instagram,
    items: [
      { icon: Share2, label: "Social Media", path: "/social" },
      { icon: CheckSquare, label: "Apex Content", path: "/apex-content" },
      { icon: Megaphone, label: "Ad Manager", path: "/ad-manager" },
    ],
  },
  {
    id: "grow", label: "Grow", icon: TrendingUp,
    items: [
      { icon: TrendingUp, label: "Reports", path: "/reports" },
      { icon: MapPin, label: "Market Analytics", path: "/market-analytics" },
      { icon: Globe, label: "Website", path: "/website" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

// ─── LOA sidebar: grouped sections ────────────────────────────────────────
const loaMenuSections: MenuSection[] = [
  {
    id: "home", label: "Home", icon: Home,
    items: [
      { icon: Rocket, label: "Launchpad", path: "/launchpad" },
      { icon: UserCheck, label: "LOA Dashboard", path: "/loa" },
    ],
  },
  {
    id: "contacts", label: "Contacts", icon: Users,
    items: [
      { icon: UserCircle, label: "Contacts", path: "/contacts" },
      { icon: Database, label: "Borrower Database", path: "/borrowers" },
      { icon: Handshake, label: "Referral Partners", path: "/referral-partners" },
    ],
  },
  {
    id: "activity", label: "Activity", icon: CalendarClock,
    items: [
      { icon: CalendarClock, label: "Appointments", path: "/appointments" },
      { icon: BarChart3, label: "Analytics", path: "/analytics" },
      { icon: Bell, label: "Notifications", path: "/notifications" },
      { icon: Inbox, label: "Client Inbox", path: "/client-inbox" },
    ],
  },
];

// Flat lists for legacy helpers
const adminMenuItems: MenuItem[] = adminMenuSections.flatMap((s) => s.items);
const clientMenuItems: MenuItem[] = clientMenuSections.flatMap((s) => s.items);
const loaMenuItems: MenuItem[] = loaMenuSections.flatMap((s) => s.items);

function getMenuSectionsForRole(role?: string): MenuSection[] {
  if (role === "admin" || role === "super_admin" || role === "agency_owner") return adminMenuSections;
  if (role === "loa") return loaMenuSections;
  return clientMenuSections;
}
function getMenuItemsForRole(role?: string): MenuItem[] {
  if (role === "admin" || role === "super_admin" || role === "agency_owner") return adminMenuItems;
  if (role === "loa") return loaMenuItems;
  return clientMenuItems;
}

// ─── Contact type sub-categories for Pipeline nav item ───────────────────────
const CONTACT_TYPE_SUBS = [
  { label: "All Leads", contactType: "all", color: "text-primary" },
  { label: "Borrowers", contactType: "borrower", color: "text-blue-500" },
  { label: "RE Agents", contactType: "real_estate_agent", color: "text-emerald-500" },
  { label: "Attorneys", contactType: "attorney", color: "text-purple-500" },
  { label: "Insurance", contactType: "insurance_agent", color: "text-orange-500" },
  { label: "Title Co.", contactType: "title_company", color: "text-pink-500" },
  { label: "Builders", contactType: "builder_developer", color: "text-amber-500" },
  { label: "Lenders", contactType: "lender", color: "text-cyan-500" },
];

function PipelineNavItem({
  isActive,
  isClient,
}: {
  isActive: boolean;
  isClient: boolean;
  isCollapsed: boolean;
}) {
  const [, setLocation] = useLocation();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip="Contacts"
        className={`h-7 transition-all font-normal text-[13px] ${
          isClient
            ? isActive
              ? "bg-blue-50 text-blue-700 font-medium"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            : ""
        }`}
        onClick={() => setLocation("/contacts")}
      >
        <Users
          className={`h-4 w-4 ${
            isClient
              ? isActive
                ? "text-blue-600"
                : "text-gray-400"
              : isActive
              ? "text-primary"
              : ""
          }`}
        />
        <span className="flex-1">Contacts</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function isClientRole(role?: string): boolean {
  return role === "client_user" || (!role);
}

// Map legacy paths to their hub path so the sidebar highlights correctly
const HUB_PATH_ALIASES: Record<string, string> = {
  "/leads": "/contacts",
  "/borrowers": "/contacts",
  "/referral-partners": "/contacts",
  "/appointments": "/activity",
  "/call-review": "/activity",
  "/follow-ups": "/activity",
  "/birthdays": "/activity",
  "/email-campaigns": "/marketing",
  "/sms-campaigns": "/marketing",
  "/social": "/marketing",
  "/ai-scripts": "/marketing",
  "/templates": "/marketing",
  "/workflows": "/marketing",
  "/analytics": "/reporting",
  "/metrics": "/reporting",
  "/market-analytics": "/reporting",
  "/conversion": "/reporting",
  "/reports": "/reporting",
  "/content-studio": "/tools",
  "/client-inbox": "/tools",
  "/email-templates": "/tools",
  "/notifications": "/tools",
  "/notification-center": "/tools",
};

function resolveHubPath(loc: string): string {
  // Check exact match first
  if (HUB_PATH_ALIASES[loc]) return HUB_PATH_ALIASES[loc];
  // Check prefix match (e.g. /borrowers/123)
  for (const [legacy, hub] of Object.entries(HUB_PATH_ALIASES)) {
    if (loc.startsWith(legacy + "/") || loc.startsWith(legacy + "?")) return hub;
  }
  return loc;
}

// ─── Grouped sidebar nav: column headers + always-visible items ────────────────
function GroupedSidebarNav({
  sections,
  location,
  setLocation,
  isClient,
  isCollapsed,
}: {
  sections: MenuSection[];
  location: string;
  setLocation: (path: string) => void;
  isClient: boolean;
  isCollapsed: boolean;
}) {
  const resolvedLocation = resolveHubPath(location);

  return (
    <div className="flex flex-col gap-0 px-1.5 py-1">
      {sections.map((section) => {
        const sectionActive = section.items.some(
          (item) => resolvedLocation === item.path || resolvedLocation.startsWith(item.path + "/")
        );
        return (
          <div key={section.id} className="mb-0.5">
            {/* Section header — only show when section has multiple items (single-item sections are self-labelled by their nav item) */}
            {!isCollapsed && section.items.length > 1 && (
              <button
                onClick={() => setLocation(section.items[0]?.path ?? "/")}
                className={`w-full flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors select-none mt-1 ${
                  isClient
                    ? sectionActive
                      ? "text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                    : sectionActive
                    ? "text-primary/80"
                    : "text-muted-foreground/45 hover:text-muted-foreground/70"
                }`}
              >
                <span>{section.label}</span>
              </button>
            )}
            {/* Section items */}
            <div className={isCollapsed ? "" : ""}>
              {section.items.map((item) => {
                const isActive =
                  resolvedLocation === item.path || resolvedLocation.startsWith(item.path + "/");
                if (item.path === "/contacts") {
                  return (
                    <PipelineNavItem
                      key={item.path}
                      isActive={isActive}
                      isClient={isClient}
                      isCollapsed={isCollapsed}
                    />
                  );
                }
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-7 transition-all font-normal text-[13px] ${
                        isClient
                          ? isActive
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          : isActive
                          ? "bg-primary/8 text-primary font-medium"
                          : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <item.icon
                          className={`h-3.5 w-3.5 ${
                            isClient
                              ? isActive
                                ? "text-blue-600"
                                : "text-gray-400"
                              : isActive
                              ? "text-primary"
                              : "text-muted-foreground/70"
                          }`}
                        />
                        {item.path === "/notifications" && <NotificationBadge />}
                        {item.path === "/apex-content" && <ApprovalBadge />}
                        {item.path === "/conversations" && <ConversationUnreadBadge />}
                      </div>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </div>
            {/* Divider between sections */}
            {!isCollapsed && (
              <div
                className={`mx-2 mt-1.5 mb-0 h-px ${
                  isClient ? "bg-gray-100" : "bg-border/40"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab label map: path → display label ────────────────────────────────────
const TAB_LABELS: Record<string, string> = {
  // Contacts hub
  "/contacts": "Contacts",
  "/contacts/borrowers": "Borrowers",
  "/contacts/referral-partners": "Referral Partners",
  "/leads": "Contacts",
  "/borrowers": "Borrowers",
  "/referral-partners": "Referral Partners",
  // Activity hub
  "/activity": "Appointments",
  "/activity/call-review": "Call Review",
  "/activity/follow-ups": "Follow-Ups",
  "/activity/birthdays": "Birthdays",
  "/appointments": "Appointments",
  "/call-review": "Call Review",
  "/follow-ups": "Follow-Ups",
  "/birthdays": "Birthdays",
  "/pipeline": "Pipeline",
  // Marketing hub
  "/marketing": "Email Campaigns",
  "/marketing/sms": "SMS Campaigns",
  "/marketing/social": "Social Media",
  "/marketing/ai-scripts": "AI Scripts",
  "/marketing/templates": "Templates",
  "/marketing/automations": "Automations",
  "/email-campaigns": "Email Campaigns",
  "/sms-campaigns": "SMS Campaigns",
  "/workflows": "Automations",
  // Reporting hub
  "/reporting": "Analytics",
  "/reporting/metrics": "Metrics",
  "/reporting/market": "Market Analytics",
  "/reporting/funnel": "Conversion Funnel",
  "/reporting/advanced": "Advanced Reports",
  "/analytics": "Analytics",
  "/metrics": "Metrics",
  "/market-analytics": "Market Analytics",
  "/conversion": "Conversion Funnel",
  "/reports": "Advanced Reports",
  // Tools hub
  "/tools": "Content Studio",
  "/tools/inbox": "Client Inbox",
  "/tools/email-templates": "Email Templates",
  "/tools/notifications": "Notifications",
  "/tools/notification-center": "Notification Center",
  "/content-studio": "Content Studio",
  "/client-inbox": "Client Inbox",
  "/email-templates": "Email Templates",
  "/notifications": "Notifications",
  "/notification-center": "Notification Center",
};

const HUB_NAMES: Record<string, string> = {
  "/contacts": "Contacts",
  "/activity": "Activity",
  "/marketing": "Marketing",
  "/reporting": "Reporting",
  "/tools": "Tools",
};

function TopBarBreadcrumb({ location, menuItems }: { location: string; menuItems: MenuItem[] }) {
  const tabLabel = TAB_LABELS[location];
  const resolvedHub = resolveHubPath(location);
  const hubName = HUB_NAMES[resolvedHub];

  if (tabLabel && hubName) {
    // Show: Hub > Tab (e.g. "Marketing  ›  Email Campaigns")
    return (
      <span className="flex items-center gap-1.5 text-sm ml-1">
        <span className="text-muted-foreground/60 font-medium">{hubName}</span>
        <span className="text-muted-foreground/40">›</span>
        <span className="text-foreground font-medium">{tabLabel}</span>
      </span>
    );
  }

  // Fallback: show the menu item label
  const activeMenuItem = menuItems.find((item) => item.path === location);
  return (
    <span className="text-sm font-medium text-muted-foreground ml-1">
      {activeMenuItem?.label ?? ""}
    </span>
  );
}

function ConversationUnreadBadge() {
  const { data } = trpc.conversations.getStats.useQuery({ agencyId: 0 }, {
    refetchInterval: 30000,
    retry: false,
  });
  const count = Number(data?.unread) || 0;
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-0.5">
      {count > 99 ? "99+" : count}
    </span>
  );
}
function NotificationBadge() {
  const { data } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const count = data?.count || 0;
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-0.5">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ApprovalBadge() {
  const { data } = trpc.contentApprovals.listPending.useQuery({}, {
    refetchInterval: 60000,
    retry: false,
  });
  const count = data?.length || 0;
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-0.5">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Global Search Button ───────────────────────────────────────────────────
function SearchButton() {
  const { open, setOpen } = useGlobalSearch();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-md border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-sm text-muted-foreground"
        title="Search (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline text-xs">Search...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-background border border-border/60 font-mono text-muted-foreground/70">
          ⌘K
        </kbd>
      </button>
      <GlobalSearch open={open} onOpenChange={setOpen} />
    </>
  );
}

// ─── Quick Add Popover ──────────────────────────────────────────────────────
function QuickAddButton() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: UserPlus, label: "New Lead", path: "/leads/new" },
    { icon: Upload, label: "Import Leads", path: "/leads/import" },
    { icon: CalendarClock, label: "New Appointment", path: "/activity" },
    { icon: Mail, label: "Email Campaign", path: "/marketing" },
    { icon: MessageSquare, label: "SMS Campaign", path: "/marketing/sms" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Quick Add</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        {actions.map((action) => (
          <button
            key={action.path}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
            onClick={() => {
              setLocation(action.path);
              setOpen(false);
            }}
          >
            <action.icon className="h-4 w-4 text-muted-foreground" />
            {action.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Sub-Account Switcher ───────────────────────────────────────────────────
function SubAccountSwitcher() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { impersonatingClientId, impersonatingClientName, isImpersonating, isClientViewMode, startImpersonatingAsAdmin, startImpersonatingAsClient, stopImpersonating } = useImpersonation();
  const utils = trpc.useUtils();
  // Only show for admin/agency_owner
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "agency_owner";
  const { data: agencies } = trpc.admin.listAgencies.useQuery(undefined, {
    enabled: isAdmin,
  });
  // Get clients for the first agency
  const agencyId = agencies?.[0]?.id;
  const { data: clients } = trpc.admin.listClients.useQuery(
    { agencyId: agencyId! },
    { enabled: !!agencyId }
  );
  if (!isAdmin || !clients || clients.length === 0) return null;
  const filteredClients = clients.filter((c: any) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  /** Admin-context: click client name in dropdown — keep admin sidebar */
  const handleImpersonateAsAdmin = (clientId: number, clientName: string) => {
    startImpersonatingAsAdmin(clientId, clientName);
    toast.success(`Viewing ${clientName}'s data`, {
      description: "Admin Mode — your admin sidebar stays. Click 'Exit to Admin' to return.",
    });
    utils.invalidate();
    setLocation("/dashboard");
    setOpen(false);
  };
  /** Client-view: click 'View as' icon — switch to client sidebar */
  const handleImpersonateAsClient = (clientId: number, clientName: string) => {
    startImpersonatingAsClient(clientId, clientName);
    toast.success(`Switched to ${clientName}'s client view`, {
      description: "Client View — you see their exact experience. Click 'Exit to Admin' to return.",
    });
    utils.invalidate();
    setLocation("/dashboard");
    setOpen(false);
  };
  const handleStopImpersonating = () => {
    stopImpersonating();
    toast.info("Returned to admin view");
    utils.invalidate();
    setLocation("/admin");
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/50 transition-colors text-sm max-w-[240px]">
            <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
              isImpersonating ? "bg-amber-500/20" : "bg-primary/10"
            }`}>
              {isImpersonating ? (
                <Eye className="h-3.5 w-3.5 text-amber-600" />
              ) : (
                <Building2 className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <span className="truncate font-medium hidden md:inline">
              {isImpersonating ? impersonatingClientName : "All Accounts"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          {isImpersonating && (
            <button
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md transition-colors font-medium mb-2 ${
                isClientViewMode
                  ? "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20"
                  : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
              }`}
              onClick={handleStopImpersonating}
            >
              <EyeOff className="h-4 w-4" />
              Exit to Admin View
            </button>
          )}
          <div className="mb-2">
            <input
              type="text"
              placeholder="Search accounts..."
              className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            <button
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md font-medium ${
                !isImpersonating ? "bg-accent/50" : "hover:bg-accent"
              }`}
              onClick={() => {
                if (isImpersonating) handleStopImpersonating();
                else { setLocation("/admin"); setOpen(false); }
              }}
            >
              <Building2 className="h-4 w-4 text-primary" />
              All Accounts (Admin View)
            </button>
            {filteredClients.map((client: any) => (
              <div
                key={client.id}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md transition-colors text-left group ${
                  impersonatingClientId === client.id && !isClientViewMode
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : impersonatingClientId === client.id && isClientViewMode
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "hover:bg-accent"
                }`}
              >
                <div className="relative">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px] bg-muted">
                      {client.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CircleDot
                    className={`h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 ${
                      client.subscriptionStatus === "active" || client.subscriptionStatus === "trial"
                        ? "text-emerald-500"
                        : client.subscriptionStatus === "past_due"
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}
                  />
                </div>
                {/* Click name = admin-context mode */}
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => handleImpersonateAsAdmin(client.id, client.name)}
                  title={`View ${client.name}'s data (admin sidebar)`}
                >
                  <p className="truncate hover:text-primary transition-colors">{client.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {client.subscriptionTier}
                  </p>
                </button>
                {/* Eye icon = client-view mode */}
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-700 hover:bg-blue-500/30 shrink-0"
                  onClick={() => handleImpersonateAsClient(client.id, client.name)}
                  title={`Switch to ${client.name}'s client view`}
                >
                  <Eye className="h-3 w-3" />
                  Client
                </button>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 220;
const MIN_WIDTH = 180;
const MAX_WIDTH = 380;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isEmbedded = useIsEmbedded();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (!isEmbedded) {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    }
  }, [sidebarWidth, isEmbedded]);

  // Set sessionStorage flag when user is logged in so we can show session expiry banner
  useEffect(() => {
    if (user && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("crm_was_logged_in", "1");
    }
  }, [user]);

  // When rendered inside a hub page, skip the full layout wrapper
  if (isEmbedded) {
    return <>{children}</>;
  }

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    // Always redirect to /login — never to Manus OAuth.
    // Sub-account users (Kyle, Tim, LOAs) use email+password at /login.
    // Admin users can also log in there or use the Manus button on the homepage.
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/api/client-login")) {
      // If the user was previously logged in (sessionStorage flag set on login), show the expiry banner
      const hadSession = typeof sessionStorage !== "undefined" && sessionStorage.getItem("crm_was_logged_in") === "1";
      const reason = hadSession ? "?reason=session_expired" : "";
      window.location.replace(`/api/client-login${reason}`);
    }
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { isImpersonating, isClientViewMode, impersonatingClientName, impersonatingClientId, stopImpersonating, startImpersonatingAsAdmin, startImpersonatingAsClient, viewMode } = useImpersonation();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");
  const utils = trpc.useUtils();

  // Super admins keep their full admin sidebar even when impersonating a client.
  // Only actual client/LOA users get the client sidebar.
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "agency_owner";
  // Fetch all agencies so we can list clients for the banner switcher
  const { data: allAgencies } = trpc.admin.listAgencies.useQuery(undefined, {
    enabled: isImpersonating && isSuperAdmin,
  });
  const menuSections = useMemo(() => {
    // When super_admin clicks "View as Client" → show client sidebar (full client experience)
    if (isSuperAdmin && isClientViewMode) return clientMenuSections;
    // When super_admin clicks a sub-account row (admin-context mode) → keep admin sidebar
    if (isSuperAdmin) return getMenuSectionsForRole(user?.role);
    if (isImpersonating) return clientMenuSections;
    return getMenuSectionsForRole(user?.role);
  }, [user?.role, isImpersonating, isClientViewMode, isSuperAdmin]);
  const menuItems = useMemo(() => menuSections.flatMap((s) => s.items), [menuSections]);
  // isClient controls sidebar dark styling:
  // - Client-view mode: show client dark sidebar even for super_admin
  // - Admin-context mode: keep admin light sidebar
  const isClient = isClientViewMode || (!isSuperAdmin && (isImpersonating || isClientRole(user?.role)));
  const activeMenuItem = menuItems.find((item) => item.path === location);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className={`border-r-0 ${isClient ? "client-sidebar" : ""}`}
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-12 justify-center border-b border-border/40">
            <div className="flex items-center gap-2 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-7 w-7 flex items-center justify-center hover:bg-accent rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346016577/LMov9oD5hWD87TsDa4kZ8o/GradientLogoBlue2Green_5403585a.png"
                    alt="Sterling Marketing"
                    className="h-5 w-5 object-contain"
                  />
                  <span className={`text-sm font-bold tracking-tight truncate ${isClient ? "text-gray-900" : ""}`}>
                    Sterling Marketing
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {isClient && !isCollapsed && <ClientOnboardingBanner setLocation={setLocation} />}
            <GroupedSidebarNav
              sections={menuSections}
              location={location}
              setLocation={setLocation}
              isClient={isClient}
              isCollapsed={isCollapsed}
            />
          </SidebarContent>

          <SidebarFooter className="p-2 border-t border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isClient
                      ? "hover:bg-gray-100"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <Avatar className="h-7 w-7 border shrink-0">
                    <AvatarFallback
                      className={`text-[11px] font-medium ${
                        isClient ? "bg-blue-100 text-blue-700" : ""
                      }`}
                    >
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p
                      className={`text-[13px] font-medium truncate leading-none ${
                        isClient ? "text-gray-900" : ""
                      }`}
                    >
                      {user?.name || "-"}
                    </p>
                    <p
                      className={`text-[11px] truncate mt-0.5 ${
                        isClient ? "text-gray-500" : "text-muted-foreground"
                      }`}
                    >
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/account")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Top nav bar */}
        <div className="flex border-b h-11 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
            )}
            <SubAccountSwitcher />
            {!isMobile && (
              <TopBarBreadcrumb location={location} menuItems={menuItems} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <SearchButton />
            <QuickAddButton />
            <button
              onClick={() => setLocation("/notifications")}
              className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              <NotificationBadge />
            </button>
          </div>
        </div>
        {/* Impersonation banner — shown when super_admin is viewing a client's data */}
        {isImpersonating && (() => {
          const accentColor = isClientViewMode ? "blue" : "amber";
          const filteredAgencies = (allAgencies ?? []).filter((a: any) =>
            (a.clientName ?? a.name ?? "").toLowerCase().includes(switcherSearch.toLowerCase())
          );
          return (
            <div className={`border-b px-3 py-2 flex items-center justify-between gap-2 ${
              isClientViewMode
                ? "bg-blue-500/10 border-blue-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}>
              {/* Left: mode badge + client switcher */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Mode badge */}
                <div className="flex items-center gap-1 shrink-0">
                  {isClientViewMode ? (
                    <>
                      <UserCircle className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-xs font-bold uppercase tracking-wide text-blue-600 bg-blue-500/20 px-1.5 py-0.5 rounded-full hidden sm:inline">
                        Client View
                      </span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-bold uppercase tracking-wide text-amber-600 bg-amber-500/20 px-1.5 py-0.5 rounded-full hidden sm:inline">
                        Admin Mode
                      </span>
                    </>
                  )}
                </div>
                {/* Client switcher dropdown */}
                <Popover open={switcherOpen} onOpenChange={(o) => { setSwitcherOpen(o); if (!o) setSwitcherSearch(""); }}>
                  <PopoverTrigger asChild>
                    <button
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold border transition-colors max-w-[200px] ${
                        isClientViewMode
                          ? "text-blue-800 border-blue-400/40 bg-blue-500/10 hover:bg-blue-500/20"
                          : "text-amber-800 border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20"
                      }`}
                    >
                      <span className="truncate">{impersonatingClientName ?? "Select client"}</span>
                      <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start" sideOffset={6}>
                    <div className="p-2 border-b">
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <input
                          autoFocus
                          placeholder="Search clients…"
                          value={switcherSearch}
                          onChange={(e) => setSwitcherSearch(e.target.value)}
                          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {filteredAgencies.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No clients found</p>
                      ) : (
                        filteredAgencies.map((agency: any) => {
                          const isActive = agency.clientId === impersonatingClientId;
                          const clientName = agency.clientName ?? agency.name;
                          return (
                            <button
                              key={agency.id}
                              onClick={() => {
                                if (!agency.clientId) {
                                  toast.error("No CRM client linked to this agency yet");
                                  return;
                                }
                                if (viewMode === "client") {
                                  startImpersonatingAsClient(agency.clientId, clientName);
                                } else {
                                  startImpersonatingAsAdmin(agency.clientId, clientName);
                                }
                                setSwitcherOpen(false);
                                setSwitcherSearch("");
                                utils.invalidate();
                                toast.success(`Switched to ${clientName}`);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${
                                isActive ? "bg-accent/60 font-medium" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                                  {clientName.charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate">{clientName}</span>
                              </div>
                              {isActive && (
                                <span className="text-xs text-muted-foreground shrink-0">Current</span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="border-t p-1">
                      <button
                        onClick={() => {
                          stopImpersonating();
                          setSwitcherOpen(false);
                          toast.info("Returned to admin view");
                          utils.invalidate();
                          setLocation("/admin");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent rounded-sm transition-colors"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        Exit to Admin View
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Right: toggle mode + exit */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Toggle between admin-context and client-view */}
                <button
                  onClick={() => {
                    if (impersonatingClientId && impersonatingClientName) {
                      if (isClientViewMode) {
                        startImpersonatingAsAdmin(impersonatingClientId, impersonatingClientName);
                        toast.info("Switched to Admin Mode");
                      } else {
                        startImpersonatingAsClient(impersonatingClientId, impersonatingClientName);
                        toast.info("Switched to Client View");
                      }
                      utils.invalidate();
                    }
                  }}
                  title={isClientViewMode ? "Switch to Admin Mode" : "Switch to Client View"}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                    isClientViewMode
                      ? "bg-blue-500/20 text-blue-700 hover:bg-blue-500/30 border-blue-500/30"
                      : "bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 border-amber-500/30"
                  }`}
                >
                  {isClientViewMode ? <Eye className="h-3 w-3" /> : <UserCircle className="h-3 w-3" />}
                  <span className="hidden sm:inline">{isClientViewMode ? "Admin Mode" : "Client View"}</span>
                </button>
                <button
                  onClick={() => {
                    stopImpersonating();
                    toast.info("Returned to admin view");
                    utils.invalidate();
                    setLocation("/admin");
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                    isClientViewMode
                      ? "bg-blue-500/20 text-blue-700 hover:bg-blue-500/30 border-blue-500/30"
                      : "bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 border-amber-500/30"
                  }`}
                >
                  <EyeOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            </div>
          );
        })()}
        <main className="flex-1 p-3 overflow-hidden flex flex-col min-h-0">{children}</main>
      </SidebarInset>
      <AIAssistantWidget />
    </>
  );
}
