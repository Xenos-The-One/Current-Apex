import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CheckCheck,
  FileText,
  Image,
  Inbox,
  MessageSquare,
  PenSquare,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── Content Studio Tab ────────────────────────────────────────────────────
function ContentStudioTab({ agencyId }: { agencyId: number }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", platform: "linkedin" as const, content: "", scheduledAt: "" });
  const [generating, setGenerating] = useState(false);

  const { data: posts = [], refetch } = trpc.content.listPosts.useQuery({ agencyId, limit: 20 });

  const createPost = trpc.content.createPost.useMutation({
    onSuccess: () => { toast.success("Post created"); setShowCreate(false); refetch(); },
    onError: () => toast.error("Failed to create post"),
  });

  const generateContent = trpc.ai.generateEmailContent.useMutation({
    onSuccess: (data: { subject: string; body: string }) => {
      setForm(p => ({ ...p, content: data.body }));
      setGenerating(false);
    },
    onError: () => { toast.error("Failed to generate content"); setGenerating(false); },
  });

  const PLATFORM_COLORS: Record<string, string> = {
    linkedin: "bg-blue-100 text-blue-700",
    facebook: "bg-indigo-100 text-indigo-700",
    instagram: "bg-pink-100 text-pink-700",
    twitter: "bg-sky-100 text-sky-700",
    blog: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{posts.length} posts</p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Post</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Social Post</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Post title" />
                </div>
                <div>
                  <Label>Platform</Label>
                  <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Content *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs gap-1"
                    onClick={() => {
                      setGenerating(true);
                      generateContent.mutate({
                        purpose: `Write a ${form.platform} post about mortgage tips for ${form.title || "homebuyers"}`,
                        tone: "professional",
                      });
                    }}
                    disabled={generating}
                  >
                    <Sparkles className="w-3 h-3" />
                    {generating ? "Generating..." : "AI Write"}
                  </Button>
                </div>
                <Textarea rows={6} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your post content..." />
              </div>
              <div>
                <Label>Schedule (optional)</Label>
                <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createPost.mutate({
                  agencyId,
                  platform: form.platform,
                  content: `${form.title ? `[${form.title}] ` : ""}${form.content}`,
                  scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : undefined,
                })}
                disabled={!form.title || !form.content || createPost.isPending}
              >
                {createPost.isPending ? "Saving..." : "Save Post"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {posts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Image className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No posts yet. Create your first social media post.
            </CardContent>
          </Card>
        ) : (
          posts.map((post: (typeof posts)[number]) => (
            <Card key={post.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-sm truncate">{post.content.slice(0, 60)}{post.content.length > 60 ? "..." : ""}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 capitalize ${PLATFORM_COLORS[post.platform] ?? "bg-gray-100 text-gray-700"}`}>
                    {post.platform}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{post.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-xs capitalize">
                    {post.status}
                  </Badge>
                  {post.scheduledAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.scheduledAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Inbox Tab ─────────────────────────────────────────────────────────────
function InboxTab({ agencyId }: { agencyId: number }) {
  const { data: conversations = [] } = trpc.conversations.list.useQuery({ agencyId, limit: 30, offset: 0 });

  const CHANNEL_COLORS: Record<string, string> = {
    sms: "bg-green-100 text-green-700",
    email: "bg-blue-100 text-blue-700",
    facebook: "bg-indigo-100 text-indigo-700",
    call: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{conversations.length} conversations</p>
      {conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No conversations yet. Conversations from SMS, email, and Facebook will appear here.
          </CardContent>
        </Card>
      ) : (
        conversations.map((conv: (typeof conversations)[number]) => (
          <Card key={conv.id} className={`hover:shadow-sm transition-shadow cursor-pointer ${!conv.isRead ? "border-primary/30 bg-primary/5" : ""}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm truncate ${!conv.isRead ? "font-semibold" : "font-medium"}`}>
                    {conv.contactName ?? "Unknown Contact"}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 capitalize ${CHANNEL_COLORS[conv.channel] ?? "bg-gray-100 text-gray-700"}`}>
                    {conv.channel}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessagePreview ?? "No messages yet"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {conv.lastMessageAt && (
                  <p className="text-xs text-muted-foreground">{new Date(conv.lastMessageAt).toLocaleDateString()}</p>
                )}
                {!conv.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary ml-auto mt-1" />
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Email Templates Tab ───────────────────────────────────────────────────
function EmailTemplatesTab({ agencyId }: { agencyId: number }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", content: "" });

  const { data: templates = [], refetch } = trpc.campaigns.listTemplates.useQuery({ agencyId });
  const emailTemplates = templates.filter((t: (typeof templates)[number]) => t.type === "email");

  const createTemplate = trpc.campaigns.createTemplate.useMutation({
    onSuccess: () => { toast.success("Template saved"); setShowCreate(false); refetch(); },
    onError: () => toast.error("Failed to save template"),
  });

  const deleteTemplate = trpc.campaigns.deleteTemplate.useMutation({
    onSuccess: () => { toast.success("Template deleted"); refetch(); },
    onError: () => toast.error("Failed to delete template"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{emailTemplates.length} email templates</p>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Email Template</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Template Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Welcome Email" />
              </div>
              <div>
                <Label>Subject *</Label>
                <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Welcome to {{agencyName}}" />
              </div>
              <div>
                <Label>Content *</Label>
                <Textarea rows={8} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Hi {{firstName}},&#10;&#10;Use variables: {{firstName}}, {{lastName}}, {{agencyName}}, {{agentName}}" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createTemplate.mutate({ agencyId, name: form.name, type: "email", subject: form.subject, content: form.content })}
                disabled={!form.name || !form.subject || !form.content || createTemplate.isPending}
              >
                {createTemplate.isPending ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {emailTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No email templates yet. Create reusable templates for your campaigns.
            </CardContent>
          </Card>
        ) : (
          emailTemplates.map((t: (typeof templates)[number]) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{t.name}</p>
                    {t.subject && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.subject}</p>}
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.content}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <PenSquare className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteTemplate.mutate({ id: t.id, agencyId })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Notifications Tab ─────────────────────────────────────────────────────
function NotificationsTab({ agencyId }: { agencyId: number }) {
  const { data: notifs = [], refetch } = trpc.notifications.list.useQuery({ agencyId, limit: 30 });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { toast.success("All marked as read"); refetch(); },
  });

  const unread = notifs.filter((n: (typeof notifs)[number]) => !n.isRead);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unread.length} unread notifications</p>
        {unread.length > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markAllRead.mutate({ agencyId })}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {notifs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        notifs.map((n: (typeof notifs)[number]) => (
          <Card
            key={n.id}
            className={`hover:shadow-sm transition-shadow cursor-pointer ${!n.isRead ? "border-primary/30 bg-primary/5" : ""}`}
            onClick={() => !n.isRead && markRead.mutate({ id: n.id })}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? "bg-primary" : "bg-transparent"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.isRead ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{n.type}</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Main Tools Hub ────────────────────────────────────────────────────────
export default function ToolsHub() {
  const { agencyId } = useAgency();

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display">Tools</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Content studio, unified inbox, email templates, and notifications</p>
        </div>

        <Tabs defaultValue="content-studio">
          <TabsList className="h-9">
            <TabsTrigger value="content-studio" className="gap-1.5">
              <Image className="w-3.5 h-3.5" /> Content Studio
            </TabsTrigger>
            <TabsTrigger value="inbox" className="gap-1.5">
              <Inbox className="w-3.5 h-3.5" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="email-templates" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Email Templates
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content-studio" className="mt-4"><ContentStudioTab agencyId={agencyId} /></TabsContent>
          <TabsContent value="inbox" className="mt-4"><InboxTab agencyId={agencyId} /></TabsContent>
          <TabsContent value="email-templates" className="mt-4"><EmailTemplatesTab agencyId={agencyId} /></TabsContent>
          <TabsContent value="notifications" className="mt-4"><NotificationsTab agencyId={agencyId} /></TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
