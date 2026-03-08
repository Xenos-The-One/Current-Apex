import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Handshake,
  Plus,
  Search,
  Users,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  Building2,
  Star,
  ChevronRight,
  Edit,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const PARTNER_TYPES = [
  { value: "real_estate_agent", label: "Real Estate Agent" },
  { value: "real_estate_broker", label: "Real Estate Broker" },
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "insurance_agent", label: "Insurance Agent" },
  { value: "attorney", label: "Attorney" },
  { value: "cpa", label: "CPA" },
  { value: "builder", label: "Builder" },
  { value: "past_client", label: "Past Client" },
  { value: "other", label: "Other" },
];

const RELATIONSHIP_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
  { value: "vip", label: "VIP", color: "bg-purple-100 text-purple-800" },
  { value: "inactive", label: "Inactive", color: "bg-gray-100 text-gray-800" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800" },
];

function getRelStatus(status: string) {
  return RELATIONSHIP_STATUSES.find(s => s.value === status) || RELATIONSHIP_STATUSES[0];
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

export default function ReferralPartners() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const listInput = useMemo(() => ({
    search: search || undefined,
    partnerType: typeFilter !== "all" ? typeFilter : undefined,
    relationshipStatus: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100,
    offset: 0,
  }), [search, typeFilter, statusFilter]);

  const { data: listData, isLoading, refetch } = trpc.referralPartners.list.useQuery(listInput);
  const { data: stats } = trpc.referralPartners.stats.useQuery();

  const partners = listData?.partners || [];
  const total = listData?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Handshake className="h-6 w-6 text-primary" />
              Referral Partners
            </h1>
            <p className="text-muted-foreground mt-1">
              {total} partner{total !== 1 ? "s" : ""} in your network
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Referral Partner</DialogTitle>
              </DialogHeader>
              <AddPartnerForm
                onSuccess={() => {
                  setShowAddDialog(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Partners</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Total Referrals</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.totalReferrals}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Closed Referrals</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.totalClosedReferrals}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Referral Volume</span>
                </div>
                <p className="text-lg font-bold mt-1">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(stats.totalVolume)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Partner Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PARTNER_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {RELATIONSHIP_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Partners Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Loading partners...</p>
            </CardContent>
          </Card>
        ) : partners.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Handshake className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No referral partners yet</h3>
              <p className="text-muted-foreground mb-4">Build your referral network by adding real estate agents, financial advisors, and other partners.</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add First Partner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((p: any) => {
                    const relStatus = getRelStatus(p.relationshipStatus);
                    const typeLabel = PARTNER_TYPES.find(t => t.value === p.partnerType)?.label || p.partnerType;
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setLocation(`/referral-partners/${p.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.firstName} {p.lastName}</p>
                            {p.title && <p className="text-xs text-muted-foreground">{p.title}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {p.company && <Building2 className="h-3 w-3 text-muted-foreground" />}
                            <span className="text-sm">{p.company || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {p.phone && (
                              <div className="flex items-center gap-1 text-xs">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{formatPhone(p.phone)}</span>
                              </div>
                            )}
                            {p.email && (
                              <div className="flex items-center gap-1 text-xs">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[160px]">{p.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${relStatus.color} text-xs border-0`}>
                            {relStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{p.totalReferrals || 0}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({p.closedReferrals || 0} closed)
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============= ADD PARTNER FORM =============
function AddPartnerForm({ onSuccess }: { onSuccess: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [partnerType, setPartnerType] = useState<string>("real_estate_agent");
  const [relationshipStatus, setRelationshipStatus] = useState<string>("new");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.referralPartners.create.useMutation({
    onSuccess: () => {
      toast.success("Partner added!");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      toast.error("First and last name are required");
      return;
    }
    createMutation.mutate({
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      company: company || null,
      title: title || null,
      partnerType: partnerType as any,
      relationshipStatus: relationshipStatus as any,
      licenseNumber: licenseNumber || null,
      internalNotes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>First Name *</Label>
          <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
        </div>
        <div>
          <Label>Last Name *</Label>
          <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label>Partner Type *</Label>
        <Select value={partnerType} onValueChange={setPartnerType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PARTNER_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Company</Label>
          <Input value={company} onChange={e => setCompany(e.target.value)} />
        </div>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>License #</Label>
          <Input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
        </div>
        <div>
          <Label>Relationship Status</Label>
          <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Internal notes about this partner..." />
      </div>
      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Adding..." : "Add Partner"}
      </Button>
    </form>
  );
}
