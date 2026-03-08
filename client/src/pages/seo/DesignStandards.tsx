import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Palette, Type, Layers, Grid3X3, Sparkles, Check,
  AlertCircle, Info, CheckCircle2, XCircle, ChevronRight, Star
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

function deriveColorPalette(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const toHex = (rv: number, gv: number, bv: number) =>
    "#" + [rv, gv, bv].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (ratio: number, dark = false) => {
    if (dark) return toHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio));
    return toHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio);
  };
  return [
    { label: "50", value: mix(0.92) },
    { label: "100", value: mix(0.82) },
    { label: "200", value: mix(0.65) },
    { label: "300", value: mix(0.45) },
    { label: "400", value: mix(0.2) },
    { label: "500", value: hex },
    { label: "600", value: mix(0.15, true) },
    { label: "700", value: mix(0.3, true) },
    { label: "800", value: mix(0.5, true) },
    { label: "900", value: mix(0.7, true) },
  ];
}

function ColorSwatch({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group cursor-pointer" onClick={copy}>
      <div className="h-12 rounded-lg border border-border/40 mb-1.5 transition-transform group-hover:scale-105" style={{ backgroundColor: value }} />
      <p className="text-xs font-medium text-center">{label}</p>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        {copied ? <><Check className="h-3 w-3 text-green-500" />Copied</> : value}
      </p>
    </div>
  );
}

const TYPOGRAPHY_SCALE = [
  { name: "Display", size: "text-5xl", weight: "font-bold", sample: "Agency-Scale SEO" },
  { name: "H1", size: "text-4xl", weight: "font-bold", sample: "Content Performance" },
  { name: "H2", size: "text-3xl", weight: "font-semibold", sample: "Keyword Rankings" },
  { name: "H3", size: "text-2xl", weight: "font-semibold", sample: "Client Overview" },
  { name: "H4", size: "text-xl", weight: "font-medium", sample: "Analytics Dashboard" },
  { name: "Body LG", size: "text-lg", weight: "font-normal", sample: "Track your content performance across all clients and campaigns." },
  { name: "Body", size: "text-base", weight: "font-normal", sample: "Manage briefs, approvals, publishing schedules, and SEO audits in one place." },
  { name: "Small", size: "text-sm", weight: "font-normal", sample: "Last updated 2 hours ago · 1,240 words · Quality score: 87" },
  { name: "Caption", size: "text-xs", weight: "font-medium", sample: "PENDING REVIEW · 3 ITEMS · DUE TODAY" },
];

const SPACING_SCALE = [
  { label: "4px", px: 4 },
  { label: "8px", px: 8 },
  { label: "12px", px: 12 },
  { label: "16px", px: 16 },
  { label: "24px", px: 24 },
  { label: "32px", px: 32 },
  { label: "48px", px: 48 },
  { label: "64px", px: 64 },
];

