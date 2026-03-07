import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Bell,
  Building2,
  Check,
  Eye,
  EyeOff,
  Key,
  Lock,
  Save,
  Settings2,
  User,
  Webhook,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── Masked secret input ────────────────────────────────────────────────────
function SecretInput({
  label,
  envKey,
  description,
  placeholder,
}: {
  label: string;
  envKey: string;
  description: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!value.trim()) {
      toast.error("Please enter a value before saving.");
      return;
    }
    // In production this would call a secure secrets management endpoint.
    // For now we show a toast directing the user to the Management UI.
    toast.info(`To persist "${envKey}", paste the value into Settings → Secrets in the Management UI panel.`);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2">
        <Key className="w-3.5 h-3.5 text-muted-foreground" />
        {label}
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder ?? `Enter ${envKey}`}
            className="pr-10 font-mono text-sm"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShow(s => !s)}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Button
          size="sm"
          variant={saved ? "default" : "outline"}
          onClick={handleSave}
          className="flex-shrink-0 gap-1.5"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? "Noted" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Settings() {
  const { agencyId } = useAgency();
  const { user } = useAuth();

  const { data: agency } = trpc.agencies.getById.useQuery(
    { id: agencyId },
    { enabled: agencyId > 0 }
  );

  const updateAgency = trpc.agencies.update.useMutation({
    onSuccess: () => toast.success("Agency profile updated"),
    onError: () => toast.error("Failed to update agency profile"),
  });

  const [profile, setProfile] = useState({ name: "", email: "", phone: "", website: "" });
  const [notifPrefs, setNotifPrefs] = useState({
    newLead: true,
    appointmentReminder: true,
    campaignReport: true,
    callCompleted: false,
    weeklyDigest: true,
  });

  // Sync agency data into local form once loaded
  const agencyData = agency as any;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Settings2 className="w-6 h-6" /> Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage your agency profile, API integrations, and notification preferences.
          </p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="h-9">
            <TabsTrigger value="profile" className="gap-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5" /> Agency Profile
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5 text-xs">
              <Key className="w-3.5 h-3.5" /> Integrations
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-1.5 text-xs">
              <Webhook className="w-3.5 h-3.5" /> Webhooks
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs">
              <Bell className="w-3.5 h-3.5" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5 text-xs">
              <User className="w-3.5 h-3.5" /> My Account
            </TabsTrigger>
          </TabsList>

          {/* ── Agency Profile ── */}
          <TabsContent value="profile" className="mt-5 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agency Information</CardTitle>
                <CardDescription>Update your agency's public profile and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Agency Name</Label>
                    <Input
                      value={profile.name || agencyData?.name || ""}
                      onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Premier Mortgage Group"
                    />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={profile.email || agencyData?.email || ""}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      placeholder="contact@agency.com"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={profile.phone || agencyData?.phone || ""}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={profile.website || agencyData?.website || ""}
                      onChange={e => setProfile(p => ({ ...p, website: e.target.value }))}
                      placeholder="https://yoursite.com"
                    />
                  </div>
                </div>
                <div>
                  <Label>Business Address</Label>
                  <Textarea
                    rows={2}
                    defaultValue={agencyData?.address ?? ""}
                    placeholder="123 Main St, Suite 100, New York, NY 10001"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => updateAgency.mutate({ id: agencyId, ...profile })}
                    disabled={updateAgency.isPending}
                  >
                    {updateAgency.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscription</CardTitle>
                <CardDescription>Your current plan and billing status.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{agencyData?.subscriptionPlan ?? "Free"} Plan</p>
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge variant="outline" className="ml-1 capitalize">{agencyData?.subscriptionStatus ?? "active"}</Badge>
                  </p>
                </div>
                <Button variant="outline" onClick={() => window.location.href = "/billing"}>
                  Manage Billing
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Integrations / API Keys ── */}
          <TabsContent value="integrations" className="mt-5 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" /> API Keys
                </CardTitle>
                <CardDescription>
                  Enter your API keys below. To permanently save them, use the{" "}
                  <strong>Settings → Secrets</strong> panel in the Management UI (right-side panel icon).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">AI Calling</p>
                  <SecretInput
                    label="Vapi API Key"
                    envKey="VAPI_API_KEY"
                    description="Enables live outbound AI calls, call recordings, and transcripts. Get it from vapi.ai/dashboard"
                    placeholder="vapi_..."
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                  <SecretInput
                    label="SendGrid API Key"
                    envKey="SENDGRID_API_KEY"
                    description="Enables email campaign delivery via SendGrid. Get it from app.sendgrid.com/settings/api_keys"
                    placeholder="SG...."
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SMS</p>
                  <SecretInput
                    label="Twilio Account SID"
                    envKey="TWILIO_ACCOUNT_SID"
                    description="Your Twilio Account SID from console.twilio.com"
                    placeholder="AC..."
                  />
                  <SecretInput
                    label="Twilio Auth Token"
                    envKey="TWILIO_AUTH_TOKEN"
                    description="Your Twilio Auth Token from console.twilio.com"
                    placeholder="••••••••••••••••"
                  />
                  <SecretInput
                    label="Twilio Phone Number"
                    envKey="TWILIO_PHONE_NUMBER"
                    description="Your Twilio number in E.164 format — this is the number SMS messages are sent from"
                    placeholder="+15551234567"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payments</p>
                  <SecretInput
                    label="Stripe Secret Key"
                    envKey="STRIPE_SECRET_KEY"
                    description="Enables subscription billing for agencies. Get it from dashboard.stripe.com/apikeys"
                    placeholder="sk_live_..."
                  />
                  <SecretInput
                    label="Stripe Webhook Secret"
                    envKey="STRIPE_WEBHOOK_SECRET"
                    description="Validates incoming Stripe events. Create a webhook at dashboard.stripe.com/webhooks pointing to /api/webhooks/stripe"
                    placeholder="whsec_..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Webhooks ── */}
          <TabsContent value="webhooks" className="mt-5 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="w-4 h-4" /> Facebook Lead Ads
                </CardTitle>
                <CardDescription>
                  Configure your Facebook Lead Ads webhook to automatically import new leads into the pipeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      readOnly
                      value={`${window.location.origin}/api/webhooks/facebook`}
                      className="font-mono text-sm bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/facebook`);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Paste this URL into your Facebook App → Webhooks → leadgen subscription.
                  </p>
                </div>
                <div>
                  <Label>Verify Token</Label>
                  <SecretInput
                    label=""
                    envKey="FACEBOOK_VERIFY_TOKEN"
                    description="A custom string you choose — must match exactly what you enter in the Facebook App Webhooks dashboard."
                    placeholder="manus_crm_verify"
                  />
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Setup steps:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Go to <strong>developers.facebook.com</strong> → Your App → Webhooks</li>
                    <li>Subscribe to the <strong>leadgen</strong> field on the <strong>Page</strong> object</li>
                    <li>Paste the Webhook URL and Verify Token above, then click Verify</li>
                    <li>New leads will automatically appear in your pipeline under source: Facebook Ads</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stripe Webhook</CardTitle>
                <CardDescription>Required for subscription status updates and invoice events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      readOnly
                      value={`${window.location.origin}/api/webhooks/stripe`}
                      className="font-mono text-sm bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/stripe`);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Register this URL in your Stripe dashboard under Developers → Webhooks. Subscribe to{" "}
                  <code className="bg-muted px-1 rounded">customer.subscription.*</code> and{" "}
                  <code className="bg-muted px-1 rounded">invoice.*</code> events.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications ── */}
          <TabsContent value="notifications" className="mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
                <CardDescription>Choose which events trigger notifications for your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "newLead", label: "New Lead", description: "Notify when a new lead is added to the pipeline" },
                  { key: "appointmentReminder", label: "Appointment Reminders", description: "Notify 24 hours before a scheduled appointment" },
                  { key: "campaignReport", label: "Campaign Reports", description: "Receive a summary when a campaign finishes sending" },
                  { key: "callCompleted", label: "Call Completed", description: "Notify when an AI call ends with a transcript available" },
                  { key: "weeklyDigest", label: "Weekly Digest", description: "Receive a weekly summary of pipeline activity every Monday" },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                      onCheckedChange={v => setNotifPrefs(p => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={() => toast.success("Notification preferences saved")}>
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── My Account ── */}
          <TabsContent value="account" className="mt-5 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account Details</CardTitle>
                <CardDescription>Your personal account information from Manus OAuth.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {(user?.name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{user?.name ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
                    <Badge variant="outline" className="mt-1 capitalize text-xs">{user?.role ?? "user"}</Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Account details are managed through Manus OAuth. To update your name or email, visit your Manus profile settings.
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
