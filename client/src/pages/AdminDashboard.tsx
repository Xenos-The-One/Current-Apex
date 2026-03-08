import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  Users, 
  Phone, 
  TrendingUp, 
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  MousePointerClick,
  Star,
  ArrowRight,
  UserPlus,
  Mail,
  Loader2,
  ShieldCheck,
  Rocket,
  XCircle,
  ClipboardList,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { SetupProgressTracker } from "@/components/SetupProgressTracker";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    role: "client_user" as "agency_owner" | "client_user" | "loa",
  });
  const [adminForm, setAdminForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    role: "admin" as "admin" | "super_admin",
  });

  const isSuperAdmin = user?.role === "super_admin";
  const [, setLocation] = useLocation();
  const { startImpersonatingAsAdmin, startImpersonatingAsClient } = useImpersonation();
  const utils = trpc.useUtils();

  // Content oversight state
  const [showRejectOversightDialog, setShowRejectOversightDialog] = useState(false);
  const [oversightRejectId, setOversightRejectId] = useState<number | null>(null);
  const [oversightRejectFeedback, setOversightRejectFeedback] = useState("");

  /** Admin-context mode: click the row name — keep admin sidebar, filter data to this client */
  const handleViewAsAdmin = (clientId: number | null | undefined, clientName: string) => {
    if (!clientId) {
      toast.error("No client account linked to this agency yet.", {
        description: "The client needs to complete account activation first.",
      });
      return;
    }
    startImpersonatingAsAdmin(clientId, clientName);
    toast.success(`Viewing ${clientName}'s data`, {
      description: "Admin Mode — your admin sidebar stays. Click 'Exit to Admin' to return.",
    });
    utils.invalidate();
    setLocation("/dashboard");
  };

  /** Client-view mode: click 'View as Client' — switch to full client sidebar + client UX */
  const handleViewAsClient = (clientId: number | null | undefined, clientName: string) => {
    if (!clientId) {
      toast.error("No client account linked to this agency yet.", {
        description: "The client needs to complete account activation first.",
      });
      return;
    }
    startImpersonatingAsClient(clientId, clientName);
    toast.success(`Switched to ${clientName}'s client view`, {
      description: "Client View — you see their exact experience. Click 'Exit to Admin' to return.",
    });
    utils.invalidate();
    setLocation("/dashboard");
  };

  const createSubAccount = trpc.onboarding.createSubAccount.useMutation({
    onSuccess: (data) => {
      const clientName = createForm.company || `${createForm.firstName} ${createForm.lastName}`;
      toast.success(data.emailSent
        ? `Account created! Activation email sent to ${createForm.email}`
        : `Account created, but email failed to send. Please resend manually.`);
      setShowCreateModal(false);
      setCreateForm({ firstName: "", lastName: "", email: "", phone: "", company: "", role: "client_user" });
      // Auto-switch to Client View so admin can help with onboarding call
      if (data.clientId && createForm.role === "client_user") {
        setTimeout(() => {
          startImpersonatingAsClient(data.clientId!, clientName);
          toast.success(`Switched to ${clientName}'s client view`, {
            description: "You're now in Client View — help them complete Account Setup. Click 'Exit to Admin' to return.",
          });
          utils.invalidate();
          setLocation("/account-setup");
        }, 1200);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create account");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.firstName || !createForm.lastName || !createForm.email) {
      toast.error("First name, last name, and email are required");
      return;
    }
    createSubAccount.mutate({
      ...createForm,
      origin: window.location.origin,
    });
  };

  const createAdminAccount = trpc.onboarding.createSubAccount.useMutation({
    onSuccess: (data) => {
      toast.success(data.emailSent
        ? `Admin account created! Activation email sent to ${adminForm.email}`
        : `Admin account created, but email failed to send. Please resend manually.`);
      setShowAdminModal(false);
      setAdminForm({ firstName: "", lastName: "", email: "", phone: "", company: "", role: "admin" });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create admin account");
    },
  });

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.firstName || !adminForm.lastName || !adminForm.email) {
      toast.error("First name, last name, and email are required");
      return;
    }
    createAdminAccount.mutate({
      ...adminForm,
      origin: window.location.origin,
    });
  };

  // Only fetch agencies when user is confirmed admin - prevents UNAUTHORIZED redirect loop
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Content oversight: all pending approvals across clients
  const { data: allPendingApprovals, isLoading: oversightLoading } = trpc.contentApprovals.listPending.useQuery(
    {},
    { enabled: isAdmin }
  );

  const adminApproveMutation = trpc.contentApprovals.adminApprove.useMutation({
    onSuccess: () => {
      toast.success("Content approved!");
      utils.contentApprovals.listPending.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const adminRejectMutation = trpc.contentApprovals.adminReject.useMutation({
    onSuccess: () => {
      toast.success("Content rejected with feedback.");
      setShowRejectOversightDialog(false);
      setOversightRejectFeedback("");
      setOversightRejectId(null);
      utils.contentApprovals.listPending.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const { data: agencies, isLoading: agenciesLoading } = trpc.admin.listAgencies.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  // SEO performance summary
  const { data: seoSummary } = trpc.seo.reports.getSummary.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  // Pending invitations
  const { data: invitations, refetch: refetchInvitations } = trpc.onboarding.listSubAccounts.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const resendInvitation = trpc.onboarding.resendInvitation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchInvitations();
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access the admin dashboard.
                {!user && " Please sign in first."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (agenciesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading agencies...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = {
    totalAgencies: agencies?.length || 0,
    activeAgencies: agencies?.filter(a => a.status === "active").length || 0,
    pendingCalls: agencies?.filter(a => a.status === "pending_call").length || 0,
    pendingPayment: agencies?.filter(a => a.status === "pending_payment").length || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "pending_call":
        return <Badge variant="secondary">Pending Call</Badge>;
      case "pending_payment":
        return <Badge variant="outline">Pending Payment</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage clients and monitor performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdminModal(true)}
                className="gap-1.5 h-8 text-xs"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Add Admin
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5 h-8 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              New Sub-Account
            </Button>
          </div>
        </div>

        {/* Create Sub-Account Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Create Sub-Account
              </DialogTitle>
              <DialogDescription>
                Fill in the details below. The account holder will receive a verification email to activate their account and set their own password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-9"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (702) 555-0100"
                      className="pl-9"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    placeholder="PMR Loans"
                    value={createForm.company}
                    onChange={(e) => setCreateForm(f => ({ ...f, company: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Account Role</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(v) => setCreateForm(f => ({ ...f, role: v as typeof f.role }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_user">Client User</SelectItem>
                      <SelectItem value="loa">Loan Officer / Agent (LOA)</SelectItem>
                      <SelectItem value="agency_owner">Agency Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSubAccount.isPending} className="gap-2">
                  {createSubAccount.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    <><UserPlus className="h-4 w-4" /> Create & Send Invite</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Admin Account Modal — super_admin only */}
        {isSuperAdmin && (
          <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Create Admin Account
                </DialogTitle>
                <DialogDescription>
                  Create an internal admin account. This option is only visible to super admins and cannot be accessed by any client-level user.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdminSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminFirstName">First Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="adminFirstName"
                        placeholder="Jane"
                        value={adminForm.firstName}
                        onChange={(e) => setAdminForm(f => ({ ...f, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminLastName">Last Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="adminLastName"
                        placeholder="Doe"
                        value={adminForm.lastName}
                        onChange={(e) => setAdminForm(f => ({ ...f, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Address <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="adminEmail"
                        type="email"
                        placeholder="jane@sterlingmarketing.com"
                        className="pl-9"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm(f => ({ ...f, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="adminPhone"
                        type="tel"
                        placeholder="+1 (702) 555-0100"
                        className="pl-9"
                        value={adminForm.phone}
                        onChange={(e) => setAdminForm(f => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminCompany">Company / Department</Label>
                    <Input
                      id="adminCompany"
                      placeholder="Sterling Marketing"
                      value={adminForm.company}
                      onChange={(e) => setAdminForm(f => ({ ...f, company: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminRole">Admin Role</Label>
                    <Select
                      value={adminForm.role}
                      onValueChange={(v) => setAdminForm(f => ({ ...f, role: v as typeof f.role }))}
                    >
                      <SelectTrigger id="adminRole">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAdminModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAdminAccount.isPending} className="gap-2">
                    {createAdminAccount.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      <><ShieldCheck className="h-4 w-4" /> Create Admin Account</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Stats Grid — compact inline stat bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Clients", value: stats.totalAgencies, icon: Building2, color: "text-blue-500" },
            { label: "Active", value: stats.activeAgencies, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Pending Call", value: stats.pendingCalls, icon: Clock, color: "text-amber-500" },
            { label: "Pending Sub", value: stats.pendingPayment, icon: AlertCircle, color: "text-red-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card flex items-center gap-3">
              <div className={`shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none">{value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* SEO Performance Widget */}
        {seoSummary && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  AI SEO Performance
                </CardTitle>
                <CardDescription>Content pipeline across all clients</CardDescription>
              </div>
              <Link href="/seo">
                <Button variant="outline" size="sm" className="gap-1">
                  Open SEO Portal <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <div className="text-2xl font-bold">{seoSummary.totalContent}</div>
                  <div className="text-xs text-muted-foreground">Total Content</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-success" />
                  <div className="text-2xl font-bold">{seoSummary.statusCounts?.approved || 0}</div>
                  <div className="text-xs text-muted-foreground">Published</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <Eye className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <div className="text-2xl font-bold">{(seoSummary.totalViews || 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Views</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                  <div className="text-2xl font-bold">{seoSummary.avgQualityScore || 0}</div>
                  <div className="text-xs text-muted-foreground">Avg Quality Score</div>
                </div>
              </div>
              {seoSummary.contentByClient && seoSummary.contentByClient.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Top SEO Clients</p>
                  <div className="space-y-1">
                    {seoSummary.contentByClient.slice(0, 3).map((c: any) => (
                      <div key={c.name} className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="text-muted-foreground ml-2 shrink-0">{c.count} posts · {c.approved} approved</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Clients Table */}
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Clients</CardTitle>
              <span className="text-xs text-muted-foreground">{agencies?.length || 0} total</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {agencies && agencies.length > 0 ? (
              <table className="w-full table-compact">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Client</th>
                    <th className="text-left hidden md:table-cell">Type</th>
                    <th className="text-left hidden lg:table-cell">Team</th>
                    <th className="text-left">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agencies.map((agency) => (
                    <tr key={agency.id}>
                      <td>
                        <button
                          className="font-medium text-sm hover:text-primary hover:underline transition-colors text-left"
                          onClick={() => handleViewAsAdmin((agency as any).clientId, (agency as any).clientName || agency.name)}
                          title="View this client's data with admin sidebar"
                        >
                          {agency.name}
                        </button>
                      </td>
                      <td className="hidden md:table-cell text-xs text-muted-foreground">
                        {agency.businessType === "loan_officer" ? "Loan Officer" : "Real Estate"}
                      </td>
                      <td className="hidden lg:table-cell text-xs text-muted-foreground">{agency.teamSize}</td>
                      <td>{getStatusBadge(agency.status)}</td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleViewAsClient((agency as any).clientId, (agency as any).clientName || agency.name)}
                            title="View as client"
                          >
                            <Eye className="w-3 h-3" />
                            Client View
                          </Button>
                          <Link href="/launchpad">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                              <Rocket className="w-3 h-3" />
                              Launchpad
                            </Button>
                          </Link>
                          <Link href={`/admin/agencies/${agency.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Details</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-foreground">No client accounts yet</p>
                <p className="text-xs mt-1 max-w-xs mx-auto">
                  Click <strong>New Sub-Account</strong> above to create a client account. Once created, each row will have <strong>Client View</strong> and <strong>Admin Mode</strong> buttons to log in as that client.
                </p>
                <Button
                  size="sm"
                  className="mt-4 gap-1.5"
                  onClick={() => setShowCreateModal(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Create First Client Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Oversight */}
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Content Oversight</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                {allPendingApprovals?.length || 0} pending across all clients
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {oversightLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : allPendingApprovals && allPendingApprovals.length > 0 ? (
              <div className="divide-y">
                {allPendingApprovals.slice(0, 20).map((approval: any) => (
                  <div key={approval.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{approval.brand}</Badge>
                        {approval.platform && (
                          <Badge variant="secondary" className="text-xs">{approval.platform}</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{approval.contentType}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(approval.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{approval.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{approval.content}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 gap-1"
                        disabled={adminApproveMutation.isPending}
                        onClick={() => adminApproveMutation.mutate({ approvalId: approval.id })}
                      >
                        {adminApproveMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => {
                          setOversightRejectId(approval.id);
                          setShowRejectOversightDialog(true);
                        }}
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {allPendingApprovals.length > 20 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground text-center">
                    Showing 20 of {allPendingApprovals.length} pending items
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">All content reviewed — no pending approvals</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Oversight Reject Dialog */}
        <Dialog open={showRejectOversightDialog} onOpenChange={setShowRejectOversightDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Content</DialogTitle>
              <DialogDescription>Provide feedback so the client knows what to change.</DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="e.g., The hook isn't strong enough. Try leading with a question instead..."
              value={oversightRejectFeedback}
              onChange={(e) => setOversightRejectFeedback(e.target.value)}
              rows={5}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectOversightDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={adminRejectMutation.isPending || !oversightRejectFeedback.trim()}
                onClick={() => {
                  if (oversightRejectId !== null) {
                    adminRejectMutation.mutate({ approvalId: oversightRejectId, feedback: oversightRejectFeedback });
                  }
                }}
              >
                {adminRejectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Reject with Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pending Invitations */}
        {invitations && invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                Track sub-account onboarding status and resend activation emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map((inv) => {
                  const isExpired = inv.status === "expired" || new Date() > new Date(inv.expiresAt);
                  const statusColor = inv.status === "accepted" ? "default" : isExpired ? "destructive" : "secondary";
                  const statusLabel = inv.status === "accepted" ? "✓ Activated" : isExpired ? "Expired" : "Pending";
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{inv.firstName} {inv.lastName}</span>
                          <Badge variant={statusColor} className="text-xs">{statusLabel}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{inv.role.replace("_", " ")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                        {inv.company && <p className="text-xs text-muted-foreground">{inv.company}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Invited {new Date(inv.createdAt).toLocaleDateString()} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      {inv.status !== "accepted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-3 shrink-0"
                          disabled={resendInvitation.isPending}
                          onClick={() => resendInvitation.mutate({ invitationId: inv.id, origin: window.location.origin })}
                        >
                          {resendInvitation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 mr-1" />
                          )}
                          Resend
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
