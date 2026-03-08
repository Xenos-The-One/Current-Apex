import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TEMPLATE_TYPES = [
  { value: "product-review", label: "Product Review" },
  { value: "how-to", label: "How-To Guide" },
  { value: "listicle", label: "Listicle" },
  { value: "case-study", label: "Case Study" },
  { value: "comparison", label: "Comparison" },
  { value: "tutorial", label: "Tutorial" },
  { value: "news", label: "News" },
  { value: "opinion", label: "Opinion/Editorial" },
  { value: "custom", label: "Custom" },
];

const DEFAULT_PROMPTS: { [key: string]: string } = {
  "how-to": "Write a comprehensive how-to guide that walks readers through the process step-by-step. Include tips and best practices.",
  "listicle": "Write an engaging listicle with a catchy title and clear explanations for each item. Format as a numbered list.",
  "case-study": "Write a detailed case study that includes the problem, solution, and results. Include specific metrics and outcomes.",
  "guide": "Write a detailed guide that covers all aspects of the topic. Include introduction, main sections, and conclusion.",
  "news": "Write a news article about recent developments in the industry. Include quotes, facts, and current information.",
  "custom": "Write high-quality content optimized for SEO. Include relevant keywords and provide value to readers.",
};

export default function Templates() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: "product-review" | "how-to" | "listicle" | "case-study" | "comparison" | "tutorial" | "news" | "opinion" | "custom";
    prompt: string;
    isPublic: boolean;
  }>({
    name: "",
    description: "",
    category: "custom",
    prompt: "",
    isPublic: false,
  });

  const { data: templates, refetch } = trpc.seo.templates.list.useQuery();
  const createMutation = trpc.seo.templates.create.useMutation();
  const deleteMutation = trpc.seo.templates.delete.useMutation();
  const seedMutation = trpc.seo.templates.seedDefaults.useMutation();

  const handleCategoryChange = (category: "product-review" | "how-to" | "listicle" | "case-study" | "comparison" | "tutorial" | "news" | "opinion" | "custom") => {
    setFormData({
      ...formData,
      category,
      prompt: DEFAULT_PROMPTS[category] || "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.prompt) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        prompt: formData.prompt,
        isPublic: formData.isPublic ? 1 : 0,
      });
      toast.success("Template created successfully");
      setFormData({ name: "", description: "", category: "custom", prompt: "", isPublic: false });
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to create template");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage reusable content templates
          </p>
        </div>
        <div className="flex gap-2">
          {(!templates || templates.length === 0) && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const result = await seedMutation.mutateAsync();
                  toast.success(result.message);
                  refetch();
                } catch {
                  toast.error("Failed to load templates");
                }
              }}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Load Pre-built Templates
            </Button>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Product Review Template"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this template is for..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="type">Content Type *</Label>
                <Select value={formData.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prompt">AI Prompt *</Label>
                <Textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="Instructions for the AI..."
                  rows={5}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublic: checked as boolean })
                  }
                />
                <Label htmlFor="isPublic" className="cursor-pointer">
                  Make template public (available to all users)
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Template"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template: any) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {TEMPLATE_TYPES.find((t) => t.value === template.category)?.label}
                  </p>
                </div>
                {template.isPublic === 1 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Public
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}
              <div className="bg-accent p-3 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Prompt:</p>
                <p className="text-sm line-clamp-3">{template.prompt}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Copy className="h-4 w-4 mr-1" />
                  Use
                </Button>
                <Button size="sm" variant="outline">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(template.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No templates yet</p>
            <Button onClick={() => setIsOpen(true)}>Create your first template</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
