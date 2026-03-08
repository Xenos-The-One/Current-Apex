import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, Clock, MessageSquare, Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * White-labeled client portal - clients see only their content with agency branding
 * This page uses agency settings (logo, name) from the Settings page
 */
export default function ClientPortalWhitelabel() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  // Get agency branding settings
  const { data: agencySettings } = trpc.seo.agencySettings.getAll.useQuery();
  const settings = agencySettings ? Object.fromEntries(Object.entries(agencySettings)) : {};

  // Get client's content only (filtered by clientId matching user)
  const { data: clientContent, isLoading: contentLoading } = trpc.seo.content.listByClient.useQuery(
    { clientId: user?.id || 0 },
    { enabled: !!user }
  );

  const approveMutation = trpc.seo.content.update.useMutation({
    onSuccess: () => {
      toast.success("Content approved successfully");
      setSelectedContentId(null);
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const feedbackMutation = trpc.seo.collaboration.addComment.useMutation({
    onSuccess: () => {
      toast.success("Feedback submitted");
      setFeedback("");
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    },
  });

  const handleApprove = (contentId: number) => {
    approveMutation.mutate({ id: contentId, status: "approved" });
  };

  const handleFeedback = (contentId: number) => {
    if (!feedback.trim()) {
      toast.error("Please enter feedback");
      return;
    }
    feedbackMutation.mutate({
      contentId,
      comment: feedback,
    });
  };

  const handleExport = async (contentId: number) => {
    const content = clientContent?.find((c) => c.id === contentId);
    if (!content) return;

    const blob = new Blob([content.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.title.replace(/[^a-z0-9]/gi, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Content exported");
  };

  if (authLoading || contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to view your content</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const agencyName = settings?.agencyName || "Content Portal";
  const agencyLogo = settings?.agencyLogo || null;

  return (
    <div className="min-h-screen bg-background">
      {/* White-labeled header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {agencyLogo && (
              <img src={agencyLogo} alt={agencyName} className="h-10 w-auto" />
            )}
            <h1 className="text-2xl font-bold text-foreground">{agencyName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Your Content</h2>
          <p className="text-muted-foreground">
            Review and approve content created for you by {agencyName}
          </p>
        </div>

        {!clientContent || clientContent.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No content available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {clientContent.map((content) => (
              <Card key={content.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{content.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(content.createdAt).toLocaleDateString()}
                        </span>
                        <Badge
                          variant={
                            content.status === "approved"
                              ? "default"
                              : content.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {content.status}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {content.imageUrl && (
                    <img
                      src={content.imageUrl}
                      alt={content.title}
                      className="w-full h-64 object-cover rounded-lg mb-6"
                    />
                  )}

                  <div
                    className="prose prose-invert max-w-none mb-6"
                    dangerouslySetInnerHTML={{
                      __html: content.content.substring(0, 500) + "...",
                    }}
                  />

                  {selectedContentId === content.id && (
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <label className="block text-sm font-medium mb-2">
                        <MessageSquare className="inline h-4 w-4 mr-1" />
                        Provide Feedback or Request Changes
                      </label>
                      <Textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Enter your feedback or revision requests..."
                        className="mb-3"
                        rows={4}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleFeedback(content.id)}
                          disabled={feedbackMutation.isPending}
                        >
                          {feedbackMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Submit Feedback
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedContentId(null);
                            setFeedback("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    {content.status !== "approved" && (
                      <>
                        <Button
                          onClick={() => handleApprove(content.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Approve Content
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setSelectedContentId(
                              selectedContentId === content.id ? null : content.id
                            )
                          }
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Request Changes
                        </Button>
                      </>
                    )}
                    <Button variant="outline" onClick={() => handleExport(content.id)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
