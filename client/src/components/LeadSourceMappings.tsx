import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Phone } from "lucide-react";

interface LeadSourceMappingsProps {
  agencyId: number;
}

const COMMON_LEAD_SOURCES = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Google Ads",
  "Referral",
  "Website",
  "Cold Call",
  "Email Campaign",
];

export function LeadSourceMappings({ agencyId }: LeadSourceMappingsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSource, setNewSource] = useState("");
  const [newAssistantId, setNewAssistantId] = useState("");
  const [autoCallEnabled, setAutoCallEnabled] = useState(true);

  const utils = trpc.useUtils();
  const { data: mappings = [], isLoading } = trpc.admin.getLeadSourceMappings.useQuery({ agencyId });

  const createMapping = trpc.admin.createLeadSourceMapping.useMutation({
    onSuccess: () => {
      toast.success("Lead source mapping created");
      utils.admin.getLeadSourceMappings.invalidate({ agencyId });
      setIsAdding(false);
      setNewSource("");
      setNewAssistantId("");
      setAutoCallEnabled(true);
    },
    onError: (error) => {
      toast.error(`Failed to create mapping: ${error.message}`);
    },
  });

  const updateMapping = trpc.admin.updateLeadSourceMapping.useMutation({
    onSuccess: () => {
      toast.success("Mapping updated");
      utils.admin.getLeadSourceMappings.invalidate({ agencyId });
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteMapping = trpc.admin.deleteLeadSourceMapping.useMutation({
    onSuccess: () => {
      toast.success("Mapping deleted");
      utils.admin.getLeadSourceMappings.invalidate({ agencyId });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newSource || !newAssistantId) {
      toast.error("Please fill in all fields");
      return;
    }

    createMapping.mutate({
      agencyId,
      leadSource: newSource,
      vapiAssistantId: newAssistantId,
      autoCallEnabled,
    });
  };

  if (isLoading) {
    return <div>Loading mappings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Lead Source Auto-Call Configuration
            </CardTitle>
            <CardDescription>
              Assign Vapi AI assistants to automatically call leads from specific sources
            </CardDescription>
          </div>
          <Button onClick={() => setIsAdding(!isAdding)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Mapping
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Input
                  placeholder="e.g., Facebook, Instagram"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  list="common-sources"
                />
                <datalist id="common-sources">
                  {COMMON_LEAD_SOURCES.map((source) => (
                    <option key={source} value={source} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Vapi Assistant ID</Label>
                <Input
                  placeholder="Enter Vapi assistant ID"
                  value={newAssistantId}
                  onChange={(e) => setNewAssistantId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find assistant IDs in your Vapi dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoCallEnabled}
                  onCheckedChange={setAutoCallEnabled}
                />
                <Label>Auto-call on import</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={createMapping.isPending}>
                  Create
                </Button>
              </div>
            </div>
          </div>
        )}

        {mappings.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No lead source mappings configured yet</p>
            <p className="text-sm">Add mappings to enable automatic calling</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mappings.map((mapping: any) => (
              <div
                key={mapping.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="font-medium">{mapping.leadSource}</div>
                  <div className="text-sm text-muted-foreground">
                    Assistant: {mapping.vapiAssistantId}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mapping.autoCallEnabled}
                      onCheckedChange={(checked) => {
                        updateMapping.mutate({
                          id: mapping.id,
                          autoCallEnabled: checked,
                        });
                      }}
                    />
                    <span className="text-sm text-muted-foreground">Auto-call</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMapping.mutate({ id: mapping.id })}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
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
