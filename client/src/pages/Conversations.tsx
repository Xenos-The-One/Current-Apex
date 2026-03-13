import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import AISuccessCoachPanel from "@/components/AISuccessCoachPanel";
import { useAgency } from "@/contexts/AgencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare,
  Mail,
  Phone,
  Search,
  Send,
  Archive,
  MoreVertical,
  CheckCheck,
  Clock,
  Plus,
  RefreshCw,
  MessageCircle,
  Loader2,
  StickyNote,
  Paperclip,
  UserCheck,
  ChevronDown,
  LayoutTemplate,
  CheckCheck as DoubleCheck,
  Tag,
  X,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  first_name?: string;
  last_name?: string;
  lead_status?: string;
  message_count?: number;
  tags?: string | string[] | null;
};

const PRESET_TAGS = [
  { label: "Hot Lead", color: "bg-red-100 text-red-700 border-red-200" },
  { label: "Follow Up", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { label: "Urgent", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { label: "Qualified", color: "bg-green-100 text-green-700 border-green-200" },
  { label: "Nurture", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { label: "Closed", color: "bg-gray-100 text-gray-600 border-gray-200" },
];

function getTagColor(label: string) {
  return PRESET_TAGS.find(t => t.label === label)?.color || "bg-blue-100 text-blue-700 border-blue-200";
}

function parseTags(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

type Message = {
  id: number;
  conversationId: number;
  direction: "inbound" | "outbound";
  content: string;
  status: string;
  createdAt: string;
};

const CHANNEL_COLORS: Record<string, string> = {
  sms: "bg-green-100 text-green-700",
  email: "bg-blue-100 text-blue-700",
  facebook: "bg-indigo-100 text-indigo-700",
  instagram: "bg-pink-100 text-pink-700",
  whatsapp: "bg-emerald-100 text-emerald-700",
};

const SMART_LISTS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mine", label: "Mine" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "archived", label: "Archived" },
];

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / 3600000;
  if (diffHours < 1) return `${Math.round(diffMs / 60000)}m ago`;
  if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
  if (diffHours < 168) return `${Math.round(diffHours / 24)}d ago`;
  return d.toLocaleDateString();
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
}

function ConversationItem({ conv, isSelected, onClick, isChecked, onCheck, bulkMode }: { conv: Conversation; isSelected: boolean; onClick: () => void; isChecked?: boolean; onCheck?: (checked: boolean) => void; bulkMode?: boolean }) {
  const displayName = conv.contactName || [conv.first_name, conv.last_name].filter(Boolean).join(" ") || "Unknown";
  const isUnread = !conv.isRead;
  const channelIcon = conv.channel === "sms"
    ? <Phone className="h-2.5 w-2.5" />
    : conv.channel === "email"
    ? <Mail className="h-2.5 w-2.5" />
    : <MessageCircle className="h-2.5 w-2.5" />;
  const tags = parseTags(conv.tags);

  return (
    <div
      className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-2 ${
        isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
      }`}
    >
      {bulkMode && (
        <button
          className="shrink-0 mt-1 text-gray-400 hover:text-blue-600"
          onClick={e => { e.stopPropagation(); onCheck?.(!isChecked); }}
        >
          {isChecked ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
        </button>
      )}
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <div className="flex items-start gap-2.5">
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 ${CHANNEL_COLORS[conv.channel] || "bg-gray-100"}`}>
              {channelIcon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className={`text-sm truncate ${isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>{displayName}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{formatTime(conv.lastMessageAt)}</span>
            </div>
            <p className={`text-xs truncate mt-0.5 ${isUnread ? "text-gray-700" : "text-gray-400"}`}>{conv.lastMessagePreview || "No messages yet"}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {conv.lead_status && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{conv.lead_status.replace(/_/g, " ")}</span>
              )}
              {tags.map(tag => (
                <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${getTagColor(tag)}`}>{tag}</span>
              ))}
            </div>
          </div>
          {isUnread && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
        </div>
      </button>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOutbound = msg.direction === "outbound";
  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isOutbound ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"}`}>
        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isOutbound ? "text-blue-200" : "text-gray-400"}`}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isOutbound && <CheckCheck className="h-3 w-3 text-blue-200" />}
        </div>
      </div>
    </div>
  );
}

// ─── New Conversation Composer Dialog ────────────────────────────────────────
function NewConversationDialog({
  agencyId,
  onCreated,
}: {
  agencyId: number;
  onCreated: (convId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [leadId, setLeadId] = useState<string>("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  const { data: leadsRaw } = trpc.leads.list.useQuery(
    { agencyId, limit: 100 },
    { enabled: open }
  );
  const leadsList: any[] = Array.isArray(leadsRaw) ? leadsRaw : [];

  const createConv = trpc.conversations.create.useMutation();
  const sendMessage = trpc.conversations.sendMessage.useMutation();
  const utils = trpc.useUtils();

  const selectedLead = leadsList.find((l: any) => l.id?.toString() === leadId);

  // Auto-fill contact info from selected lead
  useEffect(() => {
    if (selectedLead) {
      setManualName(`${selectedLead.firstName} ${selectedLead.lastName}`);
      setManualPhone(selectedLead.phone || "");
      setManualEmail(selectedLead.email || "");
    }
  }, [leadId]);

  const canSend =
    (channel === "sms" ? manualPhone.trim() : manualEmail.trim()) &&
    firstMessage.trim();

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
      });

      if (firstMessage.trim()) {
        await sendMessage.mutateAsync({
          conversationId: conv.id,
          agencyId,
          content: firstMessage.trim(),
        });
      }

      utils.conversations.list.invalidate();
      utils.conversations.getStats.invalidate();
      toast.success(`${channel.toUpperCase()} conversation started with ${manualName || (channel === "sms" ? manualPhone : manualEmail)}`);
      setOpen(false);
      onCreated(conv.id);
      // Reset
      setLeadId("");
      setManualName("");
      setManualPhone("");
      setManualEmail("");
      setFirstMessage("");
    } catch (e: any) {
      toast.error("Failed to create conversation", { description: e.message });
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="New Conversation"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5 text-gray-500" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> New Conversation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            {/* Channel selector */}
            <div className="space-y-1.5">
              <Label className="text-sm">Channel</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setChannel("sms")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    channel === "sms"
                      ? "bg-green-50 border-green-400 text-green-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Phone className="w-4 h-4" /> SMS / Text
                </button>
                <button
                  onClick={() => setChannel("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    channel === "email"
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Mail className="w-4 h-4" /> Email
                </button>
              </div>
            </div>

            {/* Lead picker */}
            <div className="space-y-1.5">
              <Label className="text-sm">Select Lead (optional)</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Search leads..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">— Enter manually —</SelectItem>
                  {leadsList.map((lead: any) => (
                    <SelectItem key={lead.id} value={lead.id.toString()}>
                      {lead.firstName} {lead.lastName}
                      {lead.phone ? ` · ${lead.phone}` : ""}
                      {lead.email ? ` · ${lead.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact info */}
            <div className="space-y-1.5">
              <Label className="text-sm">Contact Name</Label>
              <Input
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Full name"
                className="text-sm"
              />
            </div>

            {channel === "sms" ? (
              <div className="space-y-1.5">
                <Label className="text-sm">Phone Number *</Label>
                <Input
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  placeholder="+1 555-0100"
                  className="text-sm"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-sm">Email Address *</Label>
                <Input
                  value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                  placeholder="contact@example.com"
                  type="email"
                  className="text-sm"
                />
              </div>
            )}

            {/* First message */}
            <div className="space-y-1.5">
              <Label className="text-sm">First Message *</Label>
              <Textarea
                value={firstMessage}
                onChange={e => setFirstMessage(e.target.value)}
                placeholder={
                  channel === "sms"
                    ? "Hi Sarah! This is Kyle from Premier Mortgage. I wanted to follow up on your loan inquiry..."
                    : "Hi Sarah,\n\nI wanted to reach out regarding your mortgage application..."
                }
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={!canSend || createConv.isPending || sendMessage.isPending}
                onClick={handleCreate}
              >
                {createConv.isPending || sendMessage.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Send {channel === "sms" ? "Text" : "Email"}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Conversations() {
  const { agencyId } = useAgency();
  const AGENCY_ID = agencyId || 1;

  const [activeList, setActiveList] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [composeTab, setComposeTab] = useState<"sms" | "email" | "note">("sms");
  const [emailSubject, setEmailSubject] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { user } = useAuth();

  const queryParams = useMemo(() => {
    const base: Record<string, any> = { agencyId: AGENCY_ID };
    if (searchQuery) base.search = searchQuery;
    if (activeList === "unread") base.isRead = false;
    else if (activeList === "archived") base.isArchived = true;
    else if (activeList === "sms") base.channel = "sms";
    else if (activeList === "email") base.channel = "email";
    // "mine" filter: client-side filter by assignedToUserId after fetch
    return base;
  }, [activeList, searchQuery, AGENCY_ID]);

   const { data: conversations = [], isLoading, refetch } = trpc.conversations.list.useQuery(queryParams, { refetchInterval: 30000 });
  // Client-side filter for "mine" tab and tag filter
  const filteredConversations = useMemo(() => {
    let all = conversations as Conversation[];
    if (activeList === "mine" && user) {
      all = all.filter((c: any) => c.assignedToUserId === user.id);
    }
    if (activeTagFilter) {
      all = all.filter(c => parseTags(c.tags).includes(activeTagFilter!));
    }
    return all;
  }, [conversations, activeList, user, activeTagFilter]);
  const { data: stats } = trpc.conversations.getStats.useQuery({ agencyId: AGENCY_ID });
  const { data: messages = [], isLoading: msgsLoading } = trpc.conversations.getMessages.useQuery(
    { conversationId: selectedConvId!, agencyId: AGENCY_ID },
    { enabled: !!selectedConvId, refetchInterval: 10000 }
  );
  const { data: teamMembers = [] } = trpc.conversations.getTeamMembers.useQuery({ agencyId: AGENCY_ID });
  const { data: smsTemplates = [] } = trpc.templates.list.useQuery(
    { type: "sms", agencyId: AGENCY_ID },
    { enabled: showTemplates && composeTab === "sms" }
  );
  const { data: emailTemplates = [] } = trpc.templates.list.useQuery(
    { type: "email", agencyId: AGENCY_ID },
    { enabled: showTemplates && composeTab === "email" }
  );

  const markRead = trpc.conversations.markRead.useMutation({ onSuccess: () => utils.conversations.list.invalidate() });
  const markUnread = trpc.conversations.markUnread.useMutation({ onSuccess: () => { utils.conversations.list.invalidate(); toast.success("Marked as unread"); } });
  const archiveConv = trpc.conversations.archive.useMutation({ onSuccess: () => { utils.conversations.list.invalidate(); setSelectedConvId(null); toast.success("Archived"); } });
  const markAllRead = trpc.conversations.markAllRead.useMutation({ onSuccess: () => { utils.conversations.list.invalidate(); utils.conversations.getStats.invalidate(); toast.success("All conversations marked as read"); } });
  const assignConv = trpc.conversations.assignConversation.useMutation({ onSuccess: () => { utils.conversations.list.invalidate(); setAssignOpen(false); toast.success("Conversation assigned"); } });
  const updateTags = trpc.conversations.updateTags.useMutation({
    onSuccess: () => { utils.conversations.list.invalidate(); toast.success("Tags updated"); setTagEditorOpen(false); },
    onError: () => toast.error("Failed to update tags"),
  });
  const bulkAction = trpc.conversations.bulkAction.useMutation({
    onSuccess: (data, vars) => {
      utils.conversations.list.invalidate();
      utils.conversations.getStats.invalidate();
      setCheckedIds(new Set());
      setBulkMode(false);
      const label = vars.action === "markRead" ? "Marked as read" : vars.action === "markUnread" ? "Marked as unread" : "Archived";
      toast.success(`${label}: ${data.count} conversation${data.count !== 1 ? "s" : ""}`);
    },
    onError: () => toast.error("Bulk action failed"),
  });

  const sendMessage = trpc.conversations.sendMessage.useMutation({
    onSuccess: () => {
      setReplyText("");
      utils.conversations.getMessages.invalidate({ conversationId: selectedConvId!, agencyId: AGENCY_ID });
      utils.conversations.list.invalidate();
    },
    onError: () => toast.error("Failed to send message"),
  });

  const selectedConv = (conversations as Conversation[]).find(c => c.id === selectedConvId);

  useEffect(() => {
    if (selectedConvId && selectedConv && !selectedConv.isRead) {
      markRead.mutate({ id: selectedConvId, agencyId: AGENCY_ID });
    }
  }, [selectedConvId]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!replyText.trim() || !selectedConvId) return;
    const content = composeTab === "email" && emailSubject.trim()
      ? `Subject: ${emailSubject.trim()}\n\n${replyText.trim()}`
      : replyText.trim();
    sendMessage.mutate({ conversationId: selectedConvId, agencyId: AGENCY_ID, content });
    setEmailSubject("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
  };

  // Sync compose tab to conversation channel when switching conversations
  useEffect(() => {
    if (selectedConv) {
      if (selectedConv.channel === "sms") setComposeTab("sms");
      else if (selectedConv.channel === "email") setComposeTab("email");
    }
  }, [selectedConvId]);

  const displayName = selectedConv
    ? selectedConv.contactName || [selectedConv.first_name, selectedConv.last_name].filter(Boolean).join(" ") || "Unknown"
    : "";

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden bg-gray-50">
        {/* Left Panel */}
        <div className="w-72 flex flex-col bg-white border-r border-gray-200 shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Conversations</h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Refresh" onClick={() => refetch()}>
                  <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  title="Mark all as read"
                  onClick={() => markAllRead.mutate({ agencyId: AGENCY_ID })}
                  disabled={markAllRead.isPending}
                >
                  {markAllRead.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" /> : <CheckCheck className="h-3.5 w-3.5 text-gray-500" />}
                </Button>
                <Button
                  variant="ghost" size="icon" className={`h-7 w-7 ${bulkMode ? "bg-blue-100 text-blue-600" : ""}`}
                  title="Bulk select"
                  onClick={() => { setBulkMode(b => !b); setCheckedIds(new Set()); }}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </Button>
                <NewConversationDialog
                  agencyId={AGENCY_ID}
                  onCreated={(convId) => setSelectedConvId(convId)}
                />
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-8 h-8 text-sm bg-gray-50 border-gray-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
            {SMART_LISTS.map(list => {
              const count =
                list.id === "unread" ? Number(stats?.unread || 0)
                : list.id === "sms" ? Number(stats?.sms || 0)
                : list.id === "email" ? Number(stats?.email || 0)
                : null;
              return (
                <button
                  key={list.id}
                  onClick={() => setActiveList(list.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeList === list.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {list.label}
                  {count != null && count > 0 && (
                    <span className={`text-[9px] font-bold ml-0.5 ${activeList === list.id ? "text-blue-100" : "text-gray-500"}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tag filter row */}
          <div className="flex gap-1 px-3 py-1.5 border-b border-gray-100 overflow-x-auto">
            <button
              onClick={() => setActiveTagFilter(null)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                !activeTagFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <Tag className="h-2.5 w-2.5" /> All Tags
            </button>
            {PRESET_TAGS.map(t => (
              <button
                key={t.label}
                onClick={() => setActiveTagFilter(activeTagFilter === t.label ? null : t.label)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap border transition-colors ${
                  activeTagFilter === t.label ? t.color + " ring-1 ring-offset-0" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Bulk action toolbar */}
          {bulkMode && checkedIds.size > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border-b border-blue-100">
              <span className="text-xs text-blue-700 font-medium mr-1">{checkedIds.size} selected</span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-blue-700 hover:bg-blue-100"
                onClick={() => bulkAction.mutate({ ids: Array.from(checkedIds), agencyId: AGENCY_ID, action: "markRead" })}>
                Mark Read
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-blue-700 hover:bg-blue-100"
                onClick={() => bulkAction.mutate({ ids: Array.from(checkedIds), agencyId: AGENCY_ID, action: "markUnread" })}>
                Mark Unread
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-red-600 hover:bg-red-50"
                onClick={() => bulkAction.mutate({ ids: Array.from(checkedIds), agencyId: AGENCY_ID, action: "archive" })}>
                <Archive className="h-3 w-3 mr-0.5" /> Archive
              </Button>
              <button className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => { setCheckedIds(new Set()); setBulkMode(false); }}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">
                  {activeList === "mine" ? "No conversations assigned to you" : activeTagFilter ? `No conversations tagged "${activeTagFilter}"` : "No conversations"}
                </p>
                <p className="text-xs text-gray-400 mt-1 mb-3">Start a new conversation by clicking the + button above</p>
                <NewConversationDialog
                  agencyId={AGENCY_ID}
                  onCreated={(convId) => setSelectedConvId(convId)}
                />
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
                  onCheck={(checked) => {
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

        {/* Right Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConv ? (
            <>
              <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{displayName}</h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[selectedConv.channel]}`}>
                        {selectedConv.channel.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{selectedConv.contactPhone || selectedConv.contactEmail || "No contact info"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConv.leadId && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(`/leads/${selectedConv.leadId}`, "_blank")}>
                      View Lead
                    </Button>
                  )}
                  {/* Tag editor */}
                  <Popover open={tagEditorOpen} onOpenChange={setTagEditorOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Tag className="h-3 w-3" />
                        {parseTags(selectedConv.tags).length > 0 ? parseTags(selectedConv.tags).join(", ") : "Tag"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2" align="end">
                      <div className="text-[10px] text-gray-400 px-1 py-1 font-medium uppercase tracking-wide mb-1">Add / Remove Tags</div>
                      {PRESET_TAGS.map(t => {
                        const currentTags = parseTags(selectedConv.tags);
                        const isActive = currentTags.includes(t.label);
                        return (
                          <button
                            key={t.label}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center justify-between hover:bg-gray-50 ${
                              isActive ? "font-semibold" : ""
                            }`}
                            onClick={() => {
                              const next = isActive
                                ? currentTags.filter(x => x !== t.label)
                                : [...currentTags, t.label];
                              updateTags.mutate({ id: selectedConv.id, agencyId: AGENCY_ID, tags: next });
                            }}
                          >
                            <span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${t.color}`}>{t.label}</span>
                            {isActive && <CheckCheck className="h-3 w-3 text-green-500" />}
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>

                  {/* Assignment dropdown */}
                  <Popover open={assignOpen} onOpenChange={setAssignOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <UserCheck className="h-3 w-3" />
                        {(selectedConv as any).assignedToName || "Assign"}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-1" align="end">
                      <div className="text-[10px] text-gray-400 px-2 py-1 font-medium uppercase tracking-wide">Assign to</div>
                      <button
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 text-gray-500"
                        onClick={() => assignConv.mutate({ id: selectedConv.id, agencyId: AGENCY_ID, assignedToUserId: null, assignedToName: null })}
                      >
                        Unassigned
                      </button>
                      {(teamMembers as any[]).map(m => (
                        <button
                          key={m.id}
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 text-gray-800"
                          onClick={() => assignConv.mutate({ id: selectedConv.id, agencyId: AGENCY_ID, assignedToUserId: m.user_id || m.id, assignedToName: m.name })}
                        >
                          {m.name}
                          {m.role && <span className="ml-1 text-gray-400">· {m.role}</span>}
                        </button>
                      ))}
                      {(teamMembers as any[]).length === 0 && (
                        <p className="text-xs text-gray-400 px-2 py-2">No team members found</p>
                      )}
                    </PopoverContent>
                  </Popover>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => markUnread.mutate({ id: selectedConv.id, agencyId: AGENCY_ID })}>
                        Mark as Unread
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => archiveConv.mutate({ id: selectedConv.id, agencyId: AGENCY_ID })}>
                        Archive Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <ScrollArea className="flex-1 px-5 py-4 bg-gray-50">
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : (messages as Message[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">No messages yet — send the first one below</p>
                  </div>
                ) : (
                  <>
                    {(messages as Message[]).map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </ScrollArea>

              <div className="px-4 py-3 bg-white border-t border-gray-200 shrink-0">
                {/* Channel tabs */}
                <div className="flex items-center gap-1 mb-2">
                  {(["sms", "email", "note"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setComposeTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        composeTab === tab
                          ? "bg-blue-600 text-white"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      {tab === "sms" && <Phone className="w-3.5 h-3.5" />}
                      {tab === "email" && <Mail className="w-3.5 h-3.5" />}
                      {tab === "note" && <StickyNote className="w-3.5 h-3.5" />}
                      {tab === "sms" ? "Sms" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    {composeTab === "sms" && selectedConv.contactPhone && (
                      <span className="text-[10px] text-gray-400">to {selectedConv.contactPhone}</span>
                    )}
                    {composeTab === "email" && selectedConv.contactEmail && (
                      <span className="text-[10px] text-gray-400">to {selectedConv.contactEmail}</span>
                    )}
                  </div>
                </div>
                {composeTab === "email" && (
                  <input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full mb-2 h-8 text-sm px-3 rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder={
                      composeTab === "sms" ? "Type an SMS message..."
                      : composeTab === "email" ? "Type your email..."
                      : "Add a note..."
                    }
                    className="flex-1 min-h-[72px] max-h-[140px] text-sm resize-none bg-gray-50 border-gray-200"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <div className="flex flex-col gap-1.5">
                    <Button
                      size="icon"
                      className="w-9 h-9 bg-blue-600 hover:bg-blue-700"
                      onClick={handleSend}
                      disabled={!replyText.trim() || sendMessage.isPending}
                      title="Send (Cmd+Enter)"
                    >
                      {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                    <Popover open={showTemplates} onOpenChange={setShowTemplates}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 text-gray-400 hover:text-blue-600"
                          title="Insert template"
                          disabled={composeTab === "note"}
                        >
                          <LayoutTemplate className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-1" align="end" side="top">
                        <div className="text-[10px] text-gray-400 px-2 py-1 font-medium uppercase tracking-wide">
                          {composeTab === "sms" ? "SMS Templates" : "Email Templates"}
                        </div>
                        {(composeTab === "sms" ? smsTemplates : emailTemplates).length === 0 ? (
                          <p className="text-xs text-gray-400 px-2 py-3 text-center">No templates yet — create them in Campaigns</p>
                        ) : (
                          (composeTab === "sms" ? smsTemplates : emailTemplates).map((t: any) => (
                            <button
                              key={t.id}
                              className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 group"
                              onClick={() => {
                                if (composeTab === "email" && t.subject) setEmailSubject(t.subject);
                                setReplyText(prev => prev ? prev + "\n" + t.content : t.content);
                                setShowTemplates(false);
                              }}
                            >
                              <div className="text-xs font-medium text-gray-800 truncate">{t.name}</div>
                              <div className="text-[10px] text-gray-400 truncate mt-0.5">{t.content.slice(0, 60)}...</div>
                            </button>
                          ))
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Cmd+Enter to send</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">Select a conversation</h3>
              <p className="text-sm text-gray-400 max-w-xs mb-4">
                Choose a conversation from the left panel, or start a new one.
              </p>
              <NewConversationDialog
                agencyId={AGENCY_ID}
                onCreated={(convId) => setSelectedConvId(convId)}
              />
              {stats && (
                <div className="flex gap-6 mt-6">
                  <div className="text-center"><div className="text-2xl font-bold text-gray-800">{Number(stats.total) || 0}</div><div className="text-xs text-gray-400">Total</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-blue-600">{Number(stats.unread) || 0}</div><div className="text-xs text-gray-400">Unread</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-green-600">{Number(stats.sms) || 0}</div><div className="text-xs text-gray-400">SMS</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-indigo-600">{Number(stats.email) || 0}</div><div className="text-xs text-gray-400">Email</div></div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* AI Coach sidebar */}
        <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 hidden xl:block">
          <AISuccessCoachPanel context="conversations" />
        </div>
      </div>
    </DashboardLayout>
  );
}
