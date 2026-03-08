import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Sparkles, Copy, Check, Mail, MessageSquare, Share2, Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function AIScriptGenerator() {
  const [scriptType, setScriptType] = useState<"email" | "sms" | "social" | "voice" | "youtube">("voice");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "casual" | "urgent">("professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [generatedContent, setGeneratedContent] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: scripts, refetch } = trpc.ai.listScripts.useQuery();
  
  const generateScript = trpc.ai.generateScript.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast.success("Script generated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    generateScript.mutate({
      scriptType,
      prompt,
      context: {
        tone,
        length,
      },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getScriptTypeIcon = (type: string) => {
    switch (type) {
      case "voice":
        return <Phone className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "sms":
        return <MessageSquare className="w-4 h-4" />;
      case "social":
        return <Share2 className="w-4 h-4" />;
      case "youtube":
        return <Video className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getScriptTypeDescription = () => {
    switch (scriptType) {
      case "voice":
        return "Generate conversational scripts for AI voice assistants that call leads";
      case "email":
        return "Create compelling email copy with subject lines and calls-to-action";
      case "sms":
        return "Write concise, impactful text messages that get responses";
      case "social":
        return "Craft engaging social media posts for Facebook, Instagram, and LinkedIn";
      case "youtube":
        return "Build structured video scripts with hooks and timestamps";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Script Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate professional scripts for voice calls, emails, SMS, social media, and videos
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Generator Form */}
          <Card>
            <CardHeader>
              <CardTitle>Generate New Script</CardTitle>
              <CardDescription>{getScriptTypeDescription()}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Script Type */}
                <div className="space-y-2">
                  <Label htmlFor="scriptType">Script Type *</Label>
                  <Select value={scriptType} onValueChange={(v: any) => setScriptType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voice">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Vapi Voice Script
                        </div>
                      </SelectItem>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Email Campaign
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          SMS Message
                        </div>
                      </SelectItem>
                      <SelectItem value="social">
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4" />
                          Social Media Post
                        </div>
                      </SelectItem>
                      <SelectItem value="youtube">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          YouTube Video Script
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">What do you want to create? *</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: Create a script for calling mortgage leads who downloaded our first-time homebuyer guide. Focus on qualifying their timeline and budget."
                    rows={4}
                    required
                  />
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Length (not for SMS) */}
                {scriptType !== "sms" && (
                  <div className="space-y-2">
                    <Label htmlFor="length">Length</Label>
                    <Select value={length} onValueChange={(v: any) => setLength(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="long">Long</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Generate Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={generateScript.isPending}
                >
                  {generateScript.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Script
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Generated Output */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Script</CardTitle>
                  <CardDescription>Your AI-generated content</CardDescription>
                </div>
                {generatedContent && (
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedContent ? (
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{generatedContent}</Streamdown>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No script generated yet</p>
                  <p className="text-sm mt-1">Fill out the form and click Generate to create your script</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Script History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scripts</CardTitle>
            <CardDescription>Your previously generated scripts</CardDescription>
          </CardHeader>
          <CardContent>
            {scripts && scripts.length > 0 ? (
              <div className="space-y-4">
                {scripts.slice(0, 10).map((script) => (
                  <div key={script.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                        {getScriptTypeIcon(script.scriptType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {script.scriptType}
                          </Badge>
                          {script.isUsed && (
                            <Badge variant="secondary">Used</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(script.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{script.prompt}</p>
                        <details className="text-sm">
                          <summary className="cursor-pointer text-primary hover:underline">
                            View generated content
                          </summary>
                          <div className="mt-2 p-3 bg-muted rounded prose prose-sm max-w-none">
                            <Streamdown>{script.generatedContent}</Streamdown>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No scripts generated yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
