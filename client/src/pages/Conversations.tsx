import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AGENCY_ID = 1;

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
};

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

function ConversationItem({ conv, isSelected, onClick }: { conv: Conversation; isSelected: boolean; onClick: () => void }) {
  const displayName = conv.contactName || [conv.first_name, conv.last_name].filter(Boolean).join(" ") || "Unknown";
  const isUnread = !conv.isRead;
  const channelIcon = conv.channel === "sms" ? <Phone className="h-2.5 w-2.5" /> : conv.channel === "email" ? <Mail className="h-2.5 w-2.5" /> : <MessageCircle className="h-2.5 w-2.5" />;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
    >
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
          {conv.lead_status && (
            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 mt-1">{conv.lead_status.replace(/_/g, " ")}</span>
          )}
        </div>
        {isUnread && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
      </div>
    </button>
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

export default function Conversations() {
  const [activeList, setActiveList] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const queryParams = useMemo(() => {
    const base: Record<string, any> = { agencyId: AGENCY_ID };
    if (searchQuery) base.search = searchQuery;
    if (activeList === "unread") base.isRead = false;
    else if (activeList === "archived") base.isArchived = true;
    else if (activeList === "sms") base.channel = "sms";
    else if (activeList === "email") base.channel = "email";
    return base;
  }, [activeList, searchQuery]);

  const { data: conversations = [], isLoading, refetch } = trpc.conversations.list.useQuery(queryParams, { refetchInterval: 30000 });
  const { data: stats } = trpc.conversations.getStats.useQuery({ agencyId: AGENCY_ID });
  const { data: messages = [], isLoading: msgsLoading } = trpc.conversations.getMessages.useQuery(
    { conversationId: selectedConvId!, agencyId: AGENCY_ID },
    { enabled: !!selectedConvId, refetchInterval: 10000 }
  );

  const markRead = trpc.conversations.markRead.useMutation({ onSuccess: () => utils.conversations.list.invalidate() });
  const markUnread = trpc.conversations.markUnread.useMutation({ onSuccess: () => { utils.conversations.list.invalidate(); toast.success("Marked as unread"); } });
  const archiveConv = trpc.conversations.archive.useMutation({ onSuccess: () => { utils.conversations.list.invalidate(); setSelectedConvId(null); toast.success("Archived"); } });
  const sendMessage = trpc.conversations.sendMessage.useMutation({
    onSuccess: () => { setReplyText(""); utils.conversations.getMessages.invalidate({ conversationId: selectedConvId!, agencyId: AGENCY_ID }); utils.conversations.list.invalidate(); },
    onError: () => toast.error("Failed to send message"),
  });

  const selectedConv = (conversations as Conversation[]).find(c => c.id === selectedConvId);

  useEffect(() => {
    if (selectedConvId && selectedConv && !selectedConv.isRead) markRead.mutate({ id: selectedConvId, agencyId: AGENCY_ID });
  }, [selectedConvId]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!replyText.trim() || !selectedConvId) return;
    sendMessage.mutate({ conversationId: selectedConvId, agencyId: AGENCY_ID, content: replyText.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

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
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 text-gray-500" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("New conversation — coming soon")}><Plus className="h-3.5 w-3.5 text-gray-500" /></Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="Search conversations..." className="pl-8 h-8 text-sm bg-gray-50 border-gray-200" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
            {SMART_LISTS.map(list => {
              const count = list.id === "unread" ? Number(stats?.unread || 0) : list.id === "sms" ? Number(stats?.sms || 0) : list.id === "email" ? Number(stats?.email || 0) : null;
              return (
                <button key={list.id} onClick={() => setActiveList(list.id)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeList === list.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {list.label}
                  {count != null && count > 0 && <span className={`text-[9px] font-bold ml-0.5 ${activeList === list.id ? "text-blue-100" : "text-gray-500"}`}>{count}</span>}
                </button>
              );
            })}
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-gray-400" /></div>
            ) : (conversations as Conversation[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500">No conversations</p>
                <p className="text-xs text-gray-400 mt-1">Messages from leads will appear here</p>
              </div>
            ) : (
              (conversations as Conversation[]).map(conv => (
                <ConversationItem key={conv.id} conv={conv} isSelected={selectedConvId === conv.id} onClick={() => setSelectedConvId(conv.id)} />
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
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-400 to-indigo-500 text-white">{getInitials(displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{displayName}</h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[selectedConv.channel]}`}>{selectedConv.channel.toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-gray-400">{selectedConv.contactPhone || selectedConv.contactEmail || "No contact info"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConv.leadId && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.open(`/leads/${selectedConv.leadId}`, "_blank")}>View Lead</Button>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4 text-gray-500" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => markUnread.mutate({ id: selectedConv.id, agencyId: AGENCY_ID })}>Mark as Unread</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => archiveConv.mutate({ id: selectedConv.id, agencyId: AGENCY_ID })}>Archive Conversation</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <ScrollArea className="flex-1 px-5 py-4 bg-gray-50">
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-gray-400" /></div>
                ) : (messages as Message[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">No messages yet</p>
                  </div>
                ) : (
                  <>{(messages as Message[]).map(msg => <MessageBubble key={msg.id} msg={msg} />)}<div ref={messagesEndRef} /></>
                )}
              </ScrollArea>
              <div className="px-4 py-3 bg-white border-t border-gray-200 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CHANNEL_COLORS[selectedConv.channel]}`}>Replying via {selectedConv.channel.toUpperCase()}</span>
                  {selectedConv.channel === "sms" && selectedConv.contactPhone && <span className="text-[10px] text-gray-400">to {selectedConv.contactPhone}</span>}
                  {selectedConv.channel === "email" && selectedConv.contactEmail && <span className="text-[10px] text-gray-400">to {selectedConv.contactEmail}</span>}
                </div>
                <div className="flex gap-2 items-end">
                  <Textarea placeholder="Type a message... (Enter to send, Shift+Enter for new line)" className="flex-1 min-h-[60px] max-h-[120px] text-sm resize-none bg-gray-50 border-gray-200" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={handleKeyDown} />
                  <Button size="sm" className="h-9 px-4 bg-blue-600 hover:bg-blue-700 shrink-0" onClick={handleSend} disabled={!replyText.trim() || sendMessage.isPending}><Send className="h-4 w-4" /></Button>
                </div>
                {(selectedConv.channel === "sms" || selectedConv.channel === "email") && (
                  <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedConv.channel === "sms" ? "Twilio SMS integration required to deliver live messages" : "SendGrid email integration required to deliver live messages"}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">Select a conversation</h3>
              <p className="text-sm text-gray-400 max-w-xs">Choose a conversation from the left panel to view and reply to messages</p>
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
      </div>
    </DashboardLayout>
  );
}
