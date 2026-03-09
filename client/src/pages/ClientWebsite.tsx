import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings,
} from "lucide-react";

export default function ClientWebsite() {
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);

  // Fetch client's onboarding data to get their website URL
  const { data: onboarding, isLoading } = trpc.clientOnboarding.getMyOnboarding.useQuery();

  const websiteUrl = (onboarding as any)?.websiteUrl || (onboarding as any)?.businessWebsite || "";
  const hasWebsite = !!websiteUrl;

  const viewWidths = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  function handleRefresh() {
    setRefreshKey(k => k + 1);
    setIframeError(false);
  }

  function openInNewTab() {
    if (websiteUrl) {
      const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
      window.open(url, "_blank");
    }
  }

  const displayUrl = websiteUrl
    ? (websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`)
    : "";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Website</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Preview and manage your online presence</p>
          </div>
          {hasWebsite && (
            <div className="flex items-center gap-2">
              {/* View mode toggles */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                {(["desktop", "tablet", "mobile"] as const).map((mode) => {
                  const Icon = mode === "desktop" ? Monitor : mode === "tablet" ? Tablet : Smartphone;
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`p-2 transition-colors ${
                        viewMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                      title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
              <Button size="sm" onClick={openInNewTab} className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasWebsite ? (
          /* No website configured */
          <Card className="border shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Globe className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Website Connected</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Add your website URL in your Account Setup to preview it here and track your online presence.
              </p>
              <Button
                onClick={() => window.location.href = "/account-setup"}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Go to Account Setup
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* URL bar */}
            <Card className="border shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-xs text-muted-foreground">Website</span>
                  </div>
                  <div className="flex-1 bg-muted rounded px-3 py-1.5 text-sm font-mono text-muted-foreground truncate">
                    {displayUrl}
                  </div>
                  <Button variant="ghost" size="sm" onClick={openInNewTab} className="gap-1 shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="text-xs">Open in new tab</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Website preview */}
            <Card className="border shadow-sm overflow-hidden">
              <CardHeader className="pb-2 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Live Preview
                    <Badge variant="outline" className="text-xs capitalize">{viewMode}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {viewMode === "desktop" ? "Full width" : viewMode === "tablet" ? "768px" : "375px"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-gray-100">
                <div className="flex justify-center py-4" style={{ minHeight: "600px" }}>
                  <div
                    className="bg-white shadow-lg transition-all duration-300 overflow-hidden"
                    style={{
                      width: viewWidths[viewMode],
                      maxWidth: "100%",
                      height: "600px",
                    }}
                  >
                    {iframeError ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                        <p className="font-medium mb-1">Unable to preview this website</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          This site may block embedding. Open it directly in a new tab instead.
                        </p>
                        <Button onClick={openInNewTab} className="gap-2">
                          <ExternalLink className="w-4 h-4" />
                          Open Website
                        </Button>
                      </div>
                    ) : (
                      <iframe
                        key={refreshKey}
                        src={displayUrl}
                        className="w-full h-full border-0"
                        title="Website Preview"
                        onError={() => setIframeError(true)}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info note */}
            <p className="text-xs text-muted-foreground text-center">
              Some websites block embedding for security reasons. If the preview doesn't load, use the "Open" button to view your site directly.
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
