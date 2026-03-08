import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Send,
  Wand2,
  Building2,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

const CTA_TYPES = [
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "BOOK", label: "Book" },
  { value: "ORDER", label: "Order Online" },
  { value: "SHOP", label: "Shop" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "CALL", label: "Call Now" },
];

export default function GoogleBusinessProfile() {
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [addConnOpen, setAddConnOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  // Add connection form
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");

  // Post form
  const [postType, setPostType] = useState<"STANDARD" | "EVENT" | "OFFER" | "PRODUCT">("STANDARD");
  const [summary, setSummary] = useState("");
  const [ctaType, setCtaType] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const { data: clients = [] } = trpc.seo.clients.list.useQuery();
  const { data: connections = [], refetch: refetchConnections } = trpc.seo.googleBusinessProfile.listConnections.useQuery(
    { clientId: selectedClientId },
    { enabled: true }
  );
  const { data: locations = [], refetch: refetchLocations } = trpc.seo.googleBusinessProfile.listLocations.useQuery(
    { connectionId: selectedConnectionId ?? 0 },
    { enabled: !!selectedConnectionId }
  );
  const { data: posts = [], refetch: refetchPosts } = trpc.seo.googleBusinessProfile.listPosts.useQuery(
    { connectionId: selectedConnectionId ?? 0, locationId: selectedLocationId || undefined },
    { enabled: !!selectedConnectionId }
  );

  const addConnectionMutation = trpc.seo.googleBusinessProfile.addConnection.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected: ${data.accountName}`);
      setAddConnOpen(false);
      setAccessToken("");
      setRefreshToken("");
      refetchConnections();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteConnectionMutation = trpc.seo.googleBusinessProfile.deleteConnection.useMutation({
    onSuccess: () => {
      toast.success("Connection removed");
      setSelectedConnectionId(null);
      refetchConnections();
    },
    onError: (e) => toast.error(e.message),
  });

  const syncLocationsMutation = trpc.seo.googleBusinessProfile.syncLocations.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} location(s)`);
      refetchLocations();
    },
    onError: (e) => toast.error(e.message),
  });

  const publishPostMutation = trpc.seo.googleBusinessProfile.publishPost.useMutation({
    onSuccess: () => {
      toast.success("Post published to Google Business Profile!");
      setPostOpen(false);
      setSummary("");
      setCtaType("");
      setCtaUrl("");
      setEventTitle("");
      setEventStart("");
      setEventEnd("");
      refetchPosts();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadImageMutation = trpc.seo.googleBusinessProfile.uploadImage.useMutation({
    onSuccess: (data) => {
      setPostImageUrl(data.url);
      toast.success("Image uploaded!");
    },
    onError: (e) => {
      toast.error("Image upload failed: " + e.message);
      setImageUploading(false);
    },
    onSettled: () => setImageUploading(false),
  });

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setImageUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadImageMutation.mutate({ base64, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif", fileName: file.name });
    };
    reader.readAsDataURL(file);
  }

  const generatePostMutation = trpc.seo.googleBusinessProfile.generatePostContent.useMutation({
    onSuccess: (data) => {
      setSummary(data.summary);
      toast.success("AI post content generated");
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedConnection = connections.find((c) => c.id === selectedConnectionId);
  const selectedLocation = locations.find((l) => l.locationId === selectedLocationId);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Google Business Profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage GBP connections, locations, and posts for your clients
          </p>
        </div>
        <Dialog open={addConnOpen} onOpenChange={setAddConnOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Connect Google Business Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="rounded-lg bg-muted/40 border p-3 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">How to get an access token:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="text-primary underline">Google OAuth Playground</a></li>
                  <li>Select <strong>My Business API v4</strong> scope: <code className="text-xs bg-muted px-1 rounded">https://www.googleapis.com/auth/business.manage</code></li>
                  <li>Authorise and exchange for tokens</li>
                  <li>Paste the access token below</li>
                </ol>
              </div>
              <div className="space-y-1">
                <Label>Client</Label>
                <Select
                  value={String(selectedClientId)}
                  onValueChange={(v) => setSelectedClientId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Access Token *</Label>
                <Input
                  placeholder="ya29.a0..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Refresh Token (optional)</Label>
                <Input
                  placeholder="1//0g..."
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!accessToken || !selectedClientId || addConnectionMutation.isPending}
                onClick={() =>
                  addConnectionMutation.mutate({
                    clientId: selectedClientId,
                    accessToken,
                    refreshToken: refreshToken || undefined,
                  })
                }
              >
                {addConnectionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Connect Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Client filter */}
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Filter by client:</Label>
        <Select value={String(selectedClientId)} onValueChange={(v) => setSelectedClientId(Number(v))}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connections list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No connections yet. Add one to get started.
              </p>
            ) : (
              connections.map((conn) => (
                <div
                  key={conn.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedConnectionId === conn.id
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    setSelectedConnectionId(conn.id);
                    setSelectedLocationId("");
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{conn.accountName}</p>
                      <p className="text-xs text-muted-foreground truncate">{conn.accountId}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConnectionMutation.mutate({ connectionId: conn.id });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Locations</CardTitle>
              {selectedConnectionId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  disabled={syncLocationsMutation.isPending}
                  onClick={() => syncLocationsMutation.mutate({ connectionId: selectedConnectionId })}
                >
                  {syncLocationsMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Sync
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedConnectionId ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Select a connection to view locations
              </p>
            ) : locations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No locations cached. Click Sync to fetch from GBP.
              </p>
            ) : (
              locations.map((loc) => (
                <div
                  key={loc.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedLocationId === loc.locationId
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedLocationId(loc.locationId)}
                >
                  <p className="font-medium text-sm">{loc.locationName}</p>
                  {loc.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {loc.address}
                    </p>
                  )}
                  {loc.websiteUrl && (
                    <a
                      href={loc.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe className="h-3 w-3" />
                      Website
                    </a>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Post composer + history */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Posts</CardTitle>
              {selectedConnectionId && (
                <Dialog open={postOpen} onOpenChange={setPostOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 h-7 text-xs">
                      <Plus className="h-3 w-3" /> New Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create GBP Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      {/* Location selector */}
                      <div className="space-y-1">
                        <Label>Location</Label>
                        <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((l) => (
                              <SelectItem key={l.id} value={l.locationId}>
                                {l.locationName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Post type */}
                      <div className="space-y-1">
                        <Label>Post Type</Label>
                        <Select value={postType} onValueChange={(v) => setPostType(v as typeof postType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STANDARD">Standard Update</SelectItem>
                            <SelectItem value="EVENT">Event</SelectItem>
                            <SelectItem value="OFFER">Offer</SelectItem>
                            <SelectItem value="PRODUCT">Product</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* AI generate */}
                      <div className="space-y-1">
                        <Label>AI Generate from Topic</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. Summer sale on HVAC services"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={!aiTopic || generatePostMutation.isPending}
                            onClick={() =>
                              generatePostMutation.mutate({
                                topic: aiTopic,
                                postType,
                                businessName: selectedConnection?.accountName,
                              })
                            }
                          >
                            {generatePostMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Wand2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      {/* Summary */}
                      <div className="space-y-1">
                        <Label>Post Content *</Label>
                        <Textarea
                          placeholder="Write your post content (max 1500 characters)..."
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          rows={5}
                          maxLength={1500}
                        />
                        <p className="text-xs text-muted-foreground text-right">{summary.length}/1500</p>
                      </div>
                      {/* CTA */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>Call to Action</Label>
                          <Select value={ctaType} onValueChange={setCtaType}>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {CTA_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>CTA URL</Label>
                          <Input
                            placeholder="https://..."
                            value={ctaUrl}
                            onChange={(e) => setCtaUrl(e.target.value)}
                            disabled={!ctaType}
                          />
                        </div>
                      </div>
                      {/* Image upload */}
                      <div className="space-y-1">
                        <Label>Post Image (optional)</Label>
                        {postImageUrl ? (
                          <div className="relative group w-full">
                            <img src={postImageUrl} alt="Post preview" className="w-full max-h-40 object-cover rounded-md border border-border" />
                            <button type="button" onClick={() => setPostImageUrl(null)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-md px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                            {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                            {imageUploading ? "Uploading..." : "Click to upload image (max 5 MB)"}
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handleImageFileChange} disabled={imageUploading} />
                          </label>
                        )}
                      </div>
                      {/* Event fields */}
                      {postType === "EVENT" && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label>Event Title</Label>
                            <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label>Start Date</Label>
                              <Input type="date" value={eventStart} onChange={(e) => setEventStart(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label>End Date</Label>
                              <Input type="date" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} />
                            </div>
                          </div>
                        </div>
                      )}
                      <Button
                        className="w-full gap-2"
                        disabled={!summary || !selectedLocationId || publishPostMutation.isPending}
                        onClick={() =>
                          publishPostMutation.mutate({
                            connectionId: selectedConnectionId!,
                            locationId: selectedLocationId,
                            locationName: selectedLocation?.locationName,
                            postType,
                            summary,
                            callToActionType: ctaType || undefined,
                            callToActionUrl: ctaUrl || undefined,
                            eventTitle: eventTitle || undefined,
                            eventStartDate: eventStart || undefined,
                            eventEndDate: eventEnd || undefined,
                            imageUrl: postImageUrl || undefined,
                          })
                        }
                      >
                        {publishPostMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Publish Post
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {!selectedConnectionId ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Select a connection to view posts
              </p>
            ) : posts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No posts yet. Create your first GBP post.
              </p>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={post.status === "published" ? "default" : post.status === "failed" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {post.status === "published" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : post.status === "failed" ? (
                        <XCircle className="h-3 w-3 mr-1" />
                      ) : null}
                      {post.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {post.postType}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-3">{post.summary}</p>
                  {post.locationName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {post.locationName}
                    </p>
                  )}
                  {post.publishedAt && post.publishedAt > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Published {new Date(post.publishedAt).toLocaleDateString()}
                    </p>
                  )}
                  {post.errorMessage && (
                    <p className="text-xs text-destructive">{post.errorMessage}</p>
                  )}
                  {post.gbpPostName && (
                    <a
                      href={`https://business.google.com/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> View on GBP
                    </a>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
