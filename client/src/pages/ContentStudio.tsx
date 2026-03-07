import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  Clock,
  Edit,
  FileText,
  Image,
  Instagram,
  Linkedin,
  Mail,
  Plus,
  Sparkles,
  Twitter,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, any> = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  facebook: () => <span className="text-xs font-bold">f</span>,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-teal-100 text-teal-700",
  rejected: "bg-red-100 text-red-700",
};

function CreatePostDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ platform: "linkedin", content: "", scheduledAt: "" });
  const [generating, setGenerating] = useState(false);

  const createMutation = trpc.content.createPost.useMutation({
    onSuccess: () => { toast.success("Post created"); setOpen(false); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  const generateMutation = trpc.ai.generateEmailContent.useMutation({
    onSuccess: (data: any) => {
      setForm(f => ({ ...f, content: data.body || f.content }));
      setGenerating(false);
      toast.success("Content generated");
    },
    onError: () => setGenerating(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Create Post</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Social Media Post</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ agencyId, ...form as any, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : undefined }); }} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["linkedin", "twitter", "instagram", "facebook"].map(p => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Content *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1"
                onClick={() => { setGenerating(true); generateMutation.mutate({ purpose: `${form.platform} post for mortgage professional`, tone: "professional" }); }}
                disabled={generating}>
                <Sparkles className="w-3 h-3" /> {generating ? "..." : "AI Generate"}
              </Button>
            </div>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} required placeholder="Write your post content..." />
          </div>
          <div className="space-y-1">
            <Label>Schedule (optional)</Label>
            <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Post"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateTemplateDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "email", subject: "", content: "", category: "follow_up" });

  const createMutation = trpc.campaigns.createTemplate.useMutation({
    onSuccess: () => { toast.success("Template created"); setOpen(false); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1.5" /> New Template</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Content Template</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ agencyId, ...form as any }); }} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Template Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["email", "sms", "social"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["follow_up", "welcome", "appointment_reminder", "rate_update", "market_update", "referral_request", "holiday", "other"].map(c => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.type === "email" && (
            <div className="space-y-1"><Label>Subject Line</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
          )}
          <div className="space-y-1">
            <Label>Content *</Label>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} required placeholder="Use {{first_name}}, {{loan_amount}}, etc. for personalization" />
          </div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Template"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ContentStudio() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;

  const { data: posts, refetch: refetchPosts } = trpc.content.listPosts.useQuery({ agencyId });
  const { data: templates, refetch: refetchTemplates } = trpc.campaigns.listTemplates.useQuery({ agencyId });

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-4 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Content Studio</h1>
            <p className="text-muted-foreground text-sm">Social media scheduling, email templates, and content library</p>
          </div>
          <div className="flex items-center gap-2">
            <CreateTemplateDialog agencyId={agencyId} onSuccess={refetchTemplates} />
            <CreatePostDialog agencyId={agencyId} onSuccess={refetchPosts} />
          </div>
        </div>

        <Tabs defaultValue="posts">
          <TabsList>
            <TabsTrigger value="posts" className="gap-1.5"><Instagram className="w-4 h-4" /> Social Posts ({posts?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5"><FileText className="w-4 h-4" /> Templates ({templates?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            {posts?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {posts.map((post: any) => {
                  const PlatformIcon = PLATFORM_ICONS[post.platform] || Instagram;
                  return (
                    <Card key={post.id} className="hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <PlatformIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium capitalize">{post.platform}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status] || ""}`}>
                            {post.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm mt-3 line-clamp-3 text-muted-foreground">{post.content}</p>
                        {post.scheduledAt && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Scheduled: {new Date(post.scheduledAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-6 text-xs gap-1 flex-1">
                            <Edit className="w-3 h-3" /> Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Instagram className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No posts yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Create your first social media post to build your content calendar</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            {templates?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {templates.map((t: any) => (
                  <Card key={t.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === "email" ? "bg-blue-100" : t.type === "sms" ? "bg-purple-100" : "bg-teal-100"}`}>
                            {t.type === "email" ? <Mail className="w-4 h-4 text-blue-600" /> : <FileText className="w-4 h-4 text-purple-600" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{t.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{t.category?.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{t.type}</Badge>
                      </div>
                      {t.subject && <p className="text-xs text-muted-foreground mt-2">Subject: {t.subject}</p>}
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.content}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-6 text-xs gap-1 flex-1">
                          <Edit className="w-3 h-3" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-xs gap-1 flex-1">
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No templates yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Create reusable templates for emails, SMS, and social posts</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
