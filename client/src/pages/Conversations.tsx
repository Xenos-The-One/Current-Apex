import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Facebook,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  sms: MessageSquare,
  email: Mail,
  facebook: Facebook,
  call: Phone,
};

const CHANNEL_COLORS: Record<string, string> = {
  sms: "bg-blue-100 text-blue-600",
  email: "bg-purple-100 text-purple-600",
  facebook: "bg-indigo-100 text-indigo-600",
  call: "bg-green-100 text-green-600",
};

export default function Conversations() {
  const { agencyId } = useAgency();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState("");

  const { data: convos, isLoading, refetch } = trpc.conversations.list.useQuery(
    { agencyId },
    { enabled: agencyId > 0 }
  );

  const { data: messages, isLoading: msgsLoading } = trpc.conversations.getMessages.useQuery(
    { conversationId: selectedId! },
    { enabled: selectedId !== null }
  );

  const sendMessage = trpc.conversations.sendMessage.useMutation({
    onSuccess: () => {
      toast.success("Message sent");
      setReply("");
      refetch();
    },
    onError: () => toast.error("Failed to send message"),
  });

  const allConvos = (convos ?? []) as any[];
  const filtered = allConvos.filter((c: any) => {
    const matchSearch = !search || (c.contactName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === "all" || c.channel === channelFilter;
    return matchSearch && matchChannel;
  });

  const selected = allConvos.find((c: any) => c.id === selectedId);
  const allMessages = (messages ?? []) as any[];

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        {/* Left: conversation list */}
        <div className="w-80 flex-shrink-0 border-r border-border flex flex-col bg-background">
          {/* Header */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Conversations</h2>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => refetch()}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {["all", "sms", "email", "facebook"].map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors capitalize ${channelFilter === ch ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No conversations yet
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map((c: any) => {
                  const Icon = CHANNEL_ICONS[c.channel] ?? MessageSquare;
                  const colorClass = CHANNEL_COLORS[c.channel] ?? "bg-gray-100 text-gray-600";
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-muted ${selectedId === c.id ? "bg-primary/10 border border-primary/20" : ""}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold truncate">{c.contactName ?? "Unknown"}</p>
                            {c.unreadCount > 0 && (
                              <Badge className="h-4 min-w-4 text-xs bg-primary text-primary-foreground border-0 px-1 flex-shrink-0">
                                {c.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage ?? "No messages yet"}</p>
                          {c.lastMessageAt && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              {new Date(c.lastMessageAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: message thread */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">Select a conversation</p>
              <p className="text-sm text-muted-foreground/70">Choose a conversation from the left to view messages</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="h-14 border-b border-border bg-background flex items-center gap-3 px-4 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{selected.contactName ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selected.channel} · {selected.contactPhone ?? selected.contactEmail ?? ""}</p>
                </div>
                <div className="ml-auto">
                  <Badge variant="outline" className="capitalize text-xs">{selected.status ?? "open"}</Badge>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {msgsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : allMessages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">No messages in this conversation yet.</div>
                ) : (
                  <div className="space-y-3">
                    {allMessages.map((msg: any) => {
                      const isOutbound = msg.direction === "outbound";
                      return (
                        <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isOutbound ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-background border border-border rounded-bl-sm"}`}>
                            <p>{msg.content}</p>
                            <p className={`text-xs mt-1 ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Reply box */}
              <div className="border-t border-border bg-background p-3 flex-shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder={`Reply via ${selected.channel}...`}
                    rows={2}
                    className="resize-none text-sm"
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (reply.trim()) {
                          sendMessage.mutate({ conversationId: selected.id, content: reply.trim(), direction: "outbound" });
                        }
                      }
                    }}
                  />
                  <Button
                    className="self-end gap-1.5"
                    disabled={!reply.trim() || sendMessage.isPending}
                    onClick={() => {
                      if (reply.trim()) {
                        sendMessage.mutate({ conversationId: selected.id, content: reply.trim(), direction: "outbound" });
                      }
                    }}
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Press Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
