import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, User, Mail, Phone, Save, Trash2, Shield, Loader2, Link, ExternalLink, Copy, CheckCircle2, ToggleLeft } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
export default function Account() {
  const { user } = useAuth();
  const { data: profile, isLoading, refetch } = trpc.account.getProfile.useQuery();
  const updateProfile = trpc.account.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const uploadAvatar = trpc.account.uploadAvatar.useMutation({
    onSuccess: () => {
      toast.success("Profile picture updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const removeAvatar = trpc.account.removeAvatar.useMutation({
    onSuccess: () => {
      toast.success("Profile picture removed");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with profile data
  if (profile && !initialized) {
    setName(profile.name || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    setInitialized(true);
  }

  const handleSave = () => {
    const updates: { name?: string; email?: string; phone?: string } = {};
    if (name !== (profile?.name || "")) updates.name = name;
    if (email !== (profile?.email || "")) updates.email = email;
    if (phone !== (profile?.phone || "")) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateProfile.mutate(updates);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
      toast.error("Only JPEG, PNG, GIF, and WebP images are supported");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAvatar.mutate({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      admin: { label: "Admin", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      agency_owner: { label: "Agency Owner", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
      client_user: { label: "Client", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      loa: { label: "Loan Officer Assistant", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
    };
    const r = roleMap[role] || { label: role, color: "bg-gray-100 text-gray-800" };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
        <Shield className="w-3 h-3" />
        {r.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    </DashboardLayout>
  );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile information and preferences</p>
      </div>

      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Picture</CardTitle>
          <CardDescription>Upload a photo to personalize your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 mr-2" />
                )}
                Upload Photo
              </Button>
              {profile?.avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
              <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, or WebP. Max 5MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Role:</span>
            {profile?.role && getRoleBadge(profile.role)}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="w-full sm:w-auto"
            >
              {updateProfile.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Information</CardTitle>
          <CardDescription>Details about your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Account ID</span>
            <span className="text-sm font-mono">{profile?.id}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Member Since</span>
            <span className="text-sm">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }) : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
    {/* Booking Page Settings */}
    <BookingSettings />
    </DashboardLayout>
  );
}

function BookingSettings() {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading, refetch } = trpc.publicFeatures.getMyBookingSettings.useQuery();
  const updateMutation = trpc.publicFeatures.updateBookingPage.useMutation({
    onSuccess: () => {
      toast.success("Booking page settings saved!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Sync form with fetched data
  if (settings && slug === "" && settings.bookingSlug) {
    setSlug(settings.bookingSlug || "");
    setTitle(settings.bookingTitle || "");
    setDescription(settings.bookingDescription || "");
    setActive(settings.bookingActive ?? true);
  }

  const bookingUrl = slug ? `${window.location.origin}/book/${slug}` : null;

  const copyUrl = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Link className="h-4 w-4" />
          Booking Page
        </CardTitle>
        <CardDescription>Create a shareable link where leads can self-schedule consultations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Your Booking URL Slug</Label>
          <div className="flex gap-2">
            <span className="flex items-center px-3 text-sm text-muted-foreground bg-muted rounded-l-md border border-r-0">
              {window.location.origin}/book/
            </span>
            <Input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="your-name"
              className="rounded-l-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only</p>
        </div>
        <div className="space-y-1.5">
          <Label>Page Title (optional)</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Book a Free Consultation"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Page Description (optional)</Label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell leads what to expect in the consultation..."
            className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActive(!active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm">{active ? "Booking page is live" : "Booking page is disabled"}</span>
        </div>
        {bookingUrl && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-primary truncate flex-1">{bookingUrl}</span>
            <button onClick={copyUrl} className="flex-shrink-0">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
            </button>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
        )}
        <Button
          onClick={() => updateMutation.mutate({ bookingSlug: slug, bookingTitle: title, bookingDescription: description, bookingActive: active })}
          disabled={!slug || updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Booking Settings</>}
        </Button>
      </CardContent>
    </Card>
  );
}
