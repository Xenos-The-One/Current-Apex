import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Handshake,
  Users,
  DollarSign,
  Star,
  Edit,
  Trash2,
  ChevronRight,
  FileText,
  MapPin,
  ExternalLink,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { useLocation, useParams, Link } from "wouter";
import { toast } from "sonner";

const PARTNER_TYPES: Record<string, string> = {
  real_estate_agent: "Real Estate Agent",
  real_estate_broker: "Real Estate Broker",
  financial_advisor: "Financial Advisor",
  insurance_agent: "Insurance Agent",
  attorney: "Attorney",
  cpa: "CPA",
  builder: "Builder",
  past_client: "Past Client",
  other: "Other",
};

const RELATIONSHIP_STATUSES: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800" },
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  vip: { label: "VIP", color: "bg-purple-100 text-purple-800" },
  inactive: { label: "Inactive", color: "bg-gray-100 text-gray-800" },
  lost: { label: "Lost", color: "bg-red-100 text-red-800" },
};

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatCurrency(val: string | number | null | undefined): string {
  if (!val) return "-";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReferralPartnerDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const partnerId = parseInt(params.id);

  const { data, isLoading } = trpc.referralPartners.get.useQuery({ id: partnerId });

  const deleteMutation = trpc.referralPartners.delete.useMutation({
    onSuccess: () => {
      toast.success("Partner deleted");
      setLocation("/referral-partners");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data?.partner) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Partner not found</h2>
          <Button onClick={() => setLocation("/referral-partners")}>Back to Partners</Button>
        </div>
      </DashboardLayout>
    );
  }

  const p = data.partner;
  const referredBorrowers = data.referredBorrowers || [];
  const relStatus = RELATIONSHIP_STATUSES[p.relationshipStatus] || RELATIONSHIP_STATUSES.new;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/referral-partners")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{p.firstName} {p.lastName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{PARTNER_TYPES[p.partnerType] || p.partnerType}</Badge>
                <Badge className={`${relStatus.color} border-0 text-xs`}>{relStatus.label}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PortalLinkButton partnerId={partnerId} />
            {user?.role === "admin" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Delete this partner?")) {
                    deleteMutation.mutate({ id: partnerId });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold">{p.totalReferrals || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Closed</p>
                  <p className="text-2xl font-bold">{p.closedReferrals || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="text-lg font-bold">{formatCurrency(p.totalReferralVolume)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Referred Borrowers */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Referred Borrowers ({referredBorrowers.length})</CardTitle>
              </CardHeader>
              {referredBorrowers.length === 0 ? (
                <CardContent className="text-center py-8 text-sm text-muted-foreground">
                  No borrowers referred yet
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Pipeline</TableHead>
                        <TableHead>Loan Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referredBorrowers.map((b: any) => (
                        <TableRow
                          key={b.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/borrowers/${b.id}`)}
                        >
                          <TableCell className="font-medium">{b.firstName} {b.lastName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {b.pipelineStatus?.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(b.desiredLoanAmount)}</TableCell>
                          <TableCell className="text-sm">{formatDate(b.createdAt)}</TableCell>
                          <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>

          {/* Right - Contact Info */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatPhone(p.phone)}</span>
                  </div>
                )}
                {p.secondaryPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatPhone(p.secondaryPhone)}</span>
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{p.email}</span>
                  </div>
                )}
                {p.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{p.company}</span>
                  </div>
                )}
                {p.brokerage && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Brokerage: {p.brokerage}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.licenseNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License #</span>
                    <span>{p.licenseNumber}</span>
                  </div>
                )}
                {p.licenseState && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License State</span>
                    <span>{p.licenseState}</span>
                  </div>
                )}
                {p.nmls && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NMLS</span>
                    <span>{p.nmls}</span>
                  </div>
                )}
                {p.yearsInBusiness && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Years in Business</span>
                    <span>{p.yearsInBusiness}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Relationship Since</span>
                  <span>{formatDate(p.relationshipStartDate)}</span>
                </div>
              </CardContent>
            </Card>

            {p.referralFeeType && p.referralFeeType !== "none" && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Referral Agreement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee Type</span>
                    <span className="capitalize">{p.referralFeeType.replace(/_/g, " ")}</span>
                  </div>
                  {p.referralFeeAmount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span>{p.referralFeeType === "percentage" ? `${p.referralFeeAmount}%` : formatCurrency(p.referralFeeAmount)}</span>
                    </div>
                  )}
                  {p.commissionSplit && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission Split</span>
                      <span>{p.commissionSplit}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {p.internalNotes && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{p.internalNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function PortalLinkButton({ partnerId }: { partnerId: number }) {
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.publicFeatures.generatePartnerToken.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.portalUrl}`;
      setPortalUrl(fullUrl);
      toast.success("Partner portal link generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const copyUrl = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Portal link copied to clipboard!");
  };

  if (portalUrl) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={copyUrl}>
          {copied ? <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-500" /> : <Copy className="h-4 w-4 mr-1" />}
          {copied ? "Copied!" : "Copy Link"}
        </Button>
        <a href={portalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => generateMutation.mutate({ partnerId })}
      disabled={generateMutation.isPending}
    >
      {generateMutation.isPending ? (
        <><div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />Generating...</>
      ) : (
        <><ExternalLink className="h-4 w-4 mr-1" />Partner Portal Link</>
      )}
    </Button>
  );
}
