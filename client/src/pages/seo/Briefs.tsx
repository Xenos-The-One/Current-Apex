import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Copy,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Loader2,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const briefStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  submitted: { label: "Submitted", color: "bg-blue-500/20 text-blue-400", icon: Clock },
  in_review: { label: "In Review", color: "bg-yellow-500/20 text-yellow-400", icon: Eye },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

const toneLabels: Record<string, string> = {
  professional: "Professional",
  casual: "Casual",
  technical: "Technical",
  friendly: "Friendly",
  authoritative: "Authoritative",
  conversational: "Conversational",
};

const typeLabels: Record<string, string> = {
  "blog-post": "Blog Post",
  "how-to": "How-To Guide",
  listicle: "Listicle",
  "case-study": "Case Study",
  guide: "Guide",
  news: "News Article",
};

export default function Briefs() {
  const [, navigate] = useLocation();
  // Pre-fill from gap analysis query params
  const searchParams = new URLSearchParams(window.location.search);
  const prefillClientId = searchParams.get("clientId") || "";
  const prefillTitle = searchParams.get("title") || "";
  const prefillNotes = searchParams.get("notes") || "";

  const [selectedClientId, setSelectedClientId] = useState<string>(prefillClientId);
  const [generateBrief, setGenerateBrief] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(!!prefillTitle);
  const [createForm, setCreateForm] = useState({
    title: prefillTitle,
    targetKeywords: "",
    targetAudience: "",
    tonePreference: "professional" as const,
    contentType: "blog-post" as const,
    additionalNotes: prefillNotes,
    wordCountTarget: 1500,
  });

  const { data: clientsList } = trpc.seo.clients.list.useQuery();
  const { data: briefs, refetch: refetchBriefs } = trpc.seo.briefs.list.useQuery(
    selectedClientId ? { clientId: parseInt(selectedClientId) } : undefined
  );

  const generateLinkMutation = trpc.seo.briefs.generateLink.useMutation();
  const updateStatusMutation = trpc.seo.briefs.updateStatus.useMutation();
  const deleteMutation = trpc.seo.briefs.delete.useMutation();
  const generateContentMutation = trpc.seo.content.generate.useMutation();

  const handleGenerateLink = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client first");
      return;
    }
    try {
      const result = await generateLinkMutation.mutateAsync({
        clientId: parseInt(selectedClientId),
      });
      const briefUrl = `${window.location.origin}/brief/${result.shareToken}`;
      await navigator.clipboard.writeText(briefUrl);
      toast.success("Brief link generated and copied to clipboard!");
      refetchBriefs();
    } catch {
      toast.error("Failed to generate brief link");
    }
  };

  const handleUpdateStatus = async (id: number, status: "submitted" | "in_review" | "accepted" | "rejected") => {
    try {
      await updateStatusMutation.mutateAsync({ id, status });
      toast.success(`Brief status updated to ${status}`);
      refetchBriefs();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Brief deleted");
      refetchBriefs();
    } catch {
      toast.error("Failed to delete brief");
    }
  };

  const copyBriefLink = (token: string) => {
    const url = `${window.location.origin}/brief/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Brief link copied to clipboard!");
  };

  const handleGenerateFromBrief = async () => {
    if (!generateBrief) return;
    setIsGenerating(true);
    try {
      const topicParts = [
        generateBrief.title || "Content from brief",
        generateBrief.targetKeywords ? `Keywords: ${generateBrief.targetKeywords}` : "",
        generateBrief.targetAudience ? `Audience: ${generateBrief.targetAudience}` : "",
        generateBrief.tonePreference ? `Tone: ${toneLabels[generateBrief.tonePreference] || generateBrief.tonePreference}` : "",
        generateBrief.contentType ? `Format: ${typeLabels[generateBrief.contentType] || generateBrief.contentType}` : "",
      ].filter(Boolean);
      const topic = topicParts.join(". ");
      const result = await generateContentMutation.mutateAsync({
        clientId: generateBrief.clientId,
        topic,
        customPrompt: generateBrief.additionalNotes || undefined,
        shouldGenerateImage: true,
        enableWebResearch: true,
      });
      toast.success(`Content "${result.title}" generated from brief!`);
      setGenerateBrief(null);
      navigate(`/content/${result.id}`);
    } catch {
      toast.error("Failed to generate content from brief");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <ClipboardList className="h-8 w-8" />
          Content Briefs
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate shareable intake forms for clients to submit content briefs with keywords, audience, and tone preferences
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-sm">
              <label className="block text-sm font-medium mb-2">Filter by Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="All clients..." />
                </SelectTrigger>
                <SelectContent>
                  {clientsList?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateLink} disabled={!selectedClientId || generateLinkMutation.isPending}>
              {generateLinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Generate Brief Link
            </Button>
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Brief (Internal)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Internal Create Brief Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Internal Brief</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientsList?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Title / Topic</Label>
              <Input value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Local SEO for Dentists" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Content Type</Label>
                <Select value={createForm.contentType} onValueChange={(v) => setCreateForm((p) => ({ ...p, contentType: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tone</Label>
                <Select value={createForm.tonePreference} onValueChange={(v) => setCreateForm((p) => ({ ...p, tonePreference: v as any }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(toneLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Target Keywords</Label>
              <Input value={createForm.targetKeywords} onChange={(e) => setCreateForm((p) => ({ ...p, targetKeywords: e.target.value }))} placeholder="Comma-separated keywords" />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={createForm.additionalNotes} onChange={(e) => setCreateForm((p) => ({ ...p, additionalNotes: e.target.value }))} rows={3} placeholder="Additional context, article ideas, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              disabled={!selectedClientId || !createForm.title.trim() || generateLinkMutation.isPending}
              onClick={async () => {
                try {
                  await generateLinkMutation.mutateAsync({ clientId: parseInt(selectedClientId) });
                  toast.success("Brief created!");
                  refetchBriefs();
                  setShowCreateDialog(false);
                  setCreateForm({ title: "", targetKeywords: "", targetAudience: "", tonePreference: "professional", contentType: "blog-post", additionalNotes: "", wordCountTarget: 1500 });
                } catch { toast.error("Failed to create brief"); }
              }}
            >
              {generateLinkMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Brief
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Briefs List */}
      <div className="space-y-4">
        {briefs && briefs.length > 0 ? (
          briefs.map((brief) => {
            const config = briefStatusConfig[brief.status] || briefStatusConfig.submitted;
            const StatusIcon = config.icon;
            const client = clientsList?.find((c) => c.id === brief.clientId);
            const hasContent = !!(brief.title || brief.targetKeywords || brief.contentType);

            return (
              <Card key={brief.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {brief.title || "Pending Submission"}
                        </h3>
                        <Badge className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                        {client && (
                          <div>
                            <span className="text-muted-foreground">Client:</span>{" "}
                            <span className="font-medium">{client.name}</span>
                          </div>
                        )}
                        {brief.contentType && (
                          <div>
                            <span className="text-muted-foreground">Type:</span>{" "}
                            <span className="font-medium">{typeLabels[brief.contentType] || brief.contentType}</span>
                          </div>
                        )}
                        {brief.tonePreference && (
                          <div>
                            <span className="text-muted-foreground">Tone:</span>{" "}
                            <span className="font-medium">{toneLabels[brief.tonePreference] || brief.tonePreference}</span>
                          </div>
                        )}
                        {brief.wordCountTarget && (
                          <div>
                            <span className="text-muted-foreground">Words:</span>{" "}
                            <span className="font-medium">{brief.wordCountTarget}</span>
                          </div>
                        )}
                      </div>

                      {brief.targetKeywords && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Keywords:</span>{" "}
                          <span>{brief.targetKeywords}</span>
                        </div>
                      )}
                      {brief.targetAudience && (
                        <div className="mt-1 text-sm">
                          <span className="text-muted-foreground">Audience:</span>{" "}
                          <span>{brief.targetAudience}</span>
                        </div>
                      )}
                      {brief.additionalNotes && (
                        <div className="mt-1 text-sm">
                          <span className="text-muted-foreground">Notes:</span>{" "}
                          <span>{brief.additionalNotes}</span>
                        </div>
                      )}

                      {brief.submittedBy && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted by: {brief.submittedBy}
                          {brief.submittedEmail ? ` (${brief.submittedEmail})` : ""}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(brief.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Generate Content from Brief */}
                      {hasContent && (
                        <Button
                          size="sm"
                          onClick={() => setGenerateBrief(brief)}
                          className="bg-primary/90 hover:bg-primary"
                        >
                          <Wand2 className="h-4 w-4 mr-1" />
                          Generate Content
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyBriefLink(brief.shareToken)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Link
                      </Button>

                      {/* Status Actions */}
                      <div className="flex gap-1">
                        {brief.status !== "accepted" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(brief.id, "accepted")}
                            className="text-green-400 hover:text-green-300"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {brief.status !== "in_review" && brief.status !== "accepted" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(brief.id, "in_review")}
                            className="text-yellow-400 hover:text-yellow-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brief.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No content briefs yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Select a client and generate a shareable brief link to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate from Brief Dialog */}
      <Dialog open={!!generateBrief} onOpenChange={(open) => !open && setGenerateBrief(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Generate Content from Brief
            </DialogTitle>
          </DialogHeader>
          {generateBrief && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2 text-sm">
                <p className="font-medium">{generateBrief.title || "Untitled Brief"}</p>
                {generateBrief.title && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Topic:</span> {generateBrief.title}
                  </p>
                )}
                {generateBrief.targetKeywords && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Keywords:</span> {generateBrief.targetKeywords}
                  </p>
                )}
                {generateBrief.contentType && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Format:</span>{" "}
                    {typeLabels[generateBrief.contentType] || generateBrief.contentType}
                  </p>
                )}
                {generateBrief.tonePreference && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Tone:</span>{" "}
                    {toneLabels[generateBrief.tonePreference] || generateBrief.tonePreference}
                  </p>
                )}
                {generateBrief.wordCountTarget && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Target words:</span>{" "}
                    {generateBrief.wordCountTarget}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                AI will generate a full article using the brief's topic, keywords, tone, and format. Web research will be performed automatically. You will be taken to the content editor when done.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setGenerateBrief(null)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleGenerateFromBrief}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
