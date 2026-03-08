import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  CreditCard,
  Home,
  FileText,
  Clock,
  Plus,
  User,
  DollarSign,
  Calendar,
  Flame,
  Thermometer,
  Snowflake,
  MessageSquare,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const PIPELINE_STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-indigo-100 text-indigo-800" },
  { value: "pre_qualified", label: "Pre-Qualified", color: "bg-violet-100 text-violet-800" },
  { value: "pre_approved", label: "Pre-Approved", color: "bg-purple-100 text-purple-800" },
  { value: "house_hunting", label: "House Hunting", color: "bg-pink-100 text-pink-800" },
  { value: "under_contract", label: "Under Contract", color: "bg-orange-100 text-orange-800" },
  { value: "processing", label: "Processing", color: "bg-amber-100 text-amber-800" },
  { value: "underwriting", label: "Underwriting", color: "bg-yellow-100 text-yellow-800" },
  { value: "conditional_approval", label: "Conditional", color: "bg-lime-100 text-lime-800" },
  { value: "clear_to_close", label: "Clear to Close", color: "bg-emerald-100 text-emerald-800" },
  { value: "closed_funded", label: "Closed/Funded", color: "bg-green-100 text-green-800" },
  { value: "closed_lost", label: "Closed/Lost", color: "bg-red-100 text-red-800" },
  { value: "on_hold", label: "On Hold", color: "bg-gray-100 text-gray-800" },
  { value: "nurture", label: "Nurture", color: "bg-teal-100 text-teal-800" },
];

function getPipelineStage(status: string) {
  return PIPELINE_STAGES.find(s => s.value === status) || PIPELINE_STAGES[0];
}

