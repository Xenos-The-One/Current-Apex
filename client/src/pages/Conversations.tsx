import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import AISuccessCoachPanel from "@/components/AISuccessCoachPanel";
import { useAgency } from "@/contexts/AgencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  MessageSquare, Mail, Phone, Search, Send, Archive, MoreVertical,
  CheckCheck, Clock, Plus, RefreshCw, MessageCircle, Loader2, StickyNote,
  Paperclip, UserCheck, ChevronDown, LayoutTemplate, Tag, X, CheckSquare,
  Square, Trash2, Star, StarOff, Zap, GitBranch, PhoneCall, PhoneMissed,
  PhoneIncoming, Info, ChevronRight, Inbox, Filter,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ───────────────────────────────────────────────────────────────────
type Conversation = {
  id: number;
  agencyId: number;
  leadId?: number;
  channel: "sms" | "email" | "facebook" | "instagram" | "whatsapp";
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  isRead: boolean | number;
  isArchived: boolean | number;
  isStarred?: boolean | number;
  first_name?: string;
  last_name?: string;
  lead_status?: string;
  message_count?: number;
  tags?: string | string[] | null;
  assignedToName?: string;
};

type Message = {
  id: number;
  conversationId: number;
  direction: "inbound" | "outbound";
  type?: string;
  content: string;
  status?: string;
  subject?: string;
  createdAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────
const PRESET_TAGS = [
  { label: "Hot Lead",    color: "bg-red-50 text-red-600 border-red-200",      dot: "bg-red-500" },
  { label: "Follow Up",  color: "bg-amber-50 text-amber-600 border-amber-200", dot: "bg-amber-500" },
  { label: "Urgent",     color: "bg-orange-50 text-orange-600 border-orange-200", dot: "bg-orange-500" },
  { label: "Qualified",  color: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  { label: "Nurture",    color: "bg-violet-50 text-violet-600 border-violet-200", dot: "bg-violet-500" },
  { label: "Closed",     color: "bg-gray-100 text-gray-500 border-gray-200",   dot: "bg-gray-400" },
];

const SMART_LISTS = [
  { id: "all",      label: "All",      icon: Inbox },
  { id: "unread",   label: "Unread",   icon: MessageCircle },
  { id: "mine",     label: "Mine",     icon: UserCheck },
  { id: "sms",      label: "SMS",      icon: Phone },
  { id: "email",    label: "Email",    icon: Mail },
  { id: "archived", label: "Archived", icon: Archive },
];

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  sms:       { label: "SMS",       icon: Phone,          bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200" },
  email:     { label: "Email",     icon: Mail,           bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200" },
  facebook:  { label: "Facebook",  icon: MessageCircle,  bg: "bg-indigo-50",   text: "text-indigo-700",  border: "border-indigo-200" },
  instagram: { label: "Instagram", icon: MessageCircle,  bg: "bg-pink-50",     text: "text-pink-700",    border: "border-pink-200" },
  whatsapp:  { label: "WhatsApp",  icon: MessageCircle,  bg: "bg-teal-50",     text: "text-teal-700",    border: "border-teal-200" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTagStyle(label: string) {
  return PRESET_TAGS.find(t => t.label === label) || { color: "bg-blue-50 text-blue-600 border-blue-200", dot: "bg-blue-500" };
}

function parseTags(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = diffMs / 60000;
  const diffHours = diffMs / 3600000;
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${Math.round(diffMins)}m`;
  if (diffHours < 24) return `${Math.round(diffHours)}h`;
  if (diffHours < 168) {
    const days = Math.round(diffHours / 24);
    return days === 1 ? "yesterday" : `${days}d`;
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarGradient(name?: string) {
  const gradients = [
    "from-blue-400 to-indigo-500",
    "from-emerald-400 to-teal-500",
    "from-violet-400 to-purple-500",
    "from-rose-400 to-pink-500",
    "from-amber-400 to-orange-500",
    "from-cyan-400 to-sky-500",
  ];
  const idx = (name || "").charCodeAt(0) % gradients.length;
  return gradients[idx];
}

// ─── Conversation List Item ───────────────────────────────────────────────────
function ConversationItem({
  conv, isSelected, onClick, isChecked, onCheck, bulkMode,
}: {
  conv: Conversation; isSelected: boolean; onClick: () => void;
  isChecked?: boolean; onCheck?: (checked: boolean) => void; bulkMode?: boolean;
}) {
  const displayName = conv.contactName || [conv.first_name, conv.last_name].filter(Boolean).join(" ") || "Unknown";
  const isUnread = !conv.isRead;
  const isStarred = !!conv.isStarred;
  const tags = parseTags(conv.tags);
  const ch = CHANNEL_CONFIG[conv.channel] || CHANNEL_CONFIG.sms;
  const ChIcon = ch.icon;

  return (
    <div
      className={`relative group flex items-start gap-0 border-b border-gray-100 transition-all cursor-pointer
        ${isSelected ? "bg-blue-50 border-l-[3px] border-l-blue-500" : "hover:bg-gray-50/80 border-l-[3px] border-l-transparent"}
        ${isUnread ? "bg-white" : "bg-gray-50/30"}
      `}
      onClick={onClick}
    >
      {/* Unread indicator strip */}
      {isUnread && !isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-r" />
      )}

      <div className="flex items-start gap-2.5 px-3 py-2.5 w-full min-w-0">
        {/* Bulk checkbox */}
        {bulkMode && (
          <button
            className="shrink-0 mt-1 text-gray-300 hover:text-blue-500 transition-colors"
            onClick={e => { e.stopPropagation(); onCheck?.(!isChecked); }}
          >
            {isChecked
              ? <CheckSquare className="h-4 w-4 text-blue-500" />
              : <Square className="h-4 w-4" />}
          </button>
        )}

        {/* Avatar */}
        <div className="relative shrink-0 mt-0.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className={`text-[11px] font-bold bg-gradient-to-br ${getAvatarGradient(displayName)} text-white`}>
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          {/* Channel badge */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border border-white ${ch.bg}`}>
            <ChIcon className={`h-2 w-2 ${ch.text}`} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className={`text-[13px] leading-tight truncate ${isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-600"}`}>
              {displayName}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {isStarred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
              <span className={`text-[11px] ${isUnread ? "text-blue-500 font-medium" : "text-gray-400"}`}>
                {formatTime(conv.lastMessageAt)}
              </span>
            </div>
          </div>

          <p className={`text-[12px] leading-snug truncate ${isUnread ? "text-gray-700 font-medium" : "text-gray-400"}`}>
            {conv.lastMessagePreview || "No messages yet"}
          </p>

          {/* Tags row */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.slice(0, 2).map(tag => {
                const style = getTagStyle(tag);
                return (
                  <span key={tag} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${style.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {tag}
                  </span>
                );
              })}
              {tags.length > 2 && (
                <span className="text-[10px] text-gray-400">+{tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* Unread dot */}
        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, channel }: { msg: Message; channel?: string }) {
  const isOutbound = msg.direction === "outbound";
  const isNote = msg.type === "note";
  const isEvent = msg.type && ["call_log", "workflow_event", "system_event", "call_missed", "call_inbound"].includes(msg.type);

  // System / workflow event — centered pill
  if (isEvent) {
    const isCall = msg.type?.startsWith("call");
    const isMissed = msg.type === "call_missed";
    return (
      <div className="flex items-center gap-3 my-3 px-2">
        <div className="flex-1 h-px bg-gray-100" />
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border
          ${isCall
            ? isMissed
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-gray-50 text-gray-500 border-gray-200"
          }`}>
          {isMissed
            ? <PhoneMissed className="h-3 w-3" />
            : isCall
            ? <PhoneCall className="h-3 w-3" />
            : <GitBranch className="h-3 w-3" />}
          {msg.content}
          <span className="text-[10px] opacity-60 ml-1">{formatMessageTime(msg.createdAt)}</span>
        </div>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
    );
  }

  // Internal note — yellow sticky
  if (isNote) {
    return (
      <div className="flex justify-center my-2">
        <div className="max-w-[75%] bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-sm text-amber-900">
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
            <StickyNote className="h-3 w-3" /> Internal Note
          </div>
          <p className="leading-relaxed whitespace-pre-wrap text-[13px]">{msg.content}</p>
          <p className="text-[10px] text-amber-500 mt-1">{formatMessageTime(msg.createdAt)}</p>
        </div>
      </div>
    );
  }

  // Email message — card style
  if (channel === "email" || msg.type === "email_out" || msg.type === "email_in") {
    return (
      <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3`}>
        <div className={`max-w-[78%] rounded-xl border text-sm shadow-sm
          ${isOutbound
            ? "bg-blue-600 text-white border-blue-500"
            : "bg-white text-gray-800 border-gray-200"
          }`}>
          {msg.subject && (
            <div className={`px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide border-b
              ${isOutbound ? "text-blue-200 border-blue-500" : "text-gray-500 border-gray-100"}`}>
              <Mail className="h-3 w-3 inline mr-1" />
              {msg.subject}
            </div>
          )}
          <div className="px-4 py-3">
            <p className="leading-relaxed whitespace-pre-wrap text-[13px]">{msg.content}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-4 pb-2.5 ${isOutbound ? "justify-end" : "justify-start"}`}>
            <span className={`text-[10px] ${isOutbound ? "text-blue-200" : "text-gray-400"}`}>
              {formatMessageTime(msg.createdAt)}
            </span>
            {isOutbound && <CheckCheck className="h-3 w-3 text-blue-200" />}
          </div>
        </div>
      </div>
    );
  }

  // SMS / default bubble
  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed
        ${isOutbound
          ? "bg-blue-600 text-white rounded-br-md shadow-sm"
          : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
        }`}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isOutbound ? "text-blue-200" : "text-gray-400"}`}>
            {formatMessageTime(msg.createdAt)}
          </span>
          {isOutbound && (
            msg.status === "delivered"
              ? <CheckCheck className="h-3 w-3 text-blue-200" />
              : <CheckCheck className="h-3 w-3 text-blue-300 opacity-60" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Date Divider ─────────────────────────────────────────────────────────────
function DateDivider({ dateStr }: { dateStr: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[11px] text-gray-400 font-medium px-2">{formatDateDivider(dateStr)}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── New Conversation Dialog ──────────────────────────────────────────────────
function NewConversationDialog({
  agencyId, clientId, onCreated,
}: {
  agencyId: number; clientId?: number; onCreated: (convId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [leadId, setLeadId] = useState<string>("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  const { data: leadsRaw } = trpc.leads.list.useQuery(
    { agencyId, clientId: clientId && clientId > 0 ? clientId : undefined, limit: 100 },
    { enabled: open }
  );
  const leadsList: any[] = Array.isArray(leadsRaw) ? leadsRaw : [];
  const createConv = trpc.conversations.create.useMutation();
  const utils = trpc.useUtils();
  const selectedLead = leadsList.find((l: any) => l.id?.toString() === leadId);

  useEffect(() => {
    if (selectedLead) {
      setManualName(`${selectedLead.firstName || ""} ${selectedLead.lastName || ""}`.trim());
      setManualPhone(selectedLead.phone || "");
      setManualEmail(selectedLead.email || "");
    }
  }, [leadId]);

  const canSend = (channel === "sms" ? manualPhone.trim() : manualEmail.trim()) && firstMessage.trim();

  const handleCreate = async () => {
    if (!canSend) return;
    try {
      const conv = await createConv.mutateAsync({
        agencyId,
        leadId: selectedLead ? selectedLead.id : undefined,
        channel,
        contactName: manualName || undefined,
        contactPhone: channel === "sms" ? manualPhone : undefined,
        contactEmail: channel === "email" ? manualEmail : undefined,
        firstMessage: firstMessage.trim(),
      });
      utils.conversations.list.invalidate();
      utils.conversations.getStats.invalidate();
      toast.success(`Conversation started with ${manualName || (channel === "sms" ? manualPhone : manualEmail)}`);
      setOpen(false);
      onCreated(conv.conversationId || (conv as any).id);
      setLeadId(""); setManualName(""); setManualPhone(""); setManualEmail(""); setFirstMessage("");
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom"><p>New conversation</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex gap-2">
              {(["sms", "email"] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all
                    ${channel === ch ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                >
                  {ch === "sms" ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  {ch.toUpperCase()}
                </button>
              ))}
            </div>
            {leadsList.length > 0 && (
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Select contact</Label>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Choose from your contacts…" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadsList.map((l: any) => (
                      <SelectItem key={l.id} value={l.id.toString()}>
                        {l.firstName} {l.lastName}
                        {l.phone && <span className="text-gray-400 ml-2 text-xs">{l.phone}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Name</Label>
                <Input className="h-9 text-sm" placeholder="Full name" value={manualName} onChange={e => setManualName(e.target.value)} />
              </div>
              {channel === "sms" ? (
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">Phone</Label>
                  <Input className="h-9 text-sm" placeholder="+1 555 000 0000" value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">Email</Label>
                  <Input className="h-9 text-sm" placeholder="email@example.com" value={manualEmail} onChange={e => setManualEmail(e.target.value)} />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">First message</Label>
              <Textarea
                className="text-sm min-h-[80px] resize-none"
                placeholder={channel === "sms" ? "Hi {name}, this is…" : "Write your opening email…"}
                value={firstMessage}
                onChange={e => setFirstMessage(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!canSend || createConv.isPending}
              onClick={handleCreate}
            >
              {createConv.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send {channel === "sms" ? "SMS" : "Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Conversations() {
  const { agencyId: AGENCY_ID } = useAgency();
  const { user } = useAuth();
  const { impersonatingClientId } = useImpersonation();
  const CLIENT_ID = impersonatingClientId || undefined;

  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeList, setActiveList] = useState("all");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [composeTab, setComposeTab] = useState<"sms" | "email" | "note">("sms");
  const [showTemplates, setShowTemplates] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Queries ──
  const queryParams = useMemo(() => {
    const tab = activeList === "unread" ? "unread"
      : activeList === "archived" ? "archived"
      : "all";
    const channel = (activeList === "sms" || activeList === "email") ? activeList : "all";
    return { agencyId: AGENCY_ID, tab, channel, search: searchQuery || undefined, page: 1, pageSize: 50 };
  }, [activeList, searchQuery, AGENCY_ID]);

  const { data: convData, isLoading, refetch } = trpc.conversations.list.useQuery(queryParams, { refetchInterval: 15000 });
  const conversations: Conversation[] = useMemo(() => (convData as any)?.conversations || [], [convData]);

  const filteredConversations = useMemo(() => {
    let all = conversations;
    if (activeList === "mine" && user) {
      all = all.filter((c: any) => c.assignedToUserId === user.id);
    }
    if (activeTagFilter) {
      all = all.filter(c => parseTags(c.tags).includes(activeTagFilter));
    }
    return all;
  }, [conversations, activeList, user, activeTagFilter]);

  const { data: statsRaw } = trpc.conversations.getStats.useQuery({ agencyId: AGENCY_ID }, { refetchInterval: 15000 });
  const stats = statsRaw as any;

  const { data: messagesRaw, isLoading: msgsLoading } = trpc.conversations.getMessages.useQuery(
    { conversationId: selectedConvId!, page: 1, pageSize: 100 },
    { enabled: !!selectedConvId, refetchInterval: 5000 }
  );
  const messages: Message[] = Array.isArray(messagesRaw) ? messagesRaw : [];

  const selectedLeadId = (selectedConv as any)?.leadId || null;
  const { data: leadDetail } = trpc.conversations.getLeadDetail.useQuery(
    { leadId: selectedLeadId! },
    { enabled: !!selectedLeadId && showContactDrawer }
  );

  const { data: teamMembersRaw } = trpc.conversations.getTeamMembers.useQuery(
    { agencyId: AGENCY_ID }, { enabled: assignOpen }
  );
  const teamMembers: any[] = Array.isArray(teamMembersRaw) ? teamMembersRaw : [];

  const { data: templatesRaw } = trpc.campaigns.listTemplates.useQuery({ agencyId: AGENCY_ID });
  const smsTemplates = (templatesRaw as any[])?.filter((t: any) => t.type === "sms") || [];
  const emailTemplates = (templatesRaw as any[])?.filter((t: any) => t.type === "email") || [];

  // ── Mutations ──
  const utils = trpc.useUtils();

  const markRead = trpc.conversations.markRead.useMutation({
    onSuccess: () => { utils.conversations.list.invalidate(); utils.conversations.getStats.invalidate(); },
  });
  const markUnread = trpc.conversations.markRead.useMutation({
    onSuccess: () => { utils.conversations.list.invalidate(); utils.conversations.getStats.invalidate(); },
  });
  const archiveConv = trpc.conversations.archive.useMutation({
    onSuccess: () => { utils.conversations.list.invalidate(); setSelectedConvId(null); toast.success("Archived"); },
  });
  const assignConv = trpc.conversations.assign.useMutation({
    onSuccess: () => { utils.conversations.list.invalidate(); setAssignOpen(false); toast.success("Assigned"); },
  });
  const updateTags = trpc.conversations.updateTags.useMutation({
    onSuccess: () => { utils.conversations.list.invalidate(); setTagEditorOpen(false); },
  });
  const markAllRead = trpc.conversations.bulkAction.useMutation({
    onSuccess: () => { utils.conversations.list.invalidate(); utils.conversations.getStats.invalidate(); toast.success("Marked all as read"); },
  });
  const bulkAction = trpc.conversations.bulkAction.useMutation({
    onSuccess: (data, vars) => {
      utils.conversations.list.invalidate();
      utils.conversations.getStats.invalidate();
      setCheckedIds(new Set());
      setBulkMode(false);
      const label = vars.action === "markRead" ? "Marked as read" : vars.action === "markUnread" ? "Marked as unread" : "Archived";
      toast.success(`${label}: ${(data as any).count} conversation${(data as any).count !== 1 ? "s" : ""}`);
    },
    onError: () => toast.error("Bulk action failed"),
  });
  const sendMessage = trpc.conversations.sendMessage.useMutation({
    onSuccess: () => {
      setReplyText("");
      utils.conversations.getMessages.invalidate({ conversationId: selectedConvId!, page: 1, pageSize: 100 });
      utils.conversations.list.invalidate();
    },
    onError: () => toast.error("Failed to send message"),
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  useEffect(() => {
    if (selectedConvId && selectedConv && !selectedConv.isRead) {
      markRead.mutate({ id: selectedConvId, isRead: true });
    }
  }, [selectedConvId]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConv) {
      if (selectedConv.channel === "sms") setComposeTab("sms");
      else if (selectedConv.channel === "email") setComposeTab("email");
    }
  }, [selectedConvId]);

  const handleSend = () => {
    if (!replyText.trim() || !selectedConvId) return;
    const msgType = composeTab === "email" ? "email_out" : composeTab === "note" ? "note" : "sms_out";
    sendMessage.mutate({
      conversationId: selectedConvId,
      agencyId: AGENCY_ID,
      type: msgType as any,
      content: replyText.trim(),
      subject: composeTab === "email" && emailSubject.trim() ? emailSubject.trim() : undefined,
    });
    setEmailSubject("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
  };

  const displayName = selectedConv
    ? selectedConv.contactName || [selectedConv.first_name, selectedConv.last_name].filter(Boolean).join(" ") || "Unknown"
    : "";

  // Group messages by date for dividers
  const groupedMessages = useMemo(() => {
    const result: Array<{ type: "divider"; date: string } | { type: "message"; msg: Message }> = [];
    let lastDate = "";
    for (const msg of messages) {
      const d = new Date(msg.createdAt).toDateString();
      if (d !== lastDate) {
        result.push({ type: "divider", date: msg.createdAt });
        lastDate = d;
      }
      result.push({ type: "message", msg });
    }
    return result;
  }, [messages]);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden bg-gray-50/50">

        {/* ── Left Panel ─────────────────────────────────────────────────── */}
        <div className="w-[280px] flex flex-col bg-white border-r border-gray-200 shrink-0">

          {/* Header */}
          <div className="px-4 pt-3.5 pb-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">Inbox</h2>
              <div className="flex items-center gap-0.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600" onClick={() => refetch()}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Refresh</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600"
                        onClick={() => markAllRead.mutate({ ids: conversations.filter(c => !c.isRead).map(c => c.id), action: "markRead" })}
                        disabled={markAllRead.isPending || conversations.filter(c => !c.isRead).length === 0}
                      >
                        {markAllRead.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Mark all read</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className={`h-7 w-7 transition-colors ${bulkMode ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-600"}`}
                        onClick={() => { setBulkMode(b => !b); setCheckedIds(new Set()); }}
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Bulk select</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <NewConversationDialog agencyId={AGENCY_ID} clientId={CLIENT_ID} onCreated={id => setSelectedConvId(id)} />
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search conversations…"
                className="pl-8 h-8 text-[13px] bg-gray-50 border-gray-200 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-blue-400"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearchQuery("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Smart list tabs */}
          <div className="flex gap-0.5 px-3 py-2 border-b border-gray-100 overflow-x-auto scrollbar-none">
            {SMART_LISTS.map(list => {
              const count =
                list.id === "unread" ? Number(stats?.unread || 0)
                : list.id === "sms" ? Number(stats?.sms || 0)
                : list.id === "email" ? Number(stats?.email || 0)
                : null;
              const isActive = activeList === list.id;
              return (
                <button
                  key={list.id}
                  onClick={() => setActiveList(list.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-all
                    ${isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                >
                  {list.label}
                  {count != null && count > 0 && (
                    <span className={`text-[10px] font-bold px-1 py-0 rounded-full min-w-[16px] text-center
                      ${isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>



          {/* Bulk action bar */}
          {bulkMode && checkedIds.size > 0 && (
            <div className="flex items-center gap-1 px-3 py-2 bg-blue-50 border-b border-blue-100">
              <span className="text-[12px] text-blue-700 font-semibold mr-1">{checkedIds.size} selected</span>
              <button
                className="text-[11px] px-2 py-1 rounded text-blue-700 hover:bg-blue-100 font-medium"
                onClick={() => bulkAction.mutate({ ids: Array.from(checkedIds), action: "markRead" })}
              >Read</button>
              <button
                className="text-[11px] px-2 py-1 rounded text-blue-700 hover:bg-blue-100 font-medium"
                onClick={() => bulkAction.mutate({ ids: Array.from(checkedIds), action: "markUnread" })}
              >Unread</button>
              <button
                className="text-[11px] px-2 py-1 rounded text-red-600 hover:bg-red-50 font-medium"
                onClick={() => bulkAction.mutate({ ids: Array.from(checkedIds), action: "archive" })}
              >Archive</button>
              <button className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => { setCheckedIds(new Set()); setBulkMode(false); }}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Conversation list */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-0">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-3 border-b border-gray-100 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                      <div className="h-2.5 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-5">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <Inbox className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-[13px] font-medium text-gray-600 mb-1">
                  {activeList === "mine" ? "No conversations assigned to you"
                    : activeTagFilter ? `No "${activeTagFilter}" conversations`
                    : "No conversations yet"}
                </p>
                <p className="text-[12px] text-gray-400 mb-4">Start one with the + button above</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isSelected={selectedConvId === conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  bulkMode={bulkMode}
                  isChecked={checkedIds.has(conv.id)}
                  onCheck={checked => {
                    setCheckedIds(prev => {
                      const next = new Set(prev);
                      if (checked) next.add(conv.id); else next.delete(conv.id);
                      return next;
                    });
                  }}
                />
              ))
            )}
          </ScrollArea>
        </div>

        {/* ── Right Panel ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedConv ? (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={`text-[12px] font-bold bg-gradient-to-br ${getAvatarGradient(displayName)} text-white`}>
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-[14px] truncate">{displayName}</h3>
                      {(() => {
                        const ch = CHANNEL_CONFIG[selectedConv.channel] || CHANNEL_CONFIG.sms;
                        const ChIcon = ch.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${ch.bg} ${ch.text} ${ch.border}`}>
                            <ChIcon className="h-2.5 w-2.5" />
                            {ch.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[12px] text-gray-400 truncate">
                      {selectedConv.contactPhone || selectedConv.contactEmail || "No contact info"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant={showContactDrawer ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[12px] gap-1 border-gray-200"
                    onClick={() => setShowContactDrawer(v => !v)}
                  >
                    <Info className="h-3 w-3" />
                    Contact
                  </Button>
                  {selectedConv.leadId && (
                    <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1 border-gray-200"
                      onClick={() => window.open(`/leads/${selectedConv.leadId}`, "_blank")}>
                      View Lead <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Tag editor */}
                  <Popover open={tagEditorOpen} onOpenChange={setTagEditorOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1 border-gray-200">
                        <Tag className="h-3 w-3" />
                        {parseTags(selectedConv.tags).length > 0
                          ? <span className="max-w-[80px] truncate">{parseTags(selectedConv.tags).join(", ")}</span>
                          : "Tag"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1.5" align="end">
                      <p className="text-[10px] text-gray-400 px-2 py-1 font-semibold uppercase tracking-wider mb-1">Labels</p>
                      {PRESET_TAGS.map(t => {
                        const currentTags = parseTags(selectedConv.tags);
                        const isActive = currentTags.includes(t.label);
                        return (
                          <button
                            key={t.label}
                            className="w-full text-left px-2 py-1.5 text-[12px] rounded-md flex items-center justify-between hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              const next = isActive ? currentTags.filter(x => x !== t.label) : [...currentTags, t.label];
                              updateTags.mutate({ id: selectedConv.id, tags: next });
                            }}
                          >
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${t.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                              {t.label}
                            </span>
                            {isActive && <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />}
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>

                  {/* Assign */}
                  <Popover open={assignOpen} onOpenChange={setAssignOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1 border-gray-200">
                        <UserCheck className="h-3 w-3" />
                        <span className="max-w-[72px] truncate">{selectedConv.assignedToName || "Assign"}</span>
                        <ChevronDown className="h-3 w-3 opacity-40" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="end">
                      <p className="text-[10px] text-gray-400 px-2 py-1 font-semibold uppercase tracking-wider">Assign to</p>
                      <button
                        className="w-full text-left px-2 py-1.5 text-[12px] rounded-md hover:bg-gray-100 text-gray-500"
                        onClick={() => assignConv.mutate({ id: selectedConv.id, userId: null, userName: null })}
                      >Unassigned</button>
                      {teamMembers.map(m => (
                        <button
                          key={m.id}
                          className="w-full text-left px-2 py-1.5 text-[12px] rounded-md hover:bg-gray-100 text-gray-800"
                          onClick={() => assignConv.mutate({ id: selectedConv.id, userId: m.user_id || m.id, userName: m.name })}
                        >
                          {m.name}
                          {m.role && <span className="ml-1 text-gray-400">· {m.role}</span>}
                        </button>
                      ))}
                      {teamMembers.length === 0 && <p className="text-[12px] text-gray-400 px-2 py-2">No team members</p>}
                    </PopoverContent>
                  </Popover>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem className="text-[13px]" onClick={() => markUnread.mutate({ id: selectedConv.id, isRead: false })}>
                        Mark as Unread
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[13px] text-red-600 focus:text-red-600"
                        onClick={() => archiveConv.mutate({ id: selectedConv.id, isArchived: true })}>
                        Archive Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Message thread */}
              <ScrollArea className="flex-1 bg-gray-50/60">
                <div className="px-5 py-4 max-w-3xl mx-auto">
                  {msgsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                    </div>
                  ) : groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <MessageSquare className="h-5 w-5 text-gray-300" />
                      </div>
                      <p className="text-[13px] text-gray-400">No messages yet — send the first one below</p>
                    </div>
                  ) : (
                    groupedMessages.map((item, i) =>
                      item.type === "divider"
                        ? <DateDivider key={`div-${i}`} dateStr={item.date} />
                        : <MessageBubble key={item.msg.id} msg={item.msg} channel={selectedConv.channel} />
                    )
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Compose box */}
              <div className="bg-white border-t border-gray-200 shrink-0">
                {/* Channel selector */}
                <div className="flex items-center gap-0 border-b border-gray-100 px-4">
                  {(["sms", "email", "note"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setComposeTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-all
                        ${composeTab === tab
                          ? tab === "note"
                            ? "border-amber-400 text-amber-600"
                            : "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                    >
                      {tab === "sms" && <Phone className="w-3.5 h-3.5" />}
                      {tab === "email" && <Mail className="w-3.5 h-3.5" />}
                      {tab === "note" && <StickyNote className="w-3.5 h-3.5" />}
                      {tab === "sms" ? "SMS" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2 py-2">
                    {composeTab === "sms" && selectedConv.contactPhone && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {selectedConv.contactPhone}
                      </span>
                    )}
                    {composeTab === "email" && selectedConv.contactEmail && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {selectedConv.contactEmail}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 pt-2 pb-3">
                  {composeTab === "email" && (
                    <input
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Subject line…"
                      className="w-full mb-2 h-8 text-[13px] px-3 rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400"
                    />
                  )}
                  <div className="flex gap-2 items-end">
                    <Textarea
                      placeholder={
                        composeTab === "sms" ? "Type an SMS…"
                        : composeTab === "email" ? "Write your email…"
                        : "Add an internal note…"
                      }
                      className={`flex-1 min-h-[72px] max-h-[160px] text-[13px] resize-none border-gray-200 bg-gray-50 placeholder:text-gray-400 focus-visible:ring-1
                        ${composeTab === "note" ? "focus-visible:ring-amber-400 bg-amber-50/40 border-amber-200" : "focus-visible:ring-blue-400"}`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        className={`w-9 h-9 shadow-sm ${composeTab === "note" ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                        onClick={handleSend}
                        disabled={!replyText.trim() || sendMessage.isPending}
                        title="Send (⌘+Enter)"
                      >
                        {sendMessage.isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Send className="h-4 w-4" />}
                      </Button>
                      <Popover open={showTemplates} onOpenChange={setShowTemplates}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="w-9 h-9 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Templates"
                            disabled={composeTab === "note"}
                          >
                            <LayoutTemplate className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-1" align="end" side="top">
                          <p className="text-[10px] text-gray-400 px-2 py-1 font-semibold uppercase tracking-wider">
                            {composeTab === "sms" ? "SMS Templates" : "Email Templates"}
                          </p>
                          {(composeTab === "sms" ? smsTemplates : emailTemplates).length === 0 ? (
                            <p className="text-[12px] text-gray-400 px-2 py-3 text-center">No templates yet</p>
                          ) : (
                            (composeTab === "sms" ? smsTemplates : emailTemplates).map((t: any) => (
                              <button
                                key={t.id}
                                className="w-full text-left px-2 py-2 rounded-md hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                  if (composeTab === "email" && t.subject) setEmailSubject(t.subject);
                                  setReplyText(prev => prev ? prev + "\n" + t.content : t.content);
                                  setShowTemplates(false);
                                }}
                              >
                                <div className="text-[12px] font-medium text-gray-800 truncate">{t.name}</div>
                                <div className="text-[11px] text-gray-400 truncate mt-0.5">{t.content.slice(0, 60)}…</div>
                              </button>
                            ))
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">⌘+Enter to send</p>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50/40">
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-700 mb-1">Select a conversation</h3>
              <p className="text-[13px] text-gray-400 max-w-xs mb-5">
                Choose a conversation from the left panel, or start a new one.
              </p>
              <NewConversationDialog agencyId={AGENCY_ID} clientId={CLIENT_ID} onCreated={id => setSelectedConvId(id)} />
              {stats && (
                <div className="flex gap-8 mt-8 text-center">
                  {[
                    { val: stats.total, label: "Total", color: "text-gray-800" },
                    { val: stats.unread, label: "Unread", color: "text-blue-600" },
                    { val: stats.sms, label: "SMS", color: "text-emerald-600" },
                    { val: stats.email, label: "Email", color: "text-indigo-600" },
                  ].map(s => (
                    <div key={s.label}>
                      <div className={`text-2xl font-bold ${s.color}`}>{Number(s.val) || 0}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Contact Info Drawer ──────────────────────────────────────────── */}
        {showContactDrawer && selectedConv && (
          <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-[13px] font-semibold text-gray-800">Contact Info</h3>
              <button onClick={() => setShowContactDrawer(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={`text-[14px] font-bold bg-gradient-to-br ${getAvatarGradient(displayName)} text-white`}>
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[14px] font-semibold text-gray-900">{displayName}</p>
                  <p className="text-[11px] text-gray-400 capitalize">{selectedConv.channel} conversation</p>
                </div>
              </div>
              {/* Contact fields */}
              <div className="space-y-2.5">
                {selectedConv.contactPhone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <a href={`tel:${selectedConv.contactPhone}`} className="text-[12px] text-blue-600 hover:underline">{selectedConv.contactPhone}</a>
                  </div>
                )}
                {selectedConv.contactEmail && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <a href={`mailto:${selectedConv.contactEmail}`} className="text-[12px] text-blue-600 hover:underline truncate">{selectedConv.contactEmail}</a>
                  </div>
                )}
              </div>
              {/* Lead detail from DB */}
              {leadDetail && (
                <>
                  <div className="border-t border-gray-100 pt-3 space-y-2.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pipeline</p>
                    {(leadDetail as any).status && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500">Status</span>
                        <Badge variant="outline" className="text-[11px] capitalize">{(leadDetail as any).status}</Badge>
                      </div>
                    )}
                    {(leadDetail as any).loanType && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500">Loan Type</span>
                        <span className="text-[12px] font-medium text-gray-800 capitalize">{(leadDetail as any).loanType}</span>
                      </div>
                    )}
                    {(leadDetail as any).loanAmount && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500">Loan Amount</span>
                        <span className="text-[12px] font-medium text-gray-800">${Number((leadDetail as any).loanAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {(leadDetail as any).creditScore && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500">Credit Score</span>
                        <span className="text-[12px] font-medium text-gray-800">{(leadDetail as any).creditScore}</span>
                      </div>
                    )}
                    {(leadDetail as any).source && (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-500">Source</span>
                        <span className="text-[12px] font-medium text-gray-800 capitalize">{(leadDetail as any).source}</span>
                      </div>
                    )}
                  </div>
                  {(leadDetail as any).notes && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes</p>
                      <p className="text-[12px] text-gray-600 leading-relaxed">{(leadDetail as any).notes}</p>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Activity</p>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-[16px] font-bold text-gray-800">{Number((leadDetail as any).activityCount) || 0}</div>
                        <div className="text-[10px] text-gray-400">Activities</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[16px] font-bold text-gray-800">{Number((leadDetail as any).appointmentCount) || 0}</div>
                        <div className="text-[10px] text-gray-400">Appts</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {/* Quick actions */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</p>
                {selectedConv.leadId && (
                  <Button variant="outline" size="sm" className="w-full h-8 text-[12px] justify-start gap-2"
                    onClick={() => window.open(`/leads/${selectedConv.leadId}`, "_blank")}>
                    <ChevronRight className="h-3.5 w-3.5" /> View Full Profile
                  </Button>
                )}
                {selectedConv.contactPhone && (
                  <Button variant="outline" size="sm" className="w-full h-8 text-[12px] justify-start gap-2"
                    onClick={() => window.open(`tel:${selectedConv.contactPhone}`)}
                  >
                    <Phone className="h-3.5 w-3.5" /> Call {selectedConv.contactPhone}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ── AI Coach sidebar ────────────────────────────────────────────── */}
        {!showContactDrawer && (
          <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 hidden xl:block">
            <AISuccessCoachPanel context="conversations" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
