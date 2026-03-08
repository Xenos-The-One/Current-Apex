import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink, CheckCircle2, XCircle, Loader2, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WordPressConnectionsProps {
  clientId: number;
}

export function WordPressConnections({ clientId }: WordPressConnectionsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [formData, setFormData] = useState({
    siteName: "",
    siteUrl: "",
    username: "",
    applicationPassword: "",
    defaultStatus: "draft" as "draft" | "publish" | "pending",
    defaultAuthorId: "",
    defaultCategoryId: "",
  });

  const { data: connections, refetch } = trpc.wordpress.getConnections.useQuery({ clientId });
  const addMutation = trpc.wordpress.addConnection.useMutation();
  const deleteMutation = trpc.wordpress.deleteConnection.useMutation();
  const testMutation = trpc.wordpress.testConnection.useMutation();

  const handleTest = async () => {
    if (!formData.siteUrl || !formData.username || !formData.applicationPassword) {
      toast.error("Please fill in site URL, username, and application password");
      return;
    }

    setIsTesting(true);
    try {
      const result = await testMutation.mutateAsync({
        siteUrl: formData.siteUrl,
        username: formData.username,
        applicationPassword: formData.applicationPassword,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.siteName || !formData.siteUrl || !formData.username || !formData.applicationPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await addMutation.mutateAsync({
        clientId,
        siteName: formData.siteName,
        siteUrl: formData.siteUrl,
        username: formData.username,
        applicationPassword: formData.applicationPassword,
        defaultStatus: formData.defaultStatus,
        defaultAuthorId: formData.defaultAuthorId ? parseInt(formData.defaultAuthorId) : undefined,
        defaultCategoryId: formData.defaultCategoryId ? parseInt(formData.defaultCategoryId) : undefined,
      });

      toast.success("WordPress connection added successfully!");
      setIsAddDialogOpen(false);
      setFormData({
        siteName: "",
        siteUrl: "",
        username: "",
        applicationPassword: "",
        defaultStatus: "draft",
        defaultAuthorId: "",
        defaultCategoryId: "",
      });
      refetch();
    } catch (error) {
      toast.error("Failed to add WordPress connection");
    }
  };

  const handleDelete = async (id: number, siteName: string) => {
    if (!confirm(`Are you sure you want to delete the connection to "${siteName}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Connection deleted successfully!");
      refetch();
    } catch (error) {
      toast.error("Failed to delete connection");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              WordPress Connections
            </CardTitle>
            <CardDescription className="mt-2">
              Manage WordPress site connections for automated content publishing
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add WordPress Connection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name *</Label>
                  <Input
                    id="siteName"
                    placeholder="e.g., Client Blog"
                    value={formData.siteName}
                    onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteUrl">WordPress Site URL *</Label>
                  <Input
                    id="siteUrl"
                    placeholder="https://example.com"
                    value={formData.siteUrl}
                    onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The base URL of the WordPress site (without /wp-admin)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">WordPress Username *</Label>
                  <Input
                    id="username"
                    placeholder="admin"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicationPassword">Application Password *</Label>
                  <Input
                    id="applicationPassword"
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    value={formData.applicationPassword}
                    onChange={(e) => setFormData({ ...formData, applicationPassword: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate in WordPress: Users → Profile → Application Passwords
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="defaultStatus">Default Publish Status</Label>
                  <Select
                    value={formData.defaultStatus}
                    onValueChange={(value: "draft" | "publish" | "pending") =>
                      setFormData({ ...formData, defaultStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="publish">Publish</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultAuthorId">Default Author ID (Optional)</Label>
                    <Input
                      id="defaultAuthorId"
                      type="number"
                      placeholder="1"
                      value={formData.defaultAuthorId}
                      onChange={(e) => setFormData({ ...formData, defaultAuthorId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultCategoryId">Default Category ID (Optional)</Label>
                    <Input
                      id="defaultCategoryId"
                      type="number"
                      placeholder="1"
                      value={formData.defaultCategoryId}
                      onChange={(e) => setFormData({ ...formData, defaultCategoryId: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleTest} disabled={isTesting}>
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button onClick={handleAdd} disabled={addMutation.isPending}>
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Connection"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!connections || connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No WordPress connections configured</p>
            <p className="text-sm mt-1">Add a connection to enable automated publishing</p>
          </div>
        ) : (
          <div className="space-y-4">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-start justify-between p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{connection.siteName}</h4>
                    {connection.isActive === 1 ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3 w-3" />
                      <a
                        href={connection.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {connection.siteUrl}
                      </a>
                    </div>
                    <p>Username: {connection.username}</p>
                    <p>Default Status: <Badge variant="outline" className="ml-1">{connection.defaultStatus}</Badge></p>
                    {connection.lastPublishedAt && (
                      <p>Last Published: {new Date(connection.lastPublishedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(connection.id, connection.siteName)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