const SEMANTIC_COLORS = [
  { label: "Success", bg: "bg-green-500", text: "text-green-700", light: "bg-green-50", border: "border-green-200" },
  { label: "Warning", bg: "bg-yellow-500", text: "text-yellow-700", light: "bg-yellow-50", border: "border-yellow-200" },
  { label: "Error", bg: "bg-red-500", text: "text-red-700", light: "bg-red-50", border: "border-red-200" },
  { label: "Info", bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50", border: "border-blue-200" },
];

export default function DesignStandards() {
  const [, setLocation] = useLocation();
  const { data: settings } = trpc.seo.agencySettings.getAll.useQuery();

  const agencyName = settings?.["agency_name"] || "Your Agency";
  const primaryColor = settings?.["primary_color"] || "#3b82f6";
  const agencyTagline = settings?.["agency_tagline"] || "Content & SEO Platform";
  const defaultTone = settings?.["default_tone"] || "Professional";
  const defaultAudience = settings?.["default_audience"] || "B2B decision makers";

  const palette = useMemo(() => deriveColorPalette(primaryColor), [primaryColor]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Design Standards</h1>
          <p className="text-muted-foreground">
            Living style guide for <span className="font-medium text-foreground">{agencyName}</span> — derived from your agency settings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/seo/settings")}>
          Edit in Settings <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Brand Identity</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Agency Name</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{agencyName}</p>
              <p className="text-sm text-muted-foreground mt-1">{agencyTagline}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Default Tone</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="text-sm px-3 py-1">{defaultTone || "Not set"}</Badge>
              <p className="text-xs text-muted-foreground mt-2">Applied to all AI-generated content</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Target Audience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{defaultAudience || "Not set"}</p>
              <p className="text-xs text-muted-foreground mt-2">Default audience for new content briefs</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Color Palette</h2>
          <Badge variant="outline" className="ml-2 text-xs">Primary: {primaryColor}</Badge>
        </div>
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Primary Brand Scale</CardTitle>
            <CardDescription>Click any swatch to copy the hex value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {palette.map(({ label, value }) => (
                <ColorSwatch key={label} label={label} value={value} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Semantic Colors</CardTitle>
            <CardDescription>Status and feedback color conventions used across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SEMANTIC_COLORS.map(({ label, bg, text, light, border }) => (
                <div key={label} className={`rounded-lg p-4 border ${light} ${border}`}>
                  <div className={`h-8 w-8 rounded-full ${bg} mb-2`} />
                  <p className={`text-sm font-semibold ${text}`}>{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Used for {label.toLowerCase()} states</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Type className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Typography Scale</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {TYPOGRAPHY_SCALE.map(({ name, size, weight, sample }) => (
                <div key={name} className="flex items-baseline gap-6 border-b border-border/40 pb-5 last:border-0 last:pb-0">
                  <div className="w-20 shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{size.replace("text-", "")} · {weight.replace("font-", "")}</p>
                  </div>
                  <p className={`${size} ${weight} leading-tight`}>{sample}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Spacing Scale</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {SPACING_SCALE.map(({ label, px }) => (
                <div key={label} className="flex items-center gap-4">
                  <p className="text-xs text-muted-foreground w-12 shrink-0">{label}</p>
                  <div className="h-5 rounded" style={{ width: px, backgroundColor: primaryColor, opacity: 0.7 }} />
                  <p className="text-xs text-muted-foreground">{px / 4} rem unit</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Component Examples</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Buttons</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button style={{ backgroundColor: primaryColor }}>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Status Badges</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">In Review</Badge>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">In Progress</Badge>
              <Badge className="bg-gray-100 text-gray-700 border-gray-200">Draft</Badge>
              <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">Scheduled</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Alert Patterns</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: CheckCircle2, label: "Success", bg: "bg-green-50 border-green-200", text: "text-green-700" },
                { icon: AlertCircle, label: "Warning", bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" },
                { icon: XCircle, label: "Error", bg: "bg-red-50 border-red-200", text: "text-red-700" },
                { icon: Info, label: "Info", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
              ].map(({ icon: Icon, label, bg, text }) => (
                <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${bg} ${text}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{label}:</span>
                  <span className="opacity-80">This is a {label.toLowerCase()} message pattern.</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Content Card</CardTitle></CardHeader>
            <CardContent>
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">10 SEO Strategies for 2025</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Acme Corp · 1,240 words</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Approved</Badge>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: "87%", backgroundColor: primaryColor }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: primaryColor }}>87</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Quality Score</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Content Voice & Style</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Tone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold capitalize">{defaultTone || "Professional"}</p>
              <p className="text-xs text-muted-foreground mt-1">Applied to all AI-generated content by default.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Audience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{defaultAudience || "General"}</p>
              <p className="text-xs text-muted-foreground mt-1">Default target reader for briefs and content generation prompts.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Quality Threshold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: primaryColor }}>70</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum quality score before content is eligible for approval.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
