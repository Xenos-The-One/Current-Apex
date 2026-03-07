import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  Globe,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SEOPortal() {
  const { agencyId } = useAgency();
  const [keyword, setKeyword] = useState("");
  const [topic, setTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatingContent, setGeneratingContent] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [generatingMeta, setGeneratingMeta] = useState(false);

  const generateBlogPost = trpc.ai.generateEmailContent.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data.content ?? "");
      setGeneratingContent(false);
      toast.success("Blog post draft generated!");
    },
    onError: () => {
      setGeneratingContent(false);
      toast.error("Failed to generate content");
    },
  });

  const handleGenerateBlog = () => {
    if (!topic.trim()) return toast.error("Enter a topic first");
    setGeneratingContent(true);
    generateBlogPost.mutate({
      purpose: "SEO blog post",
      context: `Write a comprehensive, SEO-optimized blog post about: ${topic}. Target keyword: ${keyword || topic}. Write for mortgage professionals and home buyers. Include H2 headings, bullet points, and a strong call to action.`,
      tone: "professional",
    });
  };

  const handleGenerateMeta = () => {
    if (!topic.trim()) return toast.error("Enter a topic first");
    setGeneratingMeta(true);
    generateBlogPost.mutate({
      purpose: "SEO meta tags",
      context: `Generate an SEO meta title (max 60 chars) and meta description (max 160 chars) for a page about: ${topic}. Return as: TITLE: [title]\nDESCRIPTION: [description]`,
      tone: "professional",
    });
    setTimeout(() => setGeneratingMeta(false), 3000);
  };

  const seoTips = [
    { title: "Optimize Google Business Profile", status: "action", desc: "Add photos, respond to reviews, and keep hours updated." },
    { title: "Create Local Landing Pages", status: "action", desc: "Build pages targeting '[city] mortgage broker' keywords." },
    { title: "Publish Weekly Blog Content", status: "pending", desc: "Consistent content signals authority to search engines." },
    { title: "Build Backlinks from Realtor Sites", status: "pending", desc: "Partner with real estate agents for reciprocal linking." },
    { title: "Schema Markup for Reviews", status: "done", desc: "Structured data helps Google display star ratings in search." },
    { title: "Mobile Page Speed Optimization", status: "done", desc: "Core Web Vitals are a ranking factor — keep scores above 90." },
  ];

  const keywordIdeas = [
    { keyword: "mortgage broker near me", volume: "High", difficulty: "Medium", intent: "Transactional" },
    { keyword: "first time home buyer loans", volume: "High", difficulty: "High", intent: "Informational" },
    { keyword: "refinance mortgage rates today", volume: "High", difficulty: "High", intent: "Transactional" },
    { keyword: "FHA loan requirements 2026", volume: "Medium", difficulty: "Low", intent: "Informational" },
    { keyword: "VA home loan benefits", volume: "Medium", difficulty: "Low", intent: "Informational" },
    { keyword: "jumbo loan limits 2026", volume: "Medium", difficulty: "Medium", intent: "Informational" },
    { keyword: "how to get pre-approved for mortgage", volume: "High", difficulty: "Medium", intent: "Informational" },
    { keyword: "debt to income ratio calculator", volume: "Medium", difficulty: "Low", intent: "Tool" },
  ];

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Globe className="w-6 h-6 text-primary" /> AI SEO Portal
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              AI-powered SEO tools to grow your organic search presence.
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Sparkles className="w-3 h-3 text-yellow-500" /> AI Powered
          </Badge>
        </div>

        <Tabs defaultValue="content">
          <TabsList className="mb-4">
            <TabsTrigger value="content" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Content Generator</TabsTrigger>
            <TabsTrigger value="keywords" className="gap-1.5"><Search className="w-3.5 h-3.5" /> Keyword Ideas</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> SEO Audit</TabsTrigger>
            <TabsTrigger value="tips" className="gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Action Items</TabsTrigger>
          </TabsList>

          {/* Content Generator */}
          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Blog Post Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Blog Topic *</Label>
                    <Input
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. How to get pre-approved for a mortgage in 2026"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Target Keyword (optional)</Label>
                    <Input
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      placeholder="e.g. mortgage pre-approval"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleGenerateBlog} disabled={generatingContent || !topic.trim()} className="w-full gap-2">
                    {generatingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generatingContent ? "Generating..." : "Generate Blog Post"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> Meta Tags Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Page Topic *</Label>
                    <Input
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. FHA loan requirements"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleGenerateMeta} disabled={generatingMeta || !topic.trim()} variant="outline" className="w-full gap-2">
                    {generatingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    {generatingMeta ? "Generating..." : "Generate Meta Tags"}
                  </Button>
                  {metaTitle && (
                    <div className="space-y-2 p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Meta Title ({metaTitle.length}/60)</p>
                        <p className="text-sm">{metaTitle}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Meta Description ({metaDesc.length}/160)</p>
                        <p className="text-sm">{metaDesc}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {generatedContent && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" /> Generated Blog Post
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(generatedContent);
                      toast.success("Copied to clipboard!");
                    }}>
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generatedContent}
                    onChange={e => setGeneratedContent(e.target.value)}
                    rows={20}
                    className="font-mono text-xs"
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Keyword Ideas */}
          <TabsContent value="keywords">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Mortgage Industry Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Keyword</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Volume</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Difficulty</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Intent</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordIdeas.map((kw, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-2.5 px-3 font-medium">{kw.keyword}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className={`text-xs ${kw.volume === "High" ? "border-green-300 text-green-700" : "border-yellow-300 text-yellow-700"}`}>
                              {kw.volume}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className={`text-xs ${kw.difficulty === "Low" ? "border-green-300 text-green-700" : kw.difficulty === "Medium" ? "border-yellow-300 text-yellow-700" : "border-red-300 text-red-700"}`}>
                              {kw.difficulty}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs">{kw.intent}</td>
                          <td className="py-2.5 px-3">
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => {
                              setTopic(kw.keyword);
                              toast.success("Keyword set as topic — switch to Content Generator tab");
                            }}>
                              <Sparkles className="w-3 h-3" /> Use
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Audit */}
          <TabsContent value="audit">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {[
                { label: "Domain Authority", value: "N/A", desc: "Connect your domain to track", icon: Globe, color: "text-blue-500" },
                { label: "Organic Keywords", value: "N/A", desc: "Requires Google Search Console", icon: Search, color: "text-green-500" },
                { label: "Backlinks", value: "N/A", desc: "Connect Ahrefs or Moz", icon: TrendingUp, color: "text-purple-500" },
              ].map(stat => (
                <Card key={stat.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-xs font-medium">{stat.label}</p>
                      <p className="text-xs text-muted-foreground">{stat.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
                <Globe className="w-12 h-12 text-muted-foreground/30" />
                <p className="font-semibold">Connect Your Domain</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Enter your website URL in Settings to enable automated SEO audits, Core Web Vitals monitoring, and keyword ranking tracking.
                </p>
                <Button variant="outline" className="gap-1.5 mt-2">
                  <Globe className="w-4 h-4" /> Go to Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Action Items */}
          <TabsContent value="tips">
            <div className="space-y-2.5">
              {seoTips.map((tip, i) => (
                <Card key={i} className="border shadow-sm">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tip.status === "done" ? "bg-green-100" : tip.status === "action" ? "bg-orange-100" : "bg-blue-100"}`}>
                      {tip.status === "done" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Lightbulb className={`w-4 h-4 ${tip.status === "action" ? "text-orange-600" : "text-blue-600"}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{tip.title}</p>
                        <Badge variant="outline" className={`text-xs capitalize ${tip.status === "done" ? "border-green-300 text-green-700" : tip.status === "action" ? "border-orange-300 text-orange-700" : "border-blue-300 text-blue-700"}`}>
                          {tip.status === "action" ? "Take Action" : tip.status === "done" ? "Complete" : "Planned"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