function formatCurrency(val: string | number | null | undefined): string {
  if (!val) return "-";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ACTIVITY_ICONS: Record<string, any> = {
  note: MessageSquare,
  phone_call: Phone,
  email_sent: Mail,
  email_received: Mail,
  sms_sent: MessageSquare,
  status_change: CheckCircle,
  appointment_scheduled: Calendar,
  appointment_completed: CheckCircle,
  system_auto: Clock,
  follow_up_scheduled: Calendar,
  follow_up_completed: CheckCircle,
  pre_approval_issued: FileText,
  credit_pulled: CreditCard,
};

export default function BorrowerDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const borrowerId = parseInt(params.id);

  const { data, isLoading, refetch } = trpc.borrowers.get.useQuery({ id: borrowerId });
  const utils = trpc.useUtils();

  const updateMutation = trpc.borrowers.update.useMutation({
    onSuccess: () => {
      toast.success("Updated!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const addActivityMutation = trpc.borrowers.addActivity.useMutation({
    onSuccess: () => {
      toast.success("Activity logged!");
      refetch();
      setActivityNote("");
      setShowActivityDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.borrowers.delete.useMutation({
    onSuccess: () => {
      toast.success("Borrower deleted");
      setLocation("/borrowers");
    },
    onError: (err) => toast.error(err.message),
  });

  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [activityType, setActivityType] = useState<string>("note");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityNote, setActivityNote] = useState("");

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data?.borrower) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Borrower not found</h2>
          <Button onClick={() => setLocation("/borrowers")}>Back to Database</Button>
        </div>
      </DashboardLayout>
    );
  }

  const b = data.borrower;
  const activities = data.activities || [];
  const stage = getPipelineStage(b.pipelineStatus);

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({ id: borrowerId, pipelineStatus: newStatus as any });
  };

  const handleAddActivity = () => {
    if (!activityTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    addActivityMutation.mutate({
      borrowerId,
      activityType: activityType as any,
      title: activityTitle,
      description: activityNote || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/borrowers")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{b.firstName} {b.lastName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${stage.color} border-0`}>{stage.label}</Badge>
                {b.scoreTier === "hot" && <Badge className="bg-red-100 text-red-800 border-0"><Flame className="h-3 w-3 mr-1" />Hot</Badge>}
                {b.scoreTier === "warm" && <Badge className="bg-orange-100 text-orange-800 border-0"><Thermometer className="h-3 w-3 mr-1" />Warm</Badge>}
                {b.scoreTier === "cold" && <Badge className="bg-blue-100 text-blue-800 border-0"><Snowflake className="h-3 w-3 mr-1" />Cold</Badge>}
                {b.isFirstTimeBuyer && <Badge variant="outline" className="text-xs">First-Time Buyer</Badge>}
                {b.isVaEligible && <Badge variant="outline" className="text-xs">VA Eligible</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation(`/borrowers/${borrowerId}/edit`)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
            {user?.role === "admin" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Delete this borrower? This cannot be undone.")) {
                    deleteMutation.mutate({ id: borrowerId });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Loan Amount</p>
                  <p className="font-bold text-sm">{formatCurrency(b.desiredLoanAmount)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <CreditCard className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Credit Score</p>
                  <p className="font-bold text-sm">{b.creditScoreExact || (b.creditScoreRange?.replace(/_/g, "-") || "-")}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <Home className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Loan Type</p>
                  <p className="font-bold text-sm capitalize">{b.loanType?.replace(/_/g, " ") || "-"}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <Calendar className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Timeline</p>
                  <p className="font-bold text-sm capitalize">{b.purchaseTimeline?.replace(/_/g, " ") || "-"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline Status Selector */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Pipeline Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={b.pipelineStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Tabs for detailed info */}
            <Tabs defaultValue="contact" className="space-y-4">
              <TabsList>
                <TabsTrigger value="contact"><User className="h-3 w-3 mr-1" /> Contact</TabsTrigger>
                <TabsTrigger value="financial"><CreditCard className="h-3 w-3 mr-1" /> Financial</TabsTrigger>
                <TabsTrigger value="loan"><FileText className="h-3 w-3 mr-1" /> Loan</TabsTrigger>
                <TabsTrigger value="property"><Home className="h-3 w-3 mr-1" /> Property</TabsTrigger>
              </TabsList>

              <TabsContent value="contact">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <InfoRow icon={Phone} label="Phone" value={formatPhone(b.phone)} />
                    {b.secondaryPhone && <InfoRow icon={Phone} label="Secondary" value={formatPhone(b.secondaryPhone)} />}
                    <InfoRow icon={Mail} label="Email" value={b.email || "-"} />
                    <InfoRow icon={MapPin} label="Address" value={[b.currentAddress, b.city, b.state, b.zipCode].filter(Boolean).join(", ") || "-"} />
                    <InfoRow icon={User} label="Marital Status" value={b.maritalStatus?.replace(/_/g, " ") || "-"} />
                    <InfoRow icon={User} label="Contact Preference" value={b.preferredContactMethod || "-"} />
                    <InfoRow icon={Home} label="Housing Status" value={b.housingStatus?.replace(/_/g, " ") || "-"} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <InfoRow icon={Briefcase} label="Employment" value={`${b.employmentStatus?.replace(/_/g, " ") || "-"} ${b.employer ? `at ${b.employer}` : ""}`} />
                    <InfoRow icon={Briefcase} label="Job Title" value={b.jobTitle || "-"} />
                    <InfoRow icon={DollarSign} label="Monthly Income" value={formatCurrency(b.monthlyIncome)} />
                    <InfoRow icon={DollarSign} label="Annual Income" value={formatCurrency(b.annualIncome)} />
                    <InfoRow icon={CreditCard} label="Credit Score" value={b.creditScoreExact ? String(b.creditScoreExact) : (b.creditScoreRange?.replace(/_/g, "-") || "-")} />
                    <InfoRow icon={DollarSign} label="Total Debt" value={formatCurrency(b.totalDebt)} />
                    <InfoRow icon={DollarSign} label="Monthly Debt" value={formatCurrency(b.monthlyDebtPayments)} />
                    <InfoRow icon={DollarSign} label="Savings" value={formatCurrency(b.savingsAmount)} />
                    <InfoRow icon={DollarSign} label="Down Payment" value={`${formatCurrency(b.downPaymentAmount)} ${b.downPaymentSource ? `(${b.downPaymentSource.replace(/_/g, " ")})` : ""}`} />
                    {b.bankruptcyHistory && <InfoRow icon={AlertTriangle} label="Bankruptcy" value="Yes" />}
                    {b.foreclosureHistory && <InfoRow icon={AlertTriangle} label="Foreclosure" value="Yes" />}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="loan">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <InfoRow icon={FileText} label="Purpose" value={b.loanPurpose?.replace(/_/g, " ") || "-"} />
                    <InfoRow icon={FileText} label="Type" value={b.loanType?.replace(/_/g, " ") || "-"} />
                    <InfoRow icon={DollarSign} label="Desired Amount" value={formatCurrency(b.desiredLoanAmount)} />
                    <InfoRow icon={DollarSign} label="Property Value" value={formatCurrency(b.estimatedPropertyValue)} />
                    <InfoRow icon={FileText} label="Term" value={b.loanTerm?.replace(/_/g, " ") || "-"} />
                    <InfoRow icon={FileText} label="Rate Quoted" value={b.interestRateQuoted ? `${b.interestRateQuoted}%` : "-"} />
                    <InfoRow icon={CheckCircle} label="Pre-Approved" value={b.isPreApproved ? `Yes - ${formatCurrency(b.preApprovalAmount)}` : "No"} />
                    <InfoRow icon={CheckCircle} label="DPA Eligible" value={b.isDpaEligible ? `Yes - ${b.dpaProgram || ""}` : "No"} />
                    {b.currentLender && (
                      <>
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">CURRENT MORTGAGE</p>
                        </div>
                        <InfoRow icon={Home} label="Lender" value={b.currentLender} />
                        <InfoRow icon={DollarSign} label="Balance" value={formatCurrency(b.currentLoanBalance)} />
                        <InfoRow icon={FileText} label="Rate" value={b.currentInterestRate ? `${b.currentInterestRate}%` : "-"} />
                        <InfoRow icon={DollarSign} label="Payment" value={formatCurrency(b.currentMonthlyPayment)} />
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="property">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <InfoRow icon={Home} label="Type" value={b.propertyType?.replace(/_/g, " ") || "-"} />
                    <InfoRow icon={Home} label="Use" value={b.propertyUse?.replace(/_/g, " ") || "-"} />
                    <InfoRow icon={MapPin} label="Address" value={[b.targetPropertyAddress, b.targetCity, b.targetState, b.targetZipCode].filter(Boolean).join(", ") || "-"} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Notes */}
            {b.internalNotes && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{b.internalNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Activity Timeline */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Activity Timeline</CardTitle>
                <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" /> Log
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Log Activity</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Type</Label>
                        <Select value={activityType} onValueChange={setActivityType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="phone_call">Phone Call</SelectItem>
                            <SelectItem value="email_sent">Email Sent</SelectItem>
                            <SelectItem value="sms_sent">SMS Sent</SelectItem>
                            <SelectItem value="appointment_scheduled">Appointment Scheduled</SelectItem>
                            <SelectItem value="follow_up_scheduled">Follow-Up Scheduled</SelectItem>
                            <SelectItem value="follow_up_completed">Follow-Up Completed</SelectItem>
                            <SelectItem value="credit_pulled">Credit Pulled</SelectItem>
                            <SelectItem value="pre_approval_issued">Pre-Approval Issued</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Title *</Label>
                        <Input value={activityTitle} onChange={e => setActivityTitle(e.target.value)} placeholder="Brief description..." />
                      </div>
                      <div>
                        <Label>Details</Label>
                        <Textarea value={activityNote} onChange={e => setActivityNote(e.target.value)} rows={3} placeholder="Additional details..." />
                      </div>
                      <Button onClick={handleAddActivity} disabled={addActivityMutation.isPending} className="w-full">
                        {addActivityMutation.isPending ? "Saving..." : "Log Activity"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No activities yet
                  </div>
                ) : (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {activities.map((act: any) => {
                      const Icon = ACTIVITY_ICONS[act.activityType] || Clock;
                      return (
                        <div key={act.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                              <Icon className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{act.title}</p>
                              {act.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{act.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(act.activityDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Source Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Source & Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="capitalize">{b.leadSource?.replace(/_/g, " ") || "-"}</span>
                </div>
                {b.leadSourceDetail && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Detail</span>
                    <span>{b.leadSourceDetail}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(b.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span>{formatDate(b.lastContactedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Follow-Up</span>
                  <span>{formatDate(b.nextFollowUpDate)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Referral Partner */}
            {data.referralPartner && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Referral Partner</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-sm">{data.referralPartner.firstName} {data.referralPartner.lastName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{data.referralPartner.partnerType.replace(/_/g, " ")}</p>
                  {data.referralPartner.company && <p className="text-xs text-muted-foreground">{data.referralPartner.company}</p>}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper component for info rows
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}
