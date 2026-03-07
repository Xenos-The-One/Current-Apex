import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Facebook,
  Instagram,
  Linkedin,
  Plus,
  Send,
  Sparkles,
  Twitter,
  Youtube,
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

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="w-4 h-4 text-blue-600" />,
  facebook: <Facebook className="w-4 h-4 text-indigo-600" />,
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  twitter: <Twitter className="w-4 h-4 text-sky-500" />,
  youtube: <Youtube className="w-4 h-4 text-red-600" />,
  tiktok: <span className="text-xs font-bold">TT</span>,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function PostCard({ post, onPublish }: { post: any; onPublish: (id: number, agencyId: number) => void }) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            {PLATFORM_ICONS[post.platform] ?? <span className="text-xs">{post.platform}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[post.status] ?? "bg-gray-100 text-gray-700"}`}>
                {post.status}
              </span>
              {post.scheduledAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(post.scheduledAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm line-clamp-3">{post.content}</p>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                <Edit className="w-3 h-3" /> Edit
              </Button>
              {post.status === "draft" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-green-600 hover:text-green-700"
                  onClick={() => onPublish(post.id, post.agencyId)}
                >
                  <Send className="w-3 h-3" /> Publish
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SocialMedia() {
  const { agencyId } = useAgency();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    platform: "linkedin" as "linkedin" | "facebook" | "instagram" | "twitter" | "youtube" | "tiktok",
    content: "",
    scheduledAt: "",
  });
  const [generating, setGenerating] = useState(false);

  const { data: posts = [], refetch } = trpc.content.listPosts.useQuery({ agencyId, limit: 50 });

  const createPost = trpc.content.createPost.useMutation({
    onSuccess: () => { toast.success("Post created"); setShowCreate(false); setForm({ platform: "linkedin", content: "", scheduledAt: "" }); refetch(); },
    onError: () => toast.error("Failed to create post"),
  });

  const updatePost = trpc.content.updatePost.useMutation({
    onSuccess: () => { toast.success("Post published"); refetch(); },
    onError: () => toast.error("Failed to publish post"),
  });

  const generateContent = trpc.ai.generateEmailContent.useMutation({
    onSuccess: (data: { subject: string; body: string }) => {
      setForm(p => ({ ...p, content: data.body }));
      setGenerating(false);
    },
    onError: () => { toast.error("Failed to generate content"); setGenerating(false); },
  });

  const draftPosts = posts.filter((p: any) => p.status === "draft");
  const scheduledPosts = posts.filter((p: any) => p.status === "scheduled");
  const publishedPosts = posts.filter((p: any) => p.status === "published");

  const PLATFORM_OPTIONS = [
    { value: "linkedin", label: "LinkedIn" },
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "twitter", label: "Twitter/X" },
    { value: "youtube", label: "YouTube" },
    { value: "tiktok", label: "TikTok" },
  ];

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Social Media</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Schedule and publish content across all platforms</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1.5" /> New Post</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Social Post</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Platform *</Label>
                  <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          purpose: `Write a ${form.platform} post for a mortgage loan officer`,
                          tone: "professional",
                        });
                      }}
                      disabled={generating}
                    >
                      <Sparkles className="w-3 h-3" />
                      {generating ? "Generating..." : "AI Write"}
                    </Button>
                  </div>
                  <Textarea
                    rows={6}
                    value={form.content}
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                    placeholder={`Write your ${form.platform} post here...\n\nTip: Use emojis and hashtags for better engagement.`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.content.length} characters</p>
                </div>
                <div>
                  <Label>Schedule (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  onClick={() => createPost.mutate({
                    agencyId,
                    platform: form.platform,
                    content: form.content,
                    scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : undefined,
                  })}
                  disabled={!form.content || createPost.isPending}
                >
                  {createPost.isPending ? "Saving..." : "Save Post"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Drafts", count: draftPosts.length, icon: <Edit className="w-4 h-4" />, color: "text-gray-600" },
            { label: "Scheduled", count: scheduledPosts.length, icon: <Calendar className="w-4 h-4" />, color: "text-blue-600" },
            { label: "Published", count: publishedPosts.length, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-xl font-bold">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="h-9">
            <TabsTrigger value="all">All ({posts.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({draftPosts.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({scheduledPosts.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({publishedPosts.length})</TabsTrigger>
          </TabsList>

          {[
            { value: "all", items: posts },
            { value: "drafts", items: draftPosts },
            { value: "scheduled", items: scheduledPosts },
            { value: "published", items: publishedPosts },
          ].map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              {tab.items.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <p className="text-sm">No {tab.value === "all" ? "" : tab.value} posts yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {tab.items.map((post: any) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onPublish={(id, aid) => updatePost.mutate({ id, agencyId: aid, status: "published" })}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </CRMLayout>
  );
}
