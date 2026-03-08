import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Loader2, CheckCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useParams } from "wouter";

export default function BriefForm() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    targetKeywords: "",
    targetAudience: "",
    tonePreference: "professional" as "professional" | "casual" | "technical" | "friendly" | "authoritative" | "conversational",
    contentType: "blog-post" as "blog-post" | "how-to" | "listicle" | "case-study" | "guide" | "news",
    additionalNotes: "",
    wordCountTarget: 1500,
    submittedBy: "",
    submittedEmail: "",
  });

  const { data: brief, isLoading } = trpc.seo.briefs.getByToken.useQuery(
    { token },
    { enabled: !!token }
  );
  const submitMutation = trpc.seo.briefs.submit.useMutation();

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a topic/title for the content");
      return;
    }
    try {
      await submitMutation.mutateAsync({
        token,
        ...formData,
      });
      setSubmitted(true);
      toast.success("Brief submitted successfully!");
    } catch {
      toast.error("Failed to submit brief. The link may be invalid or expired.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center py-12">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Brief Link</h2>
            <p className="text-muted-foreground">
              This brief link is invalid or has expired. Please contact your agency for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center py-12">
            <CheckCircle className="h-16 w-16 mx-auto text-green-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Brief Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you for submitting your content brief. Our team will review it and begin creating your content shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <ClipboardList className="h-12 w-12 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Content Brief</h1>
          <p className="text-muted-foreground mt-2">
            Tell us about the content you need. The more detail you provide, the better we can serve you.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Your Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Your Name</Label>
                <Input
                  placeholder="John Doe"
                  value={formData.submittedBy}
                  onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })}
                />
              </div>
              <div>
                <Label>Your Email</Label>
                <Input
                  type="email"
                  placeholder="john@company.com"
                  value={formData.submittedEmail}
                  onChange={(e) => setFormData({ ...formData, submittedEmail: e.target.value })}
                />
              </div>
            </div>

            {/* Topic */}
            <div>
              <Label>Topic / Title *</Label>
              <Input
                placeholder="e.g., 10 Best Practices for Home Renovation in 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Content Type & Tone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Content Type</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(v: any) => setFormData({ ...formData, contentType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog-post">Blog Post</SelectItem>
                    <SelectItem value="how-to">How-To Guide</SelectItem>
                    <SelectItem value="listicle">Listicle</SelectItem>
                    <SelectItem value="case-study">Case Study</SelectItem>
                    <SelectItem value="guide">Comprehensive Guide</SelectItem>
                    <SelectItem value="news">News Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tone Preference</Label>
                <Select
                  value={formData.tonePreference}
                  onValueChange={(v: any) => setFormData({ ...formData, tonePreference: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <Label>Target Keywords</Label>
              <Input
                placeholder="e.g., home renovation, kitchen remodel, bathroom upgrade"
                value={formData.targetKeywords}
                onChange={(e) => setFormData({ ...formData, targetKeywords: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple keywords with commas
              </p>
            </div>

            {/* Target Audience */}
            <div>
              <Label>Target Audience</Label>
              <Input
                placeholder="e.g., Homeowners aged 30-55 looking to renovate"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              />
            </div>

            {/* Word Count */}
            <div>
              <Label>Target Word Count</Label>
              <Input
                type="number"
                min={100}
                max={10000}
                value={formData.wordCountTarget}
                onChange={(e) => setFormData({ ...formData, wordCountTarget: parseInt(e.target.value) || 1500 })}
              />
            </div>

            {/* Additional Notes */}
            <div>
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any specific requirements, references, competitor URLs, or guidelines..."
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                rows={4}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="w-full"
              size="lg"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Send className="h-5 w-5 mr-2" />
              )}
              Submit Content Brief
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
