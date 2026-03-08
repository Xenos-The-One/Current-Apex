import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  MessageSquare,
  Mail,
  Phone,
  Search,
  Send,
  Clock,
  User,
  Filter,
  Inbox,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useState, useMemo } from "react";

export default function Conversations() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  // Fetch inbound emails for conversation data
  const { data: emailData, isLoading: emailsLoading } = trpc.notificationCenter.getInboundEmails.useQuery({
    page: 1,
    limit: 50,
  });

  // Fetch email stats
  const { data: emailStats } = trpc.notificationCenter.getInboundEmailStats.useQuery();

  const emails = emailData?.emails || [];

  const filteredEmails = useMemo(() => {
    let filtered = emails;
    if (selectedTab === "unread") {
      filtered = filtered.filter((e: any) => !e.isRead);
    } else if (selectedTab === "unreplied") {
      filtered = filtered.filter((e: any) => !e.isReplied);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e: any) =>
          e.fromName?.toLowerCase().includes(q) ||
          e.fromEmail?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [emails, selectedTab, searchQuery]);

  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  // Mark as read mutation
  const markRead = trpc.notificationCenter.markEmailRead.useMutation({
    onSuccess: () => {
      // Refetch
    },
  });

  const handleSelectEmail = (email: any) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      markRead.mutate({ id: email.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground mt-1">
            Unified messaging hub for all lead and client communications.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <Inbox className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{emailStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{emailStats?.unread || 0}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <Clock className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{emailStats?.unreplied || 0}</p>
                <p className="text-xs text-muted-foreground">Needs Reply</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Conversation Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
          {/* Left: Message List */}
          <Card className="lg:col-span-1 flex flex-col">
            <div className="p-3 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="w-full h-8">
                  <TabsTrigger value="all" className="text-xs flex-1">All</TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs flex-1">
                    Unread
                    {(emailStats?.unread || 0) > 0 && (
                      <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">
                        {emailStats?.unread}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="unreplied" className="text-xs flex-1">Needs Reply</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <ScrollArea className="flex-1">
              {emailsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">No conversations</p>
                  <p className="text-xs mt-1">Messages will appear here</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEmails.map((email: any) => (
                    <button
                      key={email.id}
                      className={`w-full text-left p-3 hover:bg-accent/50 transition-colors ${
                        selectedEmail?.id === email.id ? "bg-accent" : ""
                      } ${!email.isRead ? "bg-primary/5" : ""}`}
                      onClick={() => handleSelectEmail(email)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${!email.isRead ? "font-semibold" : "font-medium"}`}>
                              {email.fromName || email.fromEmail}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(email.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {email.subject}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {!email.isRead && (
                              <Badge variant="default" className="h-4 text-[9px] px-1">
                                New
                              </Badge>
                            )}
                            {email.isReplied && (
                              <Badge variant="outline" className="h-4 text-[9px] px-1">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                Replied
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Right: Message Detail */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedEmail ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedEmail.subject}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          From: <span className="font-medium text-foreground">{selectedEmail.fromName || selectedEmail.fromEmail}</span>
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(selectedEmail.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedEmail.isReplied ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Replied
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Awaiting Reply
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {selectedEmail.htmlBody ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }} />
                    ) : (
                      <p className="whitespace-pre-wrap">{selectedEmail.body}</p>
                    )}
                  </div>
                  {selectedEmail.replyBody && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Your Reply:</p>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm whitespace-pre-wrap">{selectedEmail.replyBody}</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input placeholder="Type a reply..." className="flex-1" disabled />
                    <Button size="sm" disabled>
                      <Send className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Use the Client Inbox page for full reply functionality
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">Select a conversation</p>
                <p className="text-sm mt-1">Choose a message from the list to view details</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
