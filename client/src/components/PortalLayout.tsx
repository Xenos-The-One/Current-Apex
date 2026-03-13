import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, FileText, Calendar, TrendingUp, Send, Menu, X, CheckSquare, Sparkles, Share2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

interface PortalLayoutProps {
  children: React.ReactNode;
  /** Active nav item path, e.g. "/portal/dashboard" */
  activePath?: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", path: "/seo/portal/dashboard", icon: LayoutDashboard },
  { label: "Apex Content", path: "/seo/portal/apex-content", icon: CheckSquare },
  { label: "Social Media", path: "/seo/portal/social", icon: Share2 },
  { label: "Calendar", path: "/seo/portal/calendar", icon: Calendar },
  { label: "Performance", path: "/seo/portal/performance", icon: TrendingUp },
  { label: "Publishing", path: "/seo/portal/publishing", icon: Send },
  { label: "Follow-Ups", path: "/seo/portal/follow-ups", icon: Sparkles },
];

export default function PortalLayout({ children, activePath }: PortalLayoutProps) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activePath]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#000F12" }}>
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#000F12",
        backgroundImage: "radial-gradient(circle, rgba(0,255,255,0.07) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* ── Top header bar ── */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: "rgba(2, 18, 20, 0.92)",
          borderBottom: "1px solid rgba(0,255,255,0.15)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 1px 0 rgba(0,255,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/apex-logo.svg"
                alt="Apex AI SEO Portal"
                className="h-8 w-auto object-contain"
              />
              <span
                className="text-xs font-medium tracking-widest uppercase hidden sm:block"
                style={{ color: "rgba(0,255,255,0.45)" }}
              >
                Client Portal
              </span>
            </div>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
                const isActive = activePath === path;
                return (
                  <Link
                    key={path}
                    href={path}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    style={
                      isActive
                        ? { color: "#00FFFF", backgroundColor: "rgba(0,255,255,0.1)" }
                        : { color: "rgba(255,255,255,0.55)" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = "rgba(0,255,255,0.8)";
                        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,255,255,0.06)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Right side: user info + logout + hamburger */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white/90">{user.name}</p>
                  <p className="text-xs" style={{ color: "rgba(0,255,255,0.5)" }}>
                    Client
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex border-white/10 text-white/70 hover:border-cyan-400/40 hover:text-cyan-400 hover:bg-cyan-400/5 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Logout
              </Button>

              {/* Hamburger button — mobile only */}
              <button
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-md transition-colors"
                style={{ color: "rgba(255,255,255,0.7)", backgroundColor: "rgba(0,255,255,0.06)" }}
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile slide-down menu ── */}
        {mobileMenuOpen && (
          <div
            className="md:hidden"
            style={{
              backgroundColor: "rgba(2, 18, 20, 0.98)",
              borderTop: "1px solid rgba(0,255,255,0.12)",
            }}
          >
            {/* User info */}
            {user && (
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(0,255,255,0.08)" }}
              >
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: "rgba(0,255,255,0.15)", color: "#00FFFF" }}>
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs" style={{ color: "rgba(0,255,255,0.5)" }}>
                    Client
                  </p>
                </div>
              </div>
            )}

            {/* Nav items */}
            <nav className="px-3 py-2 space-y-0.5">
              {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
                const isActive = activePath === path;
                return (
                  <Link
                    key={path}
                    href={path}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                    style={
                      isActive
                        ? { color: "#00FFFF", backgroundColor: "rgba(0,255,255,0.1)" }
                        : { color: "rgba(255,255,255,0.65)" }
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(0,255,255,0.08)" }}>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium transition-colors w-full"
                style={{ color: "rgba(255,100,100,0.8)" }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
