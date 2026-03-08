import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Facebook, Instagram, Linkedin, Upload } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function NewSocialPost() {
  const [, navigate] = useLocation();
  
  const [platform, setPlatform] = useState<"facebook" | "instagram" | "linkedin">("facebook");
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled">("scheduled");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState("");

  const createPost = trpc.social.createPost.useMutation({
    onSuccess: () => {
      toast.success("Post created successfully");
      navigate("/social");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddMedia = () => {
    if (mediaInput.trim()) {
      setMediaUrls([...mediaUrls, mediaInput.trim()]);
      setMediaInput("");
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select a date and time");
      return;
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduledDateTime <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    createPost.mutate({
      platform,
      content,
      scheduledDate: scheduledDateTime,
      status,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case "facebook":
        return <Facebook className="w-5 h-5" />;
      case "instagram":
        return <Instagram className="w-5 h-5" />;
      case "linkedin":
        return <Linkedin className="w-5 h-5" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/social">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Social Media Post</h1>
            <p className="text-muted-foreground">Schedule a post for your social media platforms</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
            <CardDescription>
              Create and schedule your social media content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">
                      <div className="flex items-center gap-2">
                        <Facebook className="w-4 h-4" />
                        Facebook
                      </div>
                    </SelectItem>
                    <SelectItem value="instagram">
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </div>
                    </SelectItem>
                    <SelectItem value="linkedin">
                      <div className="flex items-center gap-2">
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your post content here..."
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} characters
                </p>
              </div>

              {/* Media URLs */}
              <div className="space-y-2">
                <Label htmlFor="media">Media URLs (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="media"
                    value={mediaInput}
                    onChange={(e) => setMediaInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddMedia();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddMedia}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {mediaUrls.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {mediaUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="text-sm flex-1 truncate">{url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMedia(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule Date & Time */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Schedule Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Schedule Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Save as Draft</SelectItem>
                    <SelectItem value="scheduled">Schedule for Publishing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Link href="/social">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createPost.isPending}>
                  {getPlatformIcon()}
                  <span className="ml-2">Create Post</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        {content && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your post will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  {getPlatformIcon()}
                  <span className="font-semibold capitalize">{platform}</span>
                </div>
                <p className="whitespace-pre-wrap">{content}</p>
                {mediaUrls.length > 0 && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    📎 {mediaUrls.length} media file(s) attached
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
