/**
 * ContactDetailPage — GHL-style full contact workspace.
 * Left sidebar: contact info, DND toggles, quick actions.
 * Right pane: activity timeline + message composer.
 * Top bar: call, email, add task, star, more options.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Phone, Mail, MessageSquare, ArrowLeft, Star, MoreHorizontal,
  ChevronLeft, ChevronRight, Pencil, Trash2, Check, X,
  FileText, Calendar, Clock, Zap, DollarSign, Bell,
  PhoneCall, PhoneOff, PhoneMissed, PhoneIncoming,
  User, Building2, MapPin, Tag, Shield, AlertTriangle,
  Loader2, Send, Paperclip, ChevronDown, Activity,
  CheckSquare, Workflow, Plus, StickyNote, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Lead = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  status: string;
  notes?: string | null;
  tags?: string | null;
  score?: number | null;
  contactType?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  lastContactDate?: Date | string | null;
  assignedToUserId?: number | null;
  snoozedUntil?: Date | string | null;
  customFields?: string | null;
};

type Activity = {
  id: number;
  leadId: number;
  activityType: string;
  subject?: string | null;
  description?: string | null;
  metadata?: unknown;
  createdAt: Date | string;
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  appointment_set: "Appt. Set",
  appointment_completed: "Appt. Done",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-purple-100 text-purple-700 border-purple-200",
  qualified: "bg-amber-100 text-amber-700 border-amber-200",
  appointment_set: "bg-orange-100 text-orange-700 border-orange-200",
  appointment_completed: "bg-teal-100 text-teal-700 border-teal-200",
  closed_won: "bg-green-100 text-green-700 border-green-200",
  closed_lost: "bg-red-100 text-red-700 border-red-200",
};

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map(t => t.trim()).filter(Boolean); }
}

// ─── Activity Icon ─────────────────────────────────────────────────────────────
function ActivityIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "call":
    case "ai_call": return <PhoneCall className={cn(cls, "text-green-600")} />;
    case "email": return <Mail className={cn(cls, "text-blue-600")} />;
    case "sms": return <MessageSquare className={cn(cls, "text-purple-600")} />;
    case "note": return <StickyNote className={cn(cls, "text-amber-600")} />;
    case "task": return <CheckSquare className={cn(cls, "text-teal-600")} />;
    case "appointment": return <Calendar className={cn(cls, "text-orange-600")} />;
    case "status_change": return <Activity className={cn(cls, "text-indigo-600")} />;
    case "workflow": return <Workflow className={cn(cls, "text-pink-600")} />;
    case "import": return <Globe className={cn(cls, "text-gray-500")} />;
    default: return <Clock className={cn(cls, "text-muted-foreground")} />;
  }
}

function ActivityTypeBg(type: string) {
  switch (type) {
    case "call":
    case "ai_call": return "bg-green-50 border-green-200";
    case "email": return "bg-blue-50 border-blue-200";
    case "sms": return "bg-purple-50 border-purple-200";
    case "note": return "bg-amber-50 border-amber-200";
    case "task": return "bg-teal-50 border-teal-200";
    case "appointment": return "bg-orange-50 border-orange-200";
    case "status_change": return "bg-indigo-50 border-indigo-200";
    default: return "bg-muted border-border";
  }
}

// ─── Editable Field ────────────────────────────────────────────────────────────
function EditableField({
  label, value, icon, onSave, type = "text", placeholder
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <div className="group py-1.5">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            className="h-7 text-sm"
            placeholder={placeholder}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={commit}><Check className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/60 rounded px-1 -mx-1 py-0.5 transition-colors"
          onClick={() => { setDraft(value ?? ""); setEditing(true); }}
        >
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className={cn("text-sm flex-1", !value && "text-muted-foreground italic")}>{value || placeholder || "—"}</span>
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();

  // ── Data ──
  const { data: lead, isLoading, refetch } = trpc.crm.getLead.useQuery(
    { leadId },
    { enabled: !!leadId && !isNaN(leadId) }
  );
  const { data: activities = [], refetch: refetchActivities } = trpc.crm.getLeadActivities.useQuery(
    { leadId },
    { enabled: !!leadId && !isNaN(leadId) }
  );

  // ── Local state ──
  const [starred, setStarred] = useState(false);
  const [composerTab, setComposerTab] = useState<"sms" | "email" | "note">("sms");
  const [composerText, setComposerText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLogCallDialog, setShowLogCallDialog] = useState(false);
  const [callOutcome, setCallOutcome] = useState<"connected" | "no_answer" | "voicemail" | "busy">("connected");
  const [callNotes, setCallNotes] = useState("");
  const [dnd, setDnd] = useState({ email: false, sms: false, call: false, voicemail: false, all: false });
  const isMobile = useIsMobile();
  // On mobile, show either the left panel (info) or the right panel (timeline)
  const [mobilePanel, setMobilePanel] = useState<"info" | "timeline">("info");

  // ── Mutations ──
  const utils = trpc.useUtils();
  const updateMut = trpc.crm.updateLead.useMutation({
    onSuccess: () => { toast.success("Contact updated"); refetch(); },
    onError: e => toast.error(e.message),
  });
  const deleteMut = trpc.crm.deleteLead.useMutation({
    onSuccess: () => { toast.success("Contact deleted"); navigate("/contacts"); },
    onError: e => toast.error(e.message),
  });
  const addNoteMut = trpc.crm.addLeadNote.useMutation({
    onSuccess: () => { toast.success("Note added"); setComposerText(""); refetchActivities(); },
    onError: e => toast.error(e.message),
  });
  const sendSmsMut = trpc.followUps.sendFollowUpSMS.useMutation({
    onSuccess: r => { toast.success(r.demo ? "SMS logged (demo)" : "SMS sent"); setComposerText(""); refetchActivities(); },
    onError: e => toast.error(e.message),
  });
  const sendEmailMut = trpc.followUps.sendFollowUpEmail.useMutation({
    onSuccess: () => { toast.success("Email sent"); setComposerText(""); setEmailSubject(""); refetchActivities(); },
    onError: e => toast.error(e.message),
  });
  const logCallMut = trpc.crm.logCall.useMutation({
    onSuccess: () => { toast.success("Call logged"); setShowLogCallDialog(false); setCallNotes(""); refetchActivities(); },
    onError: e => toast.error(e.message),
  });
  const makeCallMut = trpc.vapi.makeCall.useMutation({
    onSuccess: () => toast.success("AI call initiated"),
    onError: e => toast.error(e.message),
  });

  // ── Field save helpers ──
  const saveField = (field: string, value: string) => {
    if (!lead) return;
    updateMut.mutate({ leadId: lead.id, [field]: value } as any);
  };

  const saveStatus = (status: string) => {
    if (!lead) return;
    updateMut.mutate({ leadId: lead.id, status: status as any });
  };

  // ── Composer send ──
  const handleSend = () => {
    if (!lead) return;
    if (!composerText.trim()) return;
    if (composerTab === "note") {
      addNoteMut.mutate({ leadId: lead.id, note: composerText });
    } else if (composerTab === "sms") {
      sendSmsMut.mutate({ leadId: lead.id, message: composerText });
    } else if (composerTab === "email") {
      if (!emailSubject.trim()) { toast.error("Please enter an email subject"); return; }
      sendEmailMut.mutate({ leadId: lead.id, subject: emailSubject, body: composerText });
    }
  };

  if (!leadId || isNaN(leadId)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Invalid contact ID.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-muted-foreground">Contact not found.</p>
          <Button variant="outline" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contacts
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const tags = parseTags(lead.tags);
  const fullName = `${lead.firstName} ${lead.lastName}`;
  const initials = getInitials(lead.firstName, lead.lastName);

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 bg-background flex-col md:flex-row">
        {/* ══ MOBILE TAB BAR ════════════════════════════════════════════════════ */}
        {isMobile && (
          <div className="flex border-b bg-card shrink-0">
            <button
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                mobilePanel === "info"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              )}
              onClick={() => setMobilePanel("info")}
            >
              Contact Info
            </button>
            <button
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                mobilePanel === "timeline"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              )}
              onClick={() => setMobilePanel("timeline")}
            >
              Activity
            </button>
          </div>
        )}
        {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════════════ */}
        <div className={cn(
          "flex-shrink-0 border-r bg-card flex flex-col overflow-y-auto",
          isMobile
            ? mobilePanel === "info" ? "flex w-full" : "hidden"
            : "w-80"
        )}>
          {/* Back nav */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate("/contacts")}>
              <ArrowLeft className="w-4 h-4" /> Contacts
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground" title="Previous contact">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground" title="Next contact">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Contact header */}
          <div className="px-4 py-4 border-b">
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12 text-base font-semibold">
                <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base leading-tight truncate">{fullName}</h2>
                {lead.company && <p className="text-sm text-muted-foreground truncate">{lead.company}</p>}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_COLORS[lead.status] ?? "bg-muted text-muted-foreground border-border")}>
                    {STATUS_LABELS[lead.status] ?? lead.status}
                  </span>
                  {lead.score != null && lead.score > 0 && (
                    <span className="text-xs text-muted-foreground">Score: {lead.score}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost" size="icon" className="w-7 h-7"
                  onClick={() => setStarred(s => !s)}
                  title={starred ? "Unstar" : "Star contact"}
                >
                  <Star className={cn("w-4 h-4", starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-7 h-7">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toast.info("Add to workflow — coming soon")}>
                      <Workflow className="w-3.5 h-3.5 mr-2" /> Add to Workflow
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Create opportunity — coming soon")}>
                      <DollarSign className="w-3.5 h-3.5 mr-2" /> Create Opportunity
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500" onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Contact
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <Button
                size="sm" variant="outline"
                className="h-8 text-xs gap-1 hover:bg-green-50 hover:border-green-400 hover:text-green-700 transition-colors"
                onClick={() => { setShowLogCallDialog(true); }}
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-8 text-xs gap-1 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
                onClick={() => { setComposerTab("sms"); }}
              >
                <MessageSquare className="w-3.5 h-3.5" /> SMS
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-8 text-xs gap-1 hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700 transition-colors"
                onClick={() => { setComposerTab("email"); }}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
            </div>
          </div>

          {/* Tabs: All Fields / DND / Actions */}
          <Tabs defaultValue="fields" className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none border-b bg-transparent h-9 p-0 justify-start gap-0">
              {["fields", "dnd", "actions"].map(tab => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 text-xs capitalize"
                >
                  {tab === "fields" ? "All Fields" : tab === "dnd" ? "DND" : "Actions"}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── All Fields ── */}
            <TabsContent value="fields" className="flex-1 px-4 py-2 space-y-0 overflow-y-auto mt-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">Contact</p>
              <EditableField label="First Name" value={lead.firstName} icon={<User className="w-3.5 h-3.5" />} onSave={v => saveField("firstName", v)} placeholder="First name" />
              <EditableField label="Last Name" value={lead.lastName} icon={<User className="w-3.5 h-3.5" />} onSave={v => saveField("lastName", v)} placeholder="Last name" />
              <EditableField label="Phone" value={lead.phone} icon={<Phone className="w-3.5 h-3.5" />} onSave={v => saveField("phone", v)} type="tel" placeholder="Phone number" />
              <EditableField label="Email" value={lead.email} icon={<Mail className="w-3.5 h-3.5" />} onSave={v => saveField("email", v)} type="email" placeholder="Email address" />
              <EditableField label="Business Name" value={lead.company} icon={<Building2 className="w-3.5 h-3.5" />} onSave={v => saveField("company", v)} placeholder="Company / business" />
              <EditableField label="Source" value={lead.source} icon={<Globe className="w-3.5 h-3.5" />} onSave={v => saveField("source", v)} placeholder="Lead source" />

              <Separator className="my-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <div className="py-1.5">
                <p className="text-xs text-muted-foreground mb-1">Pipeline Status</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-7 text-xs gap-1 border", STATUS_COLORS[lead.status] ?? "")}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <DropdownMenuItem key={v} onClick={() => saveStatus(v)}>
                        <span className={cn("w-2 h-2 rounded-full mr-2", STATUS_COLORS[v]?.includes("blue") ? "bg-blue-500" : STATUS_COLORS[v]?.includes("green") ? "bg-green-500" : STATUS_COLORS[v]?.includes("red") ? "bg-red-500" : "bg-amber-500")} />
                        {l}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Separator className="my-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tags</p>
              <div className="py-1.5">
                <div className="flex flex-wrap gap-1">
                  {tags.length > 0 ? tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                      {t}
                    </span>
                  )) : <span className="text-xs text-muted-foreground italic">No tags</span>}
                </div>
              </div>

              <Separator className="my-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <div className="py-1.5">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{lead.notes || <span className="italic">No notes</span>}</p>
              </div>

              <Separator className="my-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Metadata</p>
              <div className="space-y-1 pb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(lead.createdAt)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span>{formatDate(lead.lastContactDate)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Contact Type</span>
                  <span className="capitalize">{lead.contactType?.replace(/_/g, " ") ?? "—"}</span>
                </div>
              </div>
            </TabsContent>

            {/* ── DND ── */}
            <TabsContent value="dnd" className="px-4 py-3 space-y-4 mt-0">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">DND settings prevent automated and manual outreach on selected channels.</p>
              </div>
              {[
                { key: "email", label: "Email DND", icon: <Mail className="w-4 h-4" />, desc: "Block all email outreach" },
                { key: "sms", label: "SMS DND", icon: <MessageSquare className="w-4 h-4" />, desc: "Block all SMS messages" },
                { key: "call", label: "Call DND", icon: <Phone className="w-4 h-4" />, desc: "Block all phone calls" },
                { key: "voicemail", label: "Voicemail DND", icon: <PhoneOff className="w-4 h-4" />, desc: "Block voicemail drops" },
                { key: "all", label: "Global DND", icon: <Shield className="w-4 h-4 text-red-500" />, desc: "Block all communication channels" },
              ].map(({ key, label, icon, desc }) => (
                <div key={key} className={cn("flex items-center justify-between p-3 rounded-lg border", dnd[key as keyof typeof dnd] ? "bg-red-50 border-red-200" : "bg-muted/30 border-border")}>
                  <div className="flex items-center gap-2.5">
                    <span className={dnd[key as keyof typeof dnd] ? "text-red-500" : "text-muted-foreground"}>{icon}</span>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={dnd[key as keyof typeof dnd]}
                    onCheckedChange={v => {
                      setDnd(d => ({ ...d, [key]: v }));
                      toast.success(`${label} ${v ? "enabled" : "disabled"}`);
                    }}
                  />
                </div>
              ))}
            </TabsContent>

            {/* ── Actions ── */}
            <TabsContent value="actions" className="px-4 py-3 space-y-2 mt-0">
              {[
                { icon: <PhoneCall className="w-4 h-4 text-green-600" />, label: "Log a Call", onClick: () => setShowLogCallDialog(true) },
                { icon: <Mail className="w-4 h-4 text-blue-600" />, label: "Send Email", onClick: () => setComposerTab("email") },
                { icon: <MessageSquare className="w-4 h-4 text-purple-600" />, label: "Send SMS", onClick: () => setComposerTab("sms") },
                { icon: <StickyNote className="w-4 h-4 text-amber-600" />, label: "Add Note", onClick: () => setComposerTab("note") },
                { icon: <CheckSquare className="w-4 h-4 text-teal-600" />, label: "Schedule Task", onClick: () => toast.info("Task scheduling — coming soon") },
                { icon: <Workflow className="w-4 h-4 text-pink-600" />, label: "Add to Workflow", onClick: () => toast.info("Workflow assignment — coming soon") },
                { icon: <DollarSign className="w-4 h-4 text-emerald-600" />, label: "Create Opportunity", onClick: () => toast.info("Opportunity creation — coming soon") },
                { icon: <Calendar className="w-4 h-4 text-orange-600" />, label: "Book Appointment", onClick: () => navigate("/appointments") },
                { icon: <Zap className="w-4 h-4 text-indigo-600" />, label: "AI Call (Vapi)", onClick: () => {
                  if (!lead.phone) { toast.error("No phone number"); return; }
                  makeCallMut.mutate({ leadId: lead.id, phoneNumber: lead.phone });
                }},
                { icon: <Star className="w-4 h-4 text-amber-500" />, label: starred ? "Unstar Contact" : "Star Contact", onClick: () => setStarred(s => !s) },
              ].map(({ icon, label, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted hover:border-border text-sm text-left transition-colors"
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </TabsContent>
          </Tabs>
        </div>{/* end left sidebar */}
        {/* ══ RIGHT PANE ═══════════════════════════════════════════════════════════════════ */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 min-h-0",
          isMobile && mobilePanel === "info" ? "hidden" : "flex"
        )}>
          {/* Top action bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-card">
            <Avatar className="w-8 h-8 text-sm font-semibold">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-base leading-tight">{fullName}</h1>
              {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
            </div>
            {/* Action icon buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm" className="h-8 gap-1.5 text-xs hover:bg-green-50 hover:border-green-400 hover:text-green-700"
                onClick={() => setShowLogCallDialog(true)}
                title="Log a call"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </Button>
              <Button
                variant="outline" size="sm" className="h-8 gap-1.5 text-xs hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700"
                onClick={() => setComposerTab("sms")}
                title="Send SMS"
              >
                <MessageSquare className="w-3.5 h-3.5" /> SMS
              </Button>
              <Button
                variant="outline" size="sm" className="h-8 gap-1.5 text-xs hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
                onClick={() => setComposerTab("email")}
                title="Send email"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
              <Button
                variant="ghost" size="icon" className="w-8 h-8"
                onClick={() => toast.info("Task scheduling — coming soon")}
                title="Add task"
              >
                <CheckSquare className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost" size="icon" className="w-8 h-8"
                onClick={() => setStarred(s => !s)}
                title={starred ? "Unstar" : "Star"}
              >
                <Star className={cn("w-4 h-4", starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toast.info("Add to workflow — coming soon")}>
                    <Workflow className="w-3.5 h-3.5 mr-2" /> Add to Workflow
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Create opportunity — coming soon")}>
                    <DollarSign className="w-3.5 h-3.5 mr-2" /> Create Opportunity
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Contact
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {(activities as Activity[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No activity yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Send a message or log a call to start the timeline</p>
              </div>
            ) : (
              <>
                {/* Group activities by date */}
                {groupActivitiesByDate(activities as Activity[]).map(({ date, items }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium px-2">{date}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-2">
                      {items.map(act => (
                        <ActivityCard key={act.id} activity={act} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Message composer */}
          <div className="border-t bg-card px-4 py-3">
            {/* Channel tabs */}
            <div className="flex items-center gap-1 mb-2">
              {(["sms", "email", "note"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setComposerTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    composerTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab === "sms" && <MessageSquare className="w-3.5 h-3.5" />}
                  {tab === "email" && <Mail className="w-3.5 h-3.5" />}
                  {tab === "note" && <StickyNote className="w-3.5 h-3.5" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {composerTab === "email" && (
              <Input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="Subject"
                className="mb-2 h-8 text-sm"
              />
            )}
            <div className="flex gap-2">
              <Textarea
                value={composerText}
                onChange={e => setComposerText(e.target.value)}
                placeholder={
                  composerTab === "sms" ? "Type an SMS message…" :
                  composerTab === "email" ? "Type your email…" :
                  "Add a note…"
                }
                className="min-h-[72px] max-h-36 text-sm resize-none flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                }}
              />
              <div className="flex flex-col gap-1.5">
                <Button
                  size="icon"
                  className="w-9 h-9"
                  onClick={handleSend}
                  disabled={!composerText.trim() || sendSmsMut.isPending || sendEmailMut.isPending || addNoteMut.isPending}
                  title="Send (Cmd+Enter)"
                >
                  {(sendSmsMut.isPending || sendEmailMut.isPending || addNoteMut.isPending)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground" title="Attach template (coming soon)" onClick={() => toast.info("Templates — coming soon")}>
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cmd+Enter to send</p>
          </div>
        </div>
      </div>

      {/* ── Delete Dialog ── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{fullName}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMut.mutate({ leadId: lead.id })}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Log Call Dialog ── */}
      <Dialog open={showLogCallDialog} onOpenChange={setShowLogCallDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-green-600" /> Log a Call
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Outcome</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { v: "connected", label: "Connected", icon: <PhoneCall className="w-3.5 h-3.5" /> },
                  { v: "no_answer", label: "No Answer", icon: <PhoneMissed className="w-3.5 h-3.5" /> },
                  { v: "voicemail", label: "Voicemail", icon: <PhoneIncoming className="w-3.5 h-3.5" /> },
                  { v: "busy", label: "Busy", icon: <PhoneOff className="w-3.5 h-3.5" /> },
                ].map(({ v, label, icon }) => (
                  <button
                    key={v}
                    onClick={() => setCallOutcome(v as any)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                      callOutcome === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    )}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Notes (optional)</Label>
              <Textarea
                value={callNotes}
                onChange={e => setCallNotes(e.target.value)}
                placeholder="Call notes…"
                className="min-h-[80px] text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogCallDialog(false)}>Cancel</Button>
            <Button
              onClick={() => logCallMut.mutate({ leadId: lead.id, outcome: callOutcome, notes: callNotes || undefined })}
              disabled={logCallMut.isPending}
            >
              {logCallMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Log Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ─── Activity Card ─────────────────────────────────────────────────────────────
function ActivityCard({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = !!activity.description && activity.description.length > 80;

  return (
    <div className={cn("flex gap-3 p-3 rounded-lg border text-sm", ActivityTypeBg(activity.activityType))}>
      <div className="flex-shrink-0 mt-0.5">
        <ActivityIcon type={activity.activityType} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium capitalize text-xs text-muted-foreground">
            {activity.activityType.replace(/_/g, " ")}
            {activity.subject && <span className="text-foreground ml-1">— {activity.subject}</span>}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatDateTime(activity.createdAt)}
          </span>
        </div>
        {activity.description && (
          <p className={cn("text-sm mt-0.5 text-foreground/80", !expanded && hasBody && "line-clamp-2")}>
            {activity.description}
          </p>
        )}
        {hasBody && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-primary mt-0.5 hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Group activities by date ──────────────────────────────────────────────────
function groupActivitiesByDate(activities: Activity[]) {
  const groups: Record<string, Activity[]> = {};
  for (const act of activities) {
    const d = new Date(act.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(act);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}
