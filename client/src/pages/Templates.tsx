import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Mail, MessageSquare, Plus, Eye, Copy, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function Templates() {
  const [selectedType, setSelectedType] = useState<"email" | "sms">("email");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const { data: templates, isLoading, refetch } = trpc.templates.list.useQuery({
    type: selectedType,
  });

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully!");
      setCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const handleCreateTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createTemplate.mutate({
      name: formData.get("name") as string,
      type: selectedType,
      category: formData.get("category") as string,
      subject: selectedType === "email" ? (formData.get("subject") as string) : undefined,
      content: formData.get("content") as string,
      variables: (formData.get("variables") as string)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    });
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Template copied to clipboard!");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Campaign Templates</h1>
            <p className="text-muted-foreground mt-2">
              Pre-written templates for your email and SMS campaigns
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a custom template for your campaigns
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Follow-up Email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="e.g., follow_up, nurture, appointment"
                  />
                </div>
                {selectedType === "email" && (
                  <div>
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="e.g., Great connecting with you, {{firstName}}!"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    name="content"
                    rows={8}
                    placeholder="Write your template content here. Use {{variableName}} for personalization."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="variables">Variables (comma-separated)</Label>
                  <Input
                    id="variables"
                    name="variables"
                    placeholder="e.g., firstName, lastName, agentName"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    List all variables used in your template
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTemplate.isPending}>
                    {createTemplate.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as "email" | "sms")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedType} className="mt-6">
            {templates && templates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No templates found. Create your first template!
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates?.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.category && (
                            <Badge variant="secondary" className="mt-2">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        {template.isSystem && (
                          <Badge variant="outline">System</Badge>
                        )}
                      </div>
                      {template.subject && (
                        <CardDescription className="mt-2">
                          <strong>Subject:</strong> {template.subject}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {template.content}
                          </p>
                        </div>
                        {template.variables && template.variables.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-1">Variables:</p>
                            <div className="flex flex-wrap gap-1">
                              {template.variables.map((v: string) => (
                                <Badge key={v} variant="outline" className="text-xs">
                                  {`{{${v}}}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(template.content)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          {!template.isSystem && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this template?")) {
                                  deleteTemplate.mutate({ id: template.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
              {previewTemplate?.subject && (
                <DialogDescription>
                  <strong>Subject:</strong> {previewTemplate.subject}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Content</Label>
                <div className="mt-2 p-4 bg-muted rounded-md whitespace-pre-wrap">
                  {previewTemplate?.content}
                </div>
              </div>
              {previewTemplate?.variables && previewTemplate.variables.length > 0 && (
                <div>
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewTemplate.variables.map((v: string) => (
                      <Badge key={v} variant="secondary">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(previewTemplate?.content || "")}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button onClick={() => setPreviewTemplate(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
