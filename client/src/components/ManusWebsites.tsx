import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink, CheckCircle2, XCircle, Loader2, Globe, RefreshCw, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ManusWebsitesProps {
  clientId: number;
}

export function ManusWebsites({ clientId }: ManusWebsitesProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectName: "",
    projectTitle: "",
    projectDescription: "",
    template: "web-static" as "web-static" | "web-db-user",
    designStandardId: "" as string,
  });

  const { data: websites, refetch } = trpc.manusWebsites.getWebsites.useQuery({ clientId });
  const { data: designStandards } = trpc.designStandards.getAll.useQuery();
  const { data: defaultStandard } = trpc.designStandards.getDefault.useQuery();
  const createMutation = trpc.manusWebsites.createWebsite.useMutation();
  const deleteMutation = trpc.manusWebsites.deleteWebsite.useMutation();
  const refreshMutation = trpc.manusWebsites.refreshWebsite.useMutation();

  const handleCreate = async () => {
    if (!formData.projectName || !formData.projectTitle) {
      toast.error("Please fill in project name and title");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        clientId,
        projectName: formData.projectName,
        projectTitle: formData.projectTitle,
        projectDescription: formData.projectDescription,
        template: formData.template,
        designStandardId: formData.designStandardId ? parseInt(formData.designStandardId) : undefined,
      });

      if (result.success) {
        toast.success(result.message);
        setIsCreateDialogOpen(false);
        setFormData({
          projectName: "",
          projectTitle: "",
          projectDescription: "",
          template: "web-static",
          designStandardId: defaultStandard?.id.toString() || "",
        });
        refetch();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to create Manus website");
    }
  };

  const handleDelete = async (id: number, projectName: string) => {
    if (!confirm(`Are you sure you want to archive "${projectName}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Website archived successfully!");
      refetch();
    } catch (error) {
      toast.error("Failed to archive website");
    }
  };

  const handleRefresh = async (id: number) => {
    try {
      const result = await refreshMutation.mutateAsync({ id });
      if (result.success) {
        toast.success("Website status refreshed!");
        refetch();
      } else {
        toast.error(result.message || "Failed to refresh website");
      }
    } catch (error) {
      toast.error("Failed to refresh website");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        );
      case "creating":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Creating
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="gap-1">
            Archived
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Manus Websites
            </CardTitle>
            <CardDescription className="mt-2">
              Create and manage Manus-powered websites for this client
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Website
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Manus Website</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g., client-blog"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal identifier (lowercase, no spaces)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectTitle">Project Title *</Label>
                  <Input
                    id="projectTitle"
                    placeholder="e.g., Client Blog"
                    value={formData.projectTitle}
                    onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name for the website
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Description (Optional)</Label>
                  <Textarea
                    id="projectDescription"
                    placeholder="Brief description of the website..."
                    value={formData.projectDescription}
                    onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Select
                    value={formData.template}
                    onValueChange={(value: "web-static" | "web-db-user") =>
                      setFormData({ ...formData, template: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web-static">Static Website (HTML/CSS/JS)</SelectItem>
                      <SelectItem value="web-db-user">Full Stack (Database + Auth)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.template === "web-static"
                      ? "Simple static website with blog capabilities"
                      : "Full-featured web app with database and user authentication"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designStandard">Design Standard</Label>
                  <Select
                    value={formData.designStandardId}
                    onValueChange={(value) => setFormData({ ...formData, designStandardId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select design standard..." />
                    </SelectTrigger>
                    <SelectContent>
                      {designStandards && designStandards.length > 0 ? (
                        designStandards.map((standard) => (
                          <SelectItem key={standard.id} value={standard.id.toString()}>
                            {standard.name} {standard.isDefault === 1 && "(Default)"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No design standards available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Apply your agency's design guidelines to this website
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Create Website
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!websites || websites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Rocket className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No Manus websites created yet</p>
            <p className="text-sm mt-1">Create a website to start publishing content</p>
          </div>
        ) : (
          <div className="space-y-4">
            {websites.map((website) => (
              <div
                key={website.id}
                className="flex items-start justify-between p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{website.projectTitle}</h4>
                    {getStatusBadge(website.status)}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Project: <span className="font-mono">{website.projectName}</span></p>
                    {website.projectDescription && (
                      <p className="text-xs">{website.projectDescription}</p>
                    )}
                    {website.previewUrl && (
                      <div className="flex items-center gap-2 mt-2">
                        <ExternalLink className="h-3 w-3" />
                        <a
                          href={website.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-primary"
                        >
                          {website.previewUrl}
                        </a>
                      </div>
                    )}
                    {website.customDomain && (
                      <p className="text-xs">Custom Domain: {website.customDomain}</p>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant="outline" className="text-xs">
                        {website.template}
                      </Badge>
                      {website.lastDeployedAt && (
                        <span className="text-xs">
                          Last deployed: {new Date(website.lastDeployedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRefresh(website.id)}
                    disabled={refreshMutation.isPending}
                    title="Refresh status"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(website.id, website.projectName)}
                    disabled={deleteMutation.isPending}
                    title="Archive website"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
