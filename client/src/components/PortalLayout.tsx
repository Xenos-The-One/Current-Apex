import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut, LayoutDashboard, Calendar, TrendingUp,
  Send, CheckSquare, Share2, Settings, ArrowLeft, Sparkles,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

interface PortalLayoutProps {
  children: React.ReactNode;
  /** Active nav item path, e.g. "/seo/portal/dashboard" */
  activePath?: string;
}

const NAV_ITEMS = [
  { label: "Dashboard",    path: "/seo/portal/dashboard",    icon: LayoutDashboard },
  { label: "Apex Content", path: "/seo/portal/apex-content", icon: CheckSquare },
  { label: "Social Media", path: "/seo/portal/social",       icon: Share2 },
  { label: "Calendar",     path: "/seo/portal/calendar",     icon: Calendar },
  { label: "Performance",  path: "/seo/portal/performance",  icon: TrendingUp },
  { label: "Publishing",   path: "/seo/portal/publishing",   icon: Send },
  { label: "Follow-Ups",   path: "/seo/portal/follow-ups",   icon: Sparkles },
];

export default function PortalLayout({ children, activePath }: PortalLayoutProps) {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = getLoginUrl();
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = getLoginUrl("/seo/portal/dashboard");
    }
  }, [isLoading, user]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const currentLabel =
    NAV_ITEMS.find(n => n.path === (activePath ?? location))?.label ?? "Client Portal";

  return (
    <SidebarProvider>
      {/* ── Sidebar ── */}
      <Sidebar className="client-sidebar border-r border-border/40">
        {/* Header */}
        <SidebarHeader className="border-b border-border/40 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346016577/LMov9oD5hWD87TsDa4kZ8o/GradientLogoBlue2Green_5403585a.png"
              alt="Logo"
              className="h-6 w-6 object-contain shrink-0"
            />
            <span className="text-sm font-bold tracking-tight truncate">Client Portal</span>
          </div>
        </SidebarHeader>

        {/* Back to CRM */}
        <div className="px-3 py-2 border-b border-border/30">
          <Link href="/dashboard">
            <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-md hover:bg-muted">
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              Back to CRM
            </button>
          </Link>
        </div>

        {/* Navigation */}
        <SidebarContent className="gap-0 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 py-1">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
                  const isActive =
                    activePath === path ||
                    location === path ||
                    (path !== "/seo/portal/dashboard" && location.startsWith(path));
                  return (
                    <SidebarMenuItem key={path}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={path}>
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer — user profile */}
        <SidebarFooter className="border-t border-border/40 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors w-full text-left hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-7 w-7 border shrink-0">
                  <AvatarFallback className="text-[11px] font-medium bg-blue-100 text-blue-700">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate leading-none text-gray-900">{user?.name || "-"}</p>
                  <p className="text-[11px] truncate mt-0.5 text-gray-500">{user?.email || "-"}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => { window.location.href = "/account"; }}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      {/* ── Main content ── */}
      <SidebarInset>
        {/* Top bar */}
        <div className="flex border-b h-11 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8 rounded-md" />
            <span className="text-sm font-medium text-muted-foreground">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">{user.name}</span>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
