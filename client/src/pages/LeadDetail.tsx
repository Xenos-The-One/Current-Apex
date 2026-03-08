import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MessageSquare,
  Clock,
  CheckCircle2,
  FileText,
  UserPlus,
  Loader2,
  PhoneCall,
  Calendar,
  Sparkles,
  Search,
  ExternalLink,
  FlaskConical,
  TrendingDown,
  CheckCheck,
  XCircle,
  DollarSign,
  Percent,
  UserCheck,
  Briefcase,
  Building2,
  Edit,
  Save,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import LoanMilestoneTracker from "@/components/LoanMilestoneTracker";
import LeadTaskManager from "@/components/LeadTaskManager";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function LeadDetail() {
  const [, params] = useRoute("/leads/:id");
  const leadId = params?.id ? parseInt(params.id) : 0;
  const [, navigate] = useLocation();
  
  const utils = trpc.useUtils();
  const { data: clientInfo } = trpc.crm.getMyInfo.useQuery();
  const { data: lead, isLoading } = trpc.crm.getLead.useQuery({ leadId });
  const { data: activities } = trpc.crm.getLeadActivities.useQuery({ leadId });
  
  const [newNote, setNewNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertLoanType, setConvertLoanType] = useState("");
  const [convertLoanPurpose, setConvertLoanPurpose] = useState("");
  const [convertNotes, setConvertNotes] = useState("");

  // Refi Drip state
  const { data: refiStatus, refetch: refetchRefiStatus } = trpc.leads.getRefiDripStatus.useQuery(
    { leadId },
    { enabled: leadId > 0 }
  );

  const tagRefiMutation = trpc.leads.tagRefiProspect.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchRefiStatus();
      utils.crm.getLead.invalidate({ leadId });
      utils.crm.getLeadActivities.invalidate({ leadId });
    },
    onError: (err) => toast.error(err.message),
  });

  const untagRefiMutation = trpc.leads.untagRefiProspect.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchRefiStatus();
      utils.crm.getLead.invalidate({ leadId });
      utils.crm.getLeadActivities.invalidate({ leadId });
    },
    onError: (err) => toast.error(err.message),
  });

  // Log Call state
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callOutcome, setCallOutcome] = useState("");
  const [callDurationMin, setCallDurationMin] = useState("");
  const [callDurationSec, setCallDurationSec] = useState("");
  const [callNotes, setCallNotes] = useState("");

  // Book Appointment state
  const [bookApptOpen, setBookApptOpen] = useState(false);
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptType, setApptType] = useState("consultation");
  const [apptDuration, setApptDuration] = useState("30");
  const [apptNotes, setApptNotes] = useState("");

  const isReadOnly = clientInfo?.client.accessMode === "read_only";

  // SEO state
  const [seoNiche, setSeoNiche] = useState("");
  const [seoContentType, setSeoContentType] = useState<"blog-post" | "how-to" | "listicle" | "guide" | "newsletter" | "email-sequence" | "social-post" | "landing-page" | "video-script" | "case-study">("blog-post");
  const [generatedSeoContent, setGeneratedSeoContent] = useState<{ title: string; content: string; contentId: number | null } | null>(null);
  const [seoSuggestions, setSeoSuggestions] = useState<Array<{ topic: string; contentType: string; rationale: string }>>([]);
  const [seoSuggestionsLoaded, setSeoSuggestionsLoaded] = useState(false);

  const generateSeoContent = trpc.seoBridge.generateForLead.useMutation({
    onSuccess: (data) => { setGeneratedSeoContent(data); toast.success("SEO content generated!"); },
    onError: (err) => toast.error(err.message),
  });

  const suggestNiches = trpc.seoBridge.suggestNichesForLead.useMutation({
    onSuccess: (data) => { setSeoSuggestions(data); setSeoSuggestionsLoaded(true); },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.crm.updateLeadStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.crm.getLead.invalidate({ leadId });
      utils.crm.getLeadActivities.invalidate({ leadId });
      utils.crm.listMyLeads.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateLeadMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead updated");
      utils.crm.getLead.invalidate({ leadId });
    },
    onError: (error) => toast.error(error.message),
  });

  const convertToBorrower = trpc.borrowers.convertFromLead.useMutation({
    onSuccess: (data) => {
      toast.success("Lead converted to borrower successfully!");
      setConvertOpen(false);
      navigate(`/borrowers/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConvert = () => {
    convertToBorrower.mutate({
      leadId,
      loanType: convertLoanType ? convertLoanType as any : undefined,
      loanPurpose: convertLoanPurpose ? convertLoanPurpose as any : undefined,
      internalNotes: convertNotes || undefined,
    });
  };

  const addNote = trpc.crm.addLeadNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      setNewNote("");
      utils.crm.getLeadActivities.invalidate({ leadId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const logCall = trpc.crm.logCall.useMutation({
    onSuccess: () => {
      toast.success("Call logged successfully");
      setLogCallOpen(false);
      setCallOutcome("");
      setCallDurationMin("");
      setCallDurationSec("");
      setCallNotes("");
      utils.crm.getLeadActivities.invalidate({ leadId });
      utils.crm.getLead.invalidate({ leadId });
      utils.crm.listMyLeads.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bookAppointment = trpc.crm.bookLeadAppointment.useMutation({
    onSuccess: () => {
      toast.success("Appointment booked!");
      setBookApptOpen(false);
      setApptDate("");
      setApptTime("");
      setApptType("consultation");
      setApptDuration("30");
      setApptNotes("");
      utils.crm.getLeadActivities.invalidate({ leadId });
      utils.crm.getLead.invalidate({ leadId });
      utils.crm.listMyLeads.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ leadId, status: status as any });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error("Note cannot be empty");
      return;
    }
    addNote.mutate({ leadId, note: newNote });
  };

  const handleLogCall = () => {
    if (!callOutcome) {
      toast.error("Please select a call outcome");
      return;
    }
    const durationSeconds = (parseInt(callDurationMin || "0") * 60) + parseInt(callDurationSec || "0");
    logCall.mutate({
      leadId,
      outcome: callOutcome as any,
      duration: durationSeconds > 0 ? durationSeconds : undefined,
      notes: callNotes || undefined,
    });
  };

  const handleBookAppointment = () => {
    if (!apptDate || !apptTime) {
      toast.error("Please select a date and time");
      return;
    }
    const appointmentDate = new Date(`${apptDate}T${apptTime}`);
    if (appointmentDate <= new Date()) {
      toast.error("Appointment must be in the future");
      return;
    }
    bookAppointment.mutate({
      leadId,
      appointmentDate,
      appointmentType: apptType as any,
      duration: parseInt(apptDuration),
      notes: apptNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle>Lead Not Found</CardTitle>
            <CardDescription>The lead you're looking for doesn't exist or you don't have access.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/leads">
              <Button>Back to Leads</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-warning text-warning-foreground";
      case "contacted":
        return "bg-primary text-primary-foreground";
      case "qualified":
        return "bg-info text-info-foreground";
      case "appointment_set":
      case "appointment_completed":
        return "bg-purple-500 text-white";
      case "closed_won":
        return "bg-success text-success-foreground";
      case "closed_lost":
        return "bg-destructive text-destructive-foreground";
      default:
        return "";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "note":
        return <FileText className="w-4 h-4" />;
      case "status_change":
        return <CheckCircle2 className="w-4 h-4" />;
      case "appointment":
        return <Calendar className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {lead.firstName} {lead.lastName}
            </h1>
            <p className="text-muted-foreground">
              Added {new Date(lead.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge className={getStatusColor(lead.status)}>
            {lead.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column - Lead Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Loan / Deal Details Card */}
            <Card className="border-emerald-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  {(lead as any).contactType && (lead as any).contactType !== 'borrower' ? 'Partnership Details' : 'Loan Details'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(lead as any).loanAmount && parseFloat(String((lead as any).loanAmount)) > 0 && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Loan Amount</p>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(parseFloat(String((lead as any).loanAmount)))}
                      </p>
                    </div>
                  )}
                  {(lead as any).loanType && (
                    <div className="p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Loan Type</p>
                      <p className="text-sm font-medium capitalize">{String((lead as any).loanType).replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {(lead as any).probability != null && (lead as any).probability > 0 && (
                    <div className="p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Probability</p>
                      <p className="text-sm font-bold">{(lead as any).probability}%</p>
                    </div>
                  )}
                  {(lead as any).contactType && (
                    <div className="p-2.5 bg-violet-50 dark:bg-violet-950/30 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contact Type</p>
                      <p className="text-sm font-medium capitalize">{String((lead as any).contactType).replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {(lead as any).partnerTier && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Partner Tier</p>
                      <p className="text-sm font-medium capitalize">{(lead as any).partnerTier}</p>
                    </div>
                  )}
                  {(lead as any).assignedToUserId && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Team Member #{(lead as any).assignedToUserId}
                      </p>
                    </div>
                  )}
                </div>
                {!(lead as any).loanAmount && !(lead as any).probability && !(lead as any).loanType && (
                  <p className="text-sm text-muted-foreground text-center py-3">No deal details yet. Edit the lead to add loan amount, probability, and more.</p>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">First Name</Label>
                    <p className="font-medium">{lead.firstName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Name</Label>
                    <p className="font-medium">{lead.lastName}</p>
                  </div>
                </div>
                {lead.email && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${lead.email}`} className="hover:underline">
                        {lead.email}
                      </a>
                    </p>
                  </div>
                )}
                {lead.phone && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${lead.phone}`} className="hover:underline">
                        {lead.phone}
                      </a>
                    </p>
                  </div>
                )}
                {lead.source && (
                  <div>
                    <Label className="text-muted-foreground">Lead Source</Label>
                    <Badge variant="outline">{lead.source}</Badge>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <Label className="text-muted-foreground">Initial Notes</Label>
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-amber-500" />
                    <div>
                      <Label className="text-sm font-medium">Test Lead</Label>
                      <p className="text-xs text-muted-foreground">Suppresses all emails, SMS, and Vapi calls</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!lead.isTest}
                    onCheckedChange={(checked) => {
                      updateLeadMutation.mutate({ leadId: lead.id, isTest: checked });
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>All interactions and updates for this lead</CardDescription>
              </CardHeader>
              <CardContent>
                {activities && activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {getActivityIcon(activity.activityType)}
                          </div>
                          <div className="w-0.5 h-full bg-border mt-2" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {activity.activityType.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(activity.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-line">{activity.description}</p>
                          {activity.callDuration && activity.callDuration > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.floor(activity.callDuration / 60)}m {activity.callDuration % 60}s
                            </p>
                          )}
                          {activity.vapiCallId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Call ID: {activity.vapiCallId}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No activity yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Quick Actions - Call & Log */}
            {!isReadOnly && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <PhoneCall className="w-5 h-5 text-primary" />
                    Call Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.phone && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 font-semibold shadow-lg"
                      onClick={() => {
                        setCallStarted(true);
                        setCallStartTime(Date.now());
                        window.location.href = `tel:${lead.phone}`;
                        // Auto-open Log Call dialog after a short delay
                        // giving time for the phone app to open
                        setTimeout(() => {
                          setLogCallOpen(true);
                        }, 2000);
                      }}
                    >
                      <Phone className="w-5 h-5 mr-2" />
                      {callStarted ? "Call Again" : "Call Now"}
                    </Button>
                  )}
                  {callStarted && callStartTime && (
                    <p className="text-xs text-center text-muted-foreground">
                      Last call started at {new Date(callStartTime).toLocaleTimeString()}
                    </p>
                  )}

                  {/* Log Call Dialog */}
                  <Dialog open={logCallOpen} onOpenChange={setLogCallOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Log Call
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Call with {lead.firstName}</DialogTitle>
                        <DialogDescription>
                          Record the outcome of your call with this lead.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div>
                          <Label>Call Outcome *</Label>
                          <Select value={callOutcome} onValueChange={setCallOutcome}>
                            <SelectTrigger>
                              <SelectValue placeholder="What happened?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="connected">Connected - Spoke with lead</SelectItem>
                              <SelectItem value="no_answer">No Answer</SelectItem>
                              <SelectItem value="voicemail">Left Voicemail</SelectItem>
                              <SelectItem value="busy">Line Busy</SelectItem>
                              <SelectItem value="wrong_number">Wrong Number</SelectItem>
                              <SelectItem value="callback_requested">Callback Requested</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Call Duration (optional)</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              placeholder="Min"
                              min="0"
                              max="999"
                              value={callDurationMin}
                              onChange={(e) => setCallDurationMin(e.target.value)}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">min</span>
                            <Input
                              type="number"
                              placeholder="Sec"
                              min="0"
                              max="59"
                              value={callDurationSec}
                              onChange={(e) => setCallDurationSec(e.target.value)}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">sec</span>
                          </div>
                        </div>
                        <div>
                          <Label>Call Notes</Label>
                          <Textarea
                            placeholder="What did you discuss? Any follow-up needed?"
                            value={callNotes}
                            onChange={(e) => setCallNotes(e.target.value)}
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLogCallOpen(false)}>Cancel</Button>
                        <Button
                          onClick={handleLogCall}
                          disabled={!callOutcome || logCall.isPending}
                        >
                          {logCall.isPending ? (
                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</>
                          ) : (
                            <><PhoneCall className="w-4 h-4 mr-1" /> Log Call</>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            {/* Book Appointment */}
            {!isReadOnly && (
              <Card className="border-purple-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.appointmentBookedAt ? (
                    <div className="text-center py-2">
                      <Badge className="bg-purple-500 text-white mb-2">Appointment Set</Badge>
                      {lead.appointmentDate && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(lead.appointmentDate).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Dialog open={bookApptOpen} onOpenChange={setBookApptOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                          <Calendar className="w-4 h-4 mr-2" />
                          Book Appointment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Book Appointment with {lead.firstName}</DialogTitle>
                          <DialogDescription>
                            Schedule a consultation or follow-up appointment.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Date *</Label>
                              <Input
                                type="date"
                                value={apptDate}
                                onChange={(e) => setApptDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div>
                              <Label>Time *</Label>
                              <Input
                                type="time"
                                value={apptTime}
                                onChange={(e) => setApptTime(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Type</Label>
                              <Select value={apptType} onValueChange={setApptType}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="consultation">Consultation</SelectItem>
                                  <SelectItem value="application">Application</SelectItem>
                                  <SelectItem value="closing">Closing</SelectItem>
                                  <SelectItem value="follow_up">Follow Up</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Duration</Label>
                              <Select value={apptDuration} onValueChange={setApptDuration}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="15">15 min</SelectItem>
                                  <SelectItem value="30">30 min</SelectItem>
                                  <SelectItem value="45">45 min</SelectItem>
                                  <SelectItem value="60">1 hour</SelectItem>
                                  <SelectItem value="90">1.5 hours</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label>Notes</Label>
                            <Textarea
                              placeholder="Any details about the appointment..."
                              value={apptNotes}
                              onChange={(e) => setApptNotes(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setBookApptOpen(false)}>Cancel</Button>
                          <Button
                            onClick={handleBookAppointment}
                            disabled={!apptDate || !apptTime || bookAppointment.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {bookAppointment.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Booking...</>
                            ) : (
                              <><Calendar className="w-4 h-4 mr-1" /> Book Appointment</>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Refi Drip Campaign */}
            {!isReadOnly && lead.email && (
              <Card className="border-orange-400/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-orange-500" />
                    Refi Drip Campaign
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {refiStatus?.isRefiProspect ? (
                    <>
                      {/* Active drip status */}
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-orange-800 dark:text-orange-300">14-Day Drip Active</span>
                          {refiStatus.completedAt ? (
                            <Badge className="bg-green-500 text-white text-xs">
                              <CheckCheck className="w-3 h-3 mr-1" /> Complete
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-500 text-white text-xs">
                              Step {refiStatus.currentStep}/4
                            </Badge>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-orange-200 dark:bg-orange-900 rounded-full h-2 mb-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${refiStatus.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-orange-700 dark:text-orange-400 space-y-1">
                          {refiStatus.dripStartedAt && (
                            <p>Started: {new Date(refiStatus.dripStartedAt).toLocaleDateString()}</p>
                          )}
                          {refiStatus.nextStepLabel && refiStatus.nextStepDue && !refiStatus.completedAt && (
                            <p>Next: <span className="font-medium">{refiStatus.nextStepLabel}</span> on {new Date(refiStatus.nextStepDue).toLocaleDateString()}</p>
                          )}
                          {refiStatus.completedAt && (
                            <p>Completed: {new Date(refiStatus.completedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                        {/* Step checklist */}
                        <div className="mt-3 space-y-1">
                          {[
                            { step: 1, label: "Day 0 — Rate Drop Alert" },
                            { step: 2, label: "Day 3 — Follow-Up" },
                            { step: 3, label: "Day 7 — Social Proof" },
                            { step: 4, label: "Day 14 — Urgency Close" },
                          ].map(({ step, label }) => (
                            <div key={step} className="flex items-center gap-2 text-xs">
                              {(refiStatus.currentStep ?? 0) >= step ? (
                                <CheckCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-orange-400 flex-shrink-0" />
                              )}
                              <span className={(refiStatus.currentStep ?? 0) >= step ? "text-green-700 dark:text-green-400 line-through" : "text-orange-700 dark:text-orange-400"}>
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => untagRefiMutation.mutate({ leadId })}
                        disabled={untagRefiMutation.isPending}
                      >
                        {untagRefiMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Stopping...</>
                        ) : (
                          <><XCircle className="w-4 h-4 mr-2" /> Stop Drip Sequence</>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Tag this lead as a Refi Prospect to start the automated 14-day email sequence:
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1 pl-2 border-l-2 border-orange-300">
                        <p>📧 Day 0 — Rate Drop Alert</p>
                        <p>📧 Day 3 — Follow-Up</p>
                        <p>📧 Day 7 — Social Proof</p>
                        <p>📧 Day 14 — Urgency Close</p>
                      </div>
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => tagRefiMutation.mutate({ leadId })}
                        disabled={tagRefiMutation.isPending}
                      >
                        {tagRefiMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting Drip...</>
                        ) : (
                          <><TrendingDown className="w-4 h-4 mr-2" /> Start Refi Drip Sequence</>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Status Update */}
            {!isReadOnly && (
              <Card>
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select 
                    value={selectedStatus || lead.status} 
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="appointment_set">Appointment Set</SelectItem>
                      <SelectItem value="appointment_completed">Appointment Completed</SelectItem>
                      <SelectItem value="closed_won">Closed Won</SelectItem>
                      <SelectItem value="closed_lost">Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleStatusChange(selectedStatus || lead.status)}
                    disabled={!selectedStatus || selectedStatus === lead.status || updateStatus.isPending}
                    className="w-full"
                  >
                    Update Status
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Add Note */}
            {!isReadOnly && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter your note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addNote.isPending}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Add Note
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* More Actions */}
            <Card>
              <CardHeader>
                <CardTitle>More Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lead.email && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`mailto:${lead.email}`}>
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </a>
                  </Button>
                )}

                {/* Convert to Borrower */}
                <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Convert to Borrower
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convert Lead to Borrower</DialogTitle>
                      <DialogDescription>
                        This will create a new borrower record for {lead.firstName} {lead.lastName} with their lead data pre-filled. The original lead will be linked.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label>Loan Type (optional)</Label>
                        <Select value={convertLoanType} onValueChange={setConvertLoanType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select loan type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conventional">Conventional</SelectItem>
                            <SelectItem value="fha">FHA</SelectItem>
                            <SelectItem value="va">VA</SelectItem>
                            <SelectItem value="usda">USDA</SelectItem>
                            <SelectItem value="jumbo">Jumbo</SelectItem>
                            <SelectItem value="non_qm">Non-QM</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Loan Purpose (optional)</Label>
                        <Select value={convertLoanPurpose} onValueChange={setConvertLoanPurpose}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="purchase">Purchase</SelectItem>
                            <SelectItem value="refinance_rate_term">Refinance (Rate/Term)</SelectItem>
                            <SelectItem value="refinance_cash_out">Refinance (Cash-Out)</SelectItem>
                            <SelectItem value="heloc">HELOC</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Any additional notes for the borrower record..."
                          value={convertNotes}
                          onChange={(e) => setConvertNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
                      <Button
                        onClick={handleConvert}
                        disabled={convertToBorrower.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {convertToBorrower.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Converting...</>
                        ) : (
                          <><UserPlus className="w-4 h-4 mr-1" /> Convert</>  
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loan Milestone Tracker + Task Manager */}
        {!isReadOnly && (
          <div className="grid md:grid-cols-2 gap-6">
            <LoanMilestoneTracker leadId={leadId} />
            <LeadTaskManager leadId={leadId} />
          </div>
        )}

        {/* SEO Content Generation Panel */}
        {!isReadOnly && (
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
                AI SEO Content for This Lead
              </CardTitle>
              <CardDescription>
                Generate targeted SEO content or get AI-suggested niches based on this lead's profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Target Niche / Topic</Label>
                    <Input
                      placeholder={`e.g. first-time homebuyer in ${lead.city || "your city"}`}
                      value={seoNiche}
                      onChange={(e) => setSeoNiche(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Content Type</Label>
                    <Select value={seoContentType} onValueChange={(v: any) => setSeoContentType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blog-post">Blog Post</SelectItem>
                        <SelectItem value="how-to">How-To Guide</SelectItem>
                        <SelectItem value="listicle">Listicle</SelectItem>
                        <SelectItem value="guide">Comprehensive Guide</SelectItem>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="email-sequence">Email Sequence</SelectItem>
                        <SelectItem value="social-post">Social Post</SelectItem>
                        <SelectItem value="landing-page">Landing Page Copy</SelectItem>
                        <SelectItem value="video-script">Video Script</SelectItem>
                        <SelectItem value="case-study">Case Study</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!seoNiche || generateSeoContent.isPending}
                    onClick={() => generateSeoContent.mutate({
                      leadId,
                      leadName: `${lead.firstName} ${lead.lastName}`,
                      leadSource: lead.source || undefined,
                      niche: seoNiche,
                      contentType: seoContentType,
                    })}
                  >
                    {generateSeoContent.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Generate SEO Content</>
                    )}
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">AI Niche Suggestions</Label>
                    <Button variant="outline" size="sm" disabled={suggestNiches.isPending}
                      onClick={() => suggestNiches.mutate({
                        leadFirstName: lead.firstName,
                        leadLastName: lead.lastName,
                        leadSource: lead.source || undefined,
                        leadCity: lead.city || undefined,
                        leadState: lead.state || undefined,
                        loanType: lead.loanType || undefined,
                      })}
                    >
                      {suggestNiches.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</> : <><Search className="w-3 h-3 mr-1" /> Get Suggestions</>}
                    </Button>
                  </div>
                  {seoSuggestionsLoaded && seoSuggestions.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {seoSuggestions.map((s, i) => (
                        <div key={i} className="p-2 border rounded-lg cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                          onClick={() => { setSeoNiche(s.topic); setSeoContentType(s.contentType as any); }}>
                          <p className="text-sm font-medium">{s.topic}</p>
                          <p className="text-xs text-muted-foreground">{s.contentType} · {s.rationale}</p>
                        </div>
                      ))}
                    </div>
                  ) : seoSuggestionsLoaded ? (
                    <p className="text-sm text-muted-foreground">No suggestions found.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click "Get Suggestions" for AI-powered content niche ideas based on this lead's profile.</p>
                  )}
                </div>
              </div>
              {generatedSeoContent && (
                <div className="mt-2 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-purple-800 dark:text-purple-200">{generatedSeoContent.title}</h4>
                    <div className="flex gap-2">
                      {generatedSeoContent.contentId && (
                        <Button variant="outline" size="sm" asChild>
                          <a href="/seo/content" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1" /> View in SEO Portal
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(generatedSeoContent.content); toast.success("Copied!"); }}>
                        <FileText className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{generatedSeoContent.content.split(/\s+/).length} words{generatedSeoContent.contentId ? " · Saved to SEO Portal" : ""}</p>
                  <div className="text-sm text-purple-900 dark:text-purple-100 max-h-40 overflow-y-auto whitespace-pre-line">
                    {generatedSeoContent.content.substring(0, 600)}...
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
