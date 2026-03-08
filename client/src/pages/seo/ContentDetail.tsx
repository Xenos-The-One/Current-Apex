import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Save, Download, Loader2, Eye, Pencil, FileText, FileType,
  RefreshCw, Image, Wand2, Bot, Check, X, Search, Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRoute, Link, useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { WordPressPublish } from "@/components/WordPressPublish";
import { ManusPublish } from "@/components/ManusPublish";
import { BulkPublish } from "@/components/BulkPublish";

const AI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Cost-effective, fast" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Advanced reasoning" },
  { value: "gpt-4o", label: "GPT-4o", description: "High quality, versatile" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast & affordable" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", description: "Creative writing" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", description: "Balanced speed/quality" },
];

function getModelLabel(modelValue: string) {
  return AI_MODELS.find((m) => m.value === modelValue)?.label ?? modelValue;
}

export default function ContentDetail() {
  const [, params] = useRoute("/content/:id");
  const [, setLocation] = useLocation();
  const contentId = params?.id ? parseInt(params.id) : 0;

  const { data: content, isLoading, refetch } = trpc.seo.content.getById.useQuery(
    { id: contentId },
    { enabled: contentId > 0 }
  );
  const updateMutation = trpc.seo.content.update.useMutation();
  const changeModelMutation = trpc.seo.content.changeModel.useMutation();
  const generateImageMutation = trpc.seo.content.generateImage.useMutation();

  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [status, setStatus] = useState<"draft" | "in_progress" | "approved">("draft");
  const [progress, setProgress] = useState(0);

  // AI model editing state
  const [editingModel, setEditingModel] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  // Image generation state
  const [imagePromptOverride, setImagePromptOverride] = useState("");
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setContentText(content.content);
      setStatus(content.status);
      setProgress(content.progress);
      setSelectedModel(content.aiModel || "gemini-2.5-flash");
      setLocalImageUrl(content.imageUrl ?? null);
    }
  }, [content]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ id: contentId, title, content: contentText, status, progress });
      toast.success("Content saved successfully");
      refetch();
    } catch {
      toast.error("Failed to save content");
    }
  };

  const handleChangeModel = async () => {
    try {
      await changeModelMutation.mutateAsync({ id: contentId, aiModel: selectedModel });
      toast.success(`AI model updated to ${getModelLabel(selectedModel)}`);
      setEditingModel(false);
      refetch();
    } catch {
      toast.error("Failed to update AI model");
    }
  };

  const handleGenerateImage = async () => {
    try {
      const result = await generateImageMutation.mutateAsync({
        id: contentId,
        customPrompt: imagePromptOverride || undefined,
      });
      setLocalImageUrl(result.imageUrl);
      setShowImagePrompt(false);
      setImagePromptOverride("");
      toast.success("Image generated successfully!");
      refetch();
    } catch {
      toast.error("Failed to generate image");
    }
  };

  const sanitizedTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const handleExportMarkdown = () => {
    const blob = new Blob([`# ${title}\n\n${contentText}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizedTitle}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as Markdown");
  };

  const handleExportHtml = () => {
    const htmlContent = contentText
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>");
    const fullHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:'Georgia',serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;color:#333;}h1{font-size:2em;}h2{font-size:1.5em;margin-top:1.5em;}h3{font-size:1.2em;margin-top:1.2em;}p{margin-bottom:1em;}img{max-width:100%;height:auto;border-radius:8px;margin:1em 0;}strong{font-weight:700;}li{margin-bottom:.5em;}</style>
</head><body>${localImageUrl ? `<img src="${localImageUrl}" alt="${title}" />` : ""}<h1>${title}</h1><p>${htmlContent}</p></body></html>`;
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizedTitle}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as HTML");
  };

  const handleExportDocx = () => {
    const htmlContent = contentText
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>");
    const docContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Calibri,sans-serif;font-size:11pt;line-height:1.6;}h1{font-size:20pt;}h2{font-size:16pt;}h3{font-size:13pt;}</style></head><body><h1>${title}</h1><p>${htmlContent}</p></body></html>`;
    const blob = new Blob([docContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizedTitle}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as Word document");
  };

  const handleExportPlainText = () => {
    const plainText = contentText
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/---/g, "");
    const blob = new Blob([`${title}\n${"=".repeat(title.length)}\n\n${plainText}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizedTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as plain text");
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${contentText}`);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const isEmailSequence = (content as any)?.contentType === "email-sequence";
  const isNewsletterContent = (content as any)?.contentType === "newsletter";
  const isEmailContent = isEmailSequence || isNewsletterContent;

  const handleExportNewsletterCsv = () => {
    // Build a CSV template with subject line (title) and preview text (first 150 chars of content)
    const subject = title;
    const previewText = contentText
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 150);
    const csvRows = [
      ["Subject Line", "Preview Text", "Content (Markdown)"],
      [subject, previewText, contentText.replace(/"/g, '""')],
    ];
    const csv = csvRows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizedTitle}-newsletter.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Newsletter CSV exported — ready for Mailchimp / ConvertKit");
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/seo/content">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Content
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Content Area ── */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </TabsTrigger>
            </TabsList>

            {/* Preview Tab */}
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Generated Content
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      AI-generated content ready for review
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {localImageUrl && (
                    <img
                      src={localImageUrl}
                      alt={title}
                      className="w-full h-72 object-cover rounded-lg mb-6"
                    />
                  )}
                  <h1 className="text-2xl font-bold mb-4">{title}</h1>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <Streamdown>{contentText}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Edit Tab */}
            <TabsContent value="edit">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pencil className="h-5 w-5" />
                    Edit Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Content (Markdown)</Label>
                    <Textarea
                      id="content"
                      value={contentText}
                      onChange={(e) => setContentText(e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                    {/* Social post character counter */}
                    {(content as any)?.contentType === "social-post" && (() => {
                      const sub = (content as any)?.contentSubtype || "general";
                      const limits: Record<string, number> = {
                        twitter: 280, linkedin: 3000, instagram: 2200,
                        facebook: 63206, tiktok: 2200, general: 2200,
                      };
                      const platformLabels: Record<string, string> = {
                        twitter: "Twitter/X", linkedin: "LinkedIn", instagram: "Instagram",
                        facebook: "Facebook", tiktok: "TikTok", general: "Social",
                      };
                      const limit = limits[sub] ?? 2200;
                      const count = contentText.length;
                      const pct = Math.min((count / limit) * 100, 100);
                      const isOver = count > limit;
                      const isNear = count > limit * 0.85;
                      return (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{platformLabels[sub] ?? "Social"} character limit</span>
                            <span className={isOver ? "text-destructive font-semibold" : isNear ? "text-yellow-400" : "text-muted-foreground"}>
                              {count.toLocaleString()} / {limit.toLocaleString()}
                              {isOver && " — over limit!"}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? "bg-destructive" : isNear ? "bg-yellow-400" : "bg-primary"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSave} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <RegenerateButton contentId={contentId} currentModel={content.aiModel} onSuccess={refetch} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={handleCopyToClipboard}>
                          <Check className="h-4 w-4 mr-2" />
                          Copy to Clipboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportDocx}>
                          <FileType className="h-4 w-4 mr-2" />
                          Word Document (.doc)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportHtml}>
                          <FileText className="h-4 w-4 mr-2" />
                          HTML (Print to PDF)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportMarkdown}>
                          <FileText className="h-4 w-4 mr-2" />
                          Markdown (.md)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPlainText}>
                          <FileText className="h-4 w-4 mr-2" />
                          Plain Text (.txt)
                        </DropdownMenuItem>
                        {isEmailContent && (
                          <DropdownMenuItem onClick={() => {
                            const emails = contentText.split(/(?=^#{2,3}\s*(Email|Week|Day|Part)\s*\d)/mi).filter(Boolean);
                            const formatted = emails.length > 1
                              ? emails.map((e, i) => `--- Email ${i + 1} ---\n${e.trim()}`).join("\n\n")
                              : contentText;
                            const blob = new Blob([`${title}\n\n${formatted}`], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${sanitizedTitle}-email-sequence.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success("Email sequence exported");
                          }}>
                            <Bot className="h-4 w-4 mr-2" />
                            Email Sequence (.txt)
                          </DropdownMenuItem>
                        )}
                        {isNewsletterContent && (
                          <DropdownMenuItem onClick={handleExportNewsletterCsv}>
                            <FileText className="h-4 w-4 mr-2" />
                            Newsletter CSV (Mailchimp)
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Content Details */}
          <Card>
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="progress">Progress: {progress}%</Label>
                <Progress value={progress} className="mt-2" />
                <Input
                  id="progress"
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value))}
                  className="mt-2"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                size="sm"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Details
              </Button>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Featured Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {localImageUrl ? (
                <div className="space-y-3">
                  <img
                    src={localImageUrl}
                    alt="Featured"
                    className="w-full h-40 object-cover rounded-lg border border-border"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setShowImagePrompt((v) => !v)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Replace Image
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-border text-muted-foreground gap-2">
                  <Image className="h-8 w-8 opacity-30" />
                  <p className="text-xs">No image yet</p>
                </div>
              )}

              {showImagePrompt && (
                <div className="space-y-2 pt-1">
                  <Label className="text-xs">Custom image prompt (optional)</Label>
                  <Textarea
                    placeholder={`Professional blog header for: "${title}"`}
                    value={imagePromptOverride}
                    onChange={(e) => setImagePromptOverride(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>
              )}

              <Button
                className="w-full gap-2"
                size="sm"
                onClick={handleGenerateImage}
                disabled={generateImageMutation.isPending}
              >
                {generateImageMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                ) : (
                  <><Wand2 className="h-3.5 w-3.5" /> {localImageUrl ? "Regenerate Image" : "Generate Image"}</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                AI-generated image using the article title and topic
              </p>
            </CardContent>
          </Card>

          {/* Social Post Platform Preview */}
          {(content as any)?.contentType === "social-post" && (() => {
            const sub = (content as any)?.contentSubtype || "general";
            const platformMeta: Record<string, { name: string; color: string; bg: string; handle: string }> = {
              linkedin: { name: "LinkedIn", color: "#0a66c2", bg: "#f3f6f8", handle: "linkedin.com" },
              twitter:  { name: "Twitter / X", color: "#000000", bg: "#15202b", handle: "x.com" },
              instagram:{ name: "Instagram", color: "#e1306c", bg: "#fafafa", handle: "instagram.com" },
              facebook: { name: "Facebook", color: "#1877f2", bg: "#f0f2f5", handle: "facebook.com" },
              tiktok:   { name: "TikTok", color: "#fe2c55", bg: "#010101", handle: "tiktok.com" },
              general:  { name: "Social", color: "#a855f7", bg: "#1a1a2e", handle: "social" },
            };
            const meta = platformMeta[sub] ?? platformMeta.general;
            const previewText = contentText.replace(/^#{1,6}\s*/gm, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim().slice(0, 280);
            const isTwitter = sub === "twitter";
            const isDark = ["twitter", "tiktok", "general"].includes(sub);
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4" />
                    Platform Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="rounded-xl p-4 text-sm"
                    style={{ background: meta.bg, color: isDark ? "#e7e9ea" : "#1c1e21" }}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: meta.color }}
                      >
                        {(content as any)?.clientName?.charAt(0)?.toUpperCase() ?? "C"}
                      </div>
                      <div>
                        <p className="font-semibold text-xs leading-tight">{(content as any)?.clientName ?? "Client"}</p>
                        <p className="text-[10px] opacity-60">{meta.handle}</p>
                      </div>
                      <div
                        className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: meta.color }}
                      >
                        {meta.name}
                      </div>
                    </div>
                    {/* Post text */}
                    <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                      {previewText || "Your post content will appear here…"}
                      {isTwitter && contentText.length > 280 && (
                        <span className="text-blue-400"> …(truncated to 280)</span>
                      )}
                    </p>
                    {/* Image preview if available */}
                    {localImageUrl && (
                      <img
                        src={localImageUrl}
                        alt="Post image"
                        className="mt-3 rounded-lg w-full h-32 object-cover"
                      />
                    )}
                    {/* Footer */}
                    <div className="flex gap-4 mt-3 opacity-50 text-[10px]">
                      <span>👍 Like</span>
                      <span>💬 Comment</span>
                      <span>↗ Share</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-muted-foreground">Preview updates as you edit</p>
                    <button
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground"
                      onClick={() => { navigator.clipboard.writeText(previewText); toast.success('Post text copied to clipboard'); }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy post text
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* AI Model */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editingModel ? (
                <div className="space-y-3">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-xs text-muted-foreground">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={handleChangeModel}
                      disabled={changeModelMutation.isPending}
                    >
                      {changeModelMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => {
                        setEditingModel(false);
                        setSelectedModel(content.aiModel || "gemini-2.5-flash");
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This sets the model used for future regenerations of this piece.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{getModelLabel(content.aiModel)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{content.aiModel}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setEditingModel(true)}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Change Model
                  </Button>
                  {content.customPrompt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Custom Prompt</p>
                      <p className="text-xs line-clamp-3 text-foreground/80">{content.customPrompt}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Token Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Input:</span>
                <span className="font-medium">{content.inputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Output:</span>
                <span className="font-medium">{content.outputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold">{content.totalTokens.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {content.webSearches > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Research Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">URLs Fetched:</span>
                  <span className="font-medium">{content.urlsFetched}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">URLs Failed:</span>
                  <span className="font-medium text-red-400">{content.urlsFailed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Web Searches:</span>
                  <span className="font-medium">{content.webSearches}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Find Keywords shortcut */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                SEO Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Research keywords for this content's topic in the Keyword Research tool.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  const topicParam = encodeURIComponent(title || content.topic || "");
                  setLocation(`/keyword-research?topic=${topicParam}`);
                }}
              >
                <Search className="h-3.5 w-3.5" />
                Find Keywords
              </Button>
            </CardContent>
          </Card>

          {/* Publishing */}
          <BulkPublish contentId={contentId} clientId={content.clientId} />
          <WordPressPublish contentId={contentId} clientId={content.clientId} />
          <ManusPublish contentId={contentId} clientId={content.clientId} />
        </div>
      </div>
    </div>
  );
}

// ── Regenerate Button Component ────────────────────────────────────────────────
function RegenerateButton({
  contentId,
  currentModel,
  onSuccess,
}: {
  contentId: number;
  currentModel: string;
  onSuccess: () => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [aiModel, setAiModel] = useState(currentModel || "gemini-2.5-flash");
  const [enableWebResearch, setEnableWebResearch] = useState(false);
  const [shouldGenerateImage, setShouldGenerateImage] = useState(false);

  const regenerateMutation = trpc.seo.content.regenerate.useMutation();

  const handleRegenerate = async () => {
    try {
      await regenerateMutation.mutateAsync({ id: contentId, aiModel, enableWebResearch, shouldGenerateImage });
      toast.success("Content regenerated successfully!");
      setShowDialog(false);
      onSuccess();
    } catch {
      toast.error("Failed to regenerate content");
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setShowDialog(true)}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Regenerate
      </Button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Regenerate Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="regenerate-model">AI Model</Label>
                <Select value={aiModel} onValueChange={setAiModel}>
                  <SelectTrigger id="regenerate-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label} — {m.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="regenerate-research"
                  checked={enableWebResearch}
                  onChange={(e) => setEnableWebResearch(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="regenerate-research" className="cursor-pointer">
                  Enable web research
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="regenerate-image"
                  checked={shouldGenerateImage}
                  onChange={(e) => setShouldGenerateImage(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="regenerate-image" className="cursor-pointer">
                  Generate new featured image
                </Label>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-400">
                  Warning: This will replace the current content. Save any manual edits first.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRegenerate} disabled={regenerateMutation.isPending}>
                  {regenerateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
