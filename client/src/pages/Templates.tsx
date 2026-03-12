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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, MessageSquare, Plus, Eye, Copy, Trash2, RefreshCw, Zap, CheckCircle2, Clock, ChevronRight, Download, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAgency } from "@/contexts/AgencyContext";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Lead type labels ──────────────────────────────────────────────────────────
const LEAD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  dscr:     { label: "DSCR",       color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  fix_flip: { label: "Fix & Flip", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  old_lead: { label: "Old Leads",  color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};
const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "Auto — fires when lead is created",
  manual:       "Manual — enroll leads yourself",
};
function delayLabel(hours: number): string {
  if (hours === 0) return "Immediately";
  if (hours < 24) return `After ${hours}h`;
  return `Day ${Math.round(hours / 24)}`;
}

// ─── Drip Sequences Tab ────────────────────────────────────────────────────────
function DripSequencesTab() {
  const { agencyId } = useAgency();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const { data: templates, isLoading } = trpc.seedCampaigns.listPrebuiltTemplates.useQuery();
  const { data: clients } = trpc.admin.listClients.useQuery({ agencyId }, { enabled: isAdmin && agencyId > 0 });
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [installing, setInstalling] = useState<number | null>(null);
  const installMutation = trpc.seedCampaigns.installForClient.useMutation({
    onSuccess: (data) => { setInstalling(null); data.alreadyExists ? toast.info(data.message) : toast.success(data.message); },
    onError: (err) => { setInstalling(null); toast.error(err.message || "Failed to install campaign"); },
  });
  const handleInstall = (index: number) => {
    setInstalling(index);
    installMutation.mutate({ campaignIndex: index, clientId: selectedClientId ? parseInt(selectedClientId) : undefined });
  };
  if (isLoading) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  return (
    <div className="space-y-6">
      {isAdmin && clients && clients.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <Label className="text-sm font-medium">Install for client</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Select a client to scope this campaign to their account, or leave blank for agency-wide.</p>
              </div>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Agency-wide (all clients)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Agency-wide</SelectItem>
                  {clients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-6">
        {(templates ?? []).map((tpl) => {
          const typeInfo = LEAD_TYPE_LABELS[tpl.leadType] ?? { label: tpl.leadType, color: "bg-muted text-muted-foreground border-border" };
          const isInstalling = installing === tpl.index;
          const clientName = clients?.find((c: any) => String(c.id) === selectedClientId)?.name;
          return (
            <Card key={tpl.index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{tpl.name}</CardTitle>
                      <Badge variant="outline" className={typeInfo.color}>{typeInfo.label}</Badge>
                    </div>
                    <CardDescription>{tpl.description}</CardDescription>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{TRIGGER_LABELS[tpl.triggerEvent] ?? tpl.triggerEvent}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tpl.stepCount} steps</span>
                      {tpl.stopOnAppointment && <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" />Stops on appointment</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button size="sm" onClick={() => handleInstall(tpl.index)} disabled={isInstalling || installMutation.isPending} className="shrink-0">
                      {isInstalling ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Installing...</> : <><Download className="w-4 h-4 mr-2" />Install{selectedClientId && clientName ? ` for ${clientName}` : ""}</>}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Accordion type="single" collapsible>
                  <AccordionItem value="steps" className="border-0">
                    <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2">Preview all {tpl.stepCount} steps</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-1">
                        {tpl.steps.map((step) => (
                          <div key={step.stepOrder} className="flex gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                            <div className="shrink-0 flex flex-col items-center gap-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step.channel === "email" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>{step.stepOrder}</div>
                              <span className="text-[10px] text-muted-foreground">{step.channel === "email" ? "Email" : "SMS"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-muted-foreground">{delayLabel(step.delayHours)}</span>
                                {step.subject && <><ChevronRight className="w-3 h-3 text-muted-foreground/50" /><span className="text-xs font-medium truncate">{step.subject}</span></>}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{step.preview}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [selectedType, setSelectedType] = useState<"email" | "sms" | "drip">("drip");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const seedTemplates = trpc.seedTemplates.seedDefaults.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.message} Refreshing list...`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to seed templates");
    },
  });

  const { data: templates, isLoading, refetch } = trpc.templates.list.useQuery(
    { type: selectedType as "email" | "sms" },
    { enabled: selectedType !== "drip" }
  );

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
          <div className="flex items-center gap-2">
            {isAdmin && selectedType !== "drip" && (
              <Button
                variant="outline"
                onClick={() => seedTemplates.mutate()}
                disabled={seedTemplates.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${seedTemplates.isPending ? 'animate-spin' : ''}`} />
                {seedTemplates.isPending ? "Seeding..." : "Seed Default Templates"}
              </Button>
            )}
            {selectedType !== "drip" && <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
              </Dialog>}
          </div>
        </div>

        <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as "email" | "sms" | "drip")}>
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
            <TabsTrigger value="drip">
              <Zap className="w-4 h-4 mr-2" />
              Drip Sequences
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drip">
            <DripSequencesTab />
          </TabsContent>

          {(["email", "sms"] as const).map((type) => (
            <TabsContent key={type} value={type} className="mt-0">
              {isLoading && selectedType === type ? (
                <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
              ) : !templates || templates.length === 0 ? (
                <Card><CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">No {type} templates yet. Click "Seed Default Templates" to load pre-written templates, or create your own.</p>
                  <Button onClick={() => setCreateDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Template</Button>
                </CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {templates?.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {template.category && <Badge variant="secondary" className="mt-2">{template.category}</Badge>}
                          </div>
                          {template.isSystem && <Badge variant="outline">System</Badge>}
                        </div>
                        {template.subject && <CardDescription className="mt-2"><strong>Subject:</strong> {template.subject}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                          {template.variables && template.variables.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Variables:</p>
                              <div className="flex flex-wrap gap-1">
                                {template.variables.map((v: string) => <Badge key={v} variant="outline" className="text-xs">{`{{${v}}}`}</Badge>)}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(template)}><Eye className="w-4 h-4 mr-1" />Preview</Button>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(template.content)}><Copy className="w-4 h-4 mr-1" />Copy</Button>
                            {!template.isSystem && (
                              <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this template?")) deleteTemplate.mutate({ id: template.id }); }}>
                                <Trash2 className="w-4 h-4 mr-1" />Delete
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
          ))}
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
