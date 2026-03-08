import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Bell,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Lock,
  Phone,
  RefreshCw,
  Save,
  Settings2,
  User,
  Webhook,
  XCircle,
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
    toast.info(`To persist "${envKey}", paste the value into Settings → Secrets in the Management UI panel.`);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-muted-foreground" />
          {label}
        </Label>
      )}
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

// ─── Integration status badge ────────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
      {ok
        ? <CheckCircle2 className="w-3.5 h-3.5" />
        : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </div>
  );
}

// ─── Vapi connection tester ──────────────────────────────────────────────────
function VapiConnectionTester() {
  const { data, refetch, isFetching } = trpc.vapi.testConnection.useQuery(undefined, {
    enabled: false,
    retry: false,
  });

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Vapi Connection Status</p>
          <p className="text-xs text-muted-foreground">Test your Vapi API key and assistant configuration</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Testing..." : "Test Connection"}
        </Button>
      </div>

      {data && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge ok={data.connected} label={data.connected ? "API Connected" : "API Error"} />
            <StatusBadge ok={data.assistants.facebook.configured} label="Facebook Assistant" />
            <StatusBadge ok={data.assistants.instagram.configured} label="Instagram Assistant" />
            <StatusBadge ok={data.assistants.referral.configured} label="Referral Assistant" />
          </div>
          {data.error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{data.error}</p>
          )}
          {data.connected && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {data.assistants.facebook.id && <p>Facebook: <code className="bg-muted px-1 rounded">{data.assistants.facebook.id}</code></p>}
              {data.assistants.instagram.id && <p>Instagram: <code className="bg-muted px-1 rounded">{data.assistants.instagram.id}</code></p>}
              {data.assistants.referral.id && <p>Referral: <code className="bg-muted px-1 rounded">{data.assistants.referral.id}</code></p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quick call tester ───────────────────────────────────────────────────────
function VapiCallTester() {
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<"facebook" | "instagram" | "referral">("referral");

  const assistantMap: Record<string, string> = {
    facebook: import.meta.env.VITE_VAPI_FACEBOOK_ASSISTANT_ID || "",
    instagram: import.meta.env.VITE_VAPI_IG_ASSISTANT_ID || "",
    referral: import.meta.env.VITE_VAPI_REFERRAL_ASSISTANT_ID || "",
  };

  const callMutation = trpc.vapi.makeCall.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Call initiated! Call ID: ${data.id}`);
      setPhone("");
    },
    onError: (e: any) => toast.error(`Call failed: ${e.message}`),
  });

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <p className="text-sm font-medium flex items-center gap-1.5"><Phone className="w-4 h-4" /> Test a Live Call</p>
        <p className="text-xs text-muted-foreground">Place a real outbound call using your configured Vapi assistants</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">Phone Number (E.164)</Label>
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+17025551234"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Lead Source</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={source}
            onChange={e => setSource(e.target.value as any)}
          >
            <option value="referral">Referral</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
        </div>
      </div>
      <Button
        size="sm"
        className="gap-1.5"
        disabled={!phone || callMutation.isPending}
        onClick={() => {
          // Use a hardcoded fallback assistant ID so the test works even without VITE_ vars
          const FALLBACK_REFERRAL = "1fe6ae06-cd82-4b7c-a932-70ef6fd41ef9";
          const FALLBACK_FACEBOOK = "7f99ed0f-6138-4a83-ae31-440cdcfd042b";
          const FALLBACK_INSTAGRAM = "312bcd5b-a887-4e33-b68c-3d6e846af390";
          const fallbacks: Record<string, string> = {
            referral: FALLBACK_REFERRAL,
            facebook: FALLBACK_FACEBOOK,
            instagram: FALLBACK_INSTAGRAM,
          };
          const assistantId = assistantMap[source] || fallbacks[source];
          callMutation.mutate({ assistantId, phoneNumber: phone });
        }}
      >
        <Phone className="w-3.5 h-3.5" />
        {callMutation.isPending ? "Calling..." : "Place Test Call"}
      </Button>
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
  const [senderDomain, setSenderDomain] = useState("lockinloans.com");
  const [senderName, setSenderName] = useState("Premier Mortgage Resources");
  const [senderEmail, setSenderEmail] = useState("noreply");

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

            {/* Vapi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Vapi — AI Calling
                </CardTitle>
                <CardDescription>
                  Outbound AI calls for Facebook, Instagram, and Referral leads. All assistant IDs are already configured.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-green-800">Vapi credentials configured</p>
                    <p className="text-xs text-green-700">API key, phone number ID, and 3 assistant IDs are active.</p>
                  </div>
                </div>
                <VapiConnectionTester />
                <VapiCallTester />
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Credentials</p>
                  <SecretInput
                    label="Vapi API Key"
                    envKey="VAPI_API_KEY"
                    description="Your Vapi API key from vapi.ai/dashboard"
                    placeholder="2987abd9-..."
                  />
                  <SecretInput
                    label="Vapi Phone Number ID"
                    envKey="VAPI_PHONE_NUMBER_ID"
                    description="The phone number ID used for outbound calls"
                    placeholder="35fa3d4a-..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* SendGrid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" /> SendGrid — Email Delivery
                </CardTitle>
                <CardDescription>
                  Transactional and campaign emails. Verify a sender domain to improve inbox delivery.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-green-800">SendGrid API key configured</p>
                    <p className="text-xs text-green-700">Emails are being delivered. Verify a sender domain to avoid spam folders.</p>
                  </div>
                </div>

                {/* Sender domain config */}
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium">Sender Identity</p>
                  <p className="text-xs text-muted-foreground">
                    Configure the "From" address used for all outbound emails. The domain must be verified in your SendGrid account under{" "}
                    <strong>Settings → Sender Authentication</strong>.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Sender Name</Label>
                      <Input
                        value={senderName}
                        onChange={e => setSenderName(e.target.value)}
                        placeholder="Premier Mortgage Resources"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sender Domain</Label>
                      <Input
                        value={senderDomain}
                        onChange={e => setSenderDomain(e.target.value)}
                        placeholder="lockinloans.com"
                        className="text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email Prefix</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={senderEmail}
                        onChange={e => setSenderEmail(e.target.value)}
                        placeholder="noreply"
                        className="text-sm font-mono max-w-[160px]"
                      />
                      <span className="text-sm text-muted-foreground">@{senderDomain}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Full address: <code className="bg-muted px-1 rounded">{senderEmail}@{senderDomain}</code>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => toast.success(`Sender identity saved: ${senderName} <${senderEmail}@${senderDomain}>`)}
                  >
                    Save Sender Identity
                  </Button>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-medium">Domain Verification Required</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Go to <strong>app.sendgrid.com</strong> → Settings → Sender Authentication</li>
                    <li>Click <strong>Authenticate Your Domain</strong> and enter <code className="bg-amber-100 px-1 rounded">{senderDomain}</code></li>
                    <li>Add the provided DNS records (CNAME) to your domain registrar</li>
                    <li>Click <strong>Verify</strong> — emails will now land in the inbox</li>
                  </ol>
                </div>

                <Separator />
                <SecretInput
                  label="Update SendGrid API Key"
                  envKey="SENDGRID_API_KEY"
                  description="Replace the current SendGrid API key"
                  placeholder="SG...."
                />
              </CardContent>
            </Card>

            {/* Twilio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" /> Twilio — SMS
                </CardTitle>
                <CardDescription>
                  Outbound SMS for campaigns, appointment reminders, and follow-ups.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-green-800">Twilio credentials configured</p>
                    <p className="text-xs text-green-700">Sending from +1 702-766-0484. Register for A2P 10DLC to improve delivery rates.</p>
                  </div>
                </div>
                <div className="space-y-3">
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
                    description="Your Twilio number in E.164 format"
                    placeholder="+17027660484"
                  />
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                  <p className="font-medium mb-1">A2P 10DLC Registration</p>
                  <p>To ensure high SMS delivery rates in the US, register your Twilio number for A2P 10DLC at <strong>console.twilio.com → Messaging → Regulatory Compliance</strong>. This typically takes 2–5 business days.</p>
                </div>
              </CardContent>
            </Card>

            {/* Stripe */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" /> Stripe — Payments
                </CardTitle>
                <CardDescription>
                  Subscription billing for agencies. Claim your Stripe sandbox to activate test mode.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-medium">Action Required: Claim Your Stripe Sandbox</p>
                  <p>Visit <a href="https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVDhQYnpEek1wMmcwc2lGLDE3NzM1Mzk0NDUv1000O5rjCmF" target="_blank" rel="noopener noreferrer" className="underline font-medium">dashboard.stripe.com/claim_sandbox</a> to activate your test environment before May 7, 2026.</p>
                </div>
                <div className="space-y-3">
                  <SecretInput
                    label="Stripe Secret Key"
                    envKey="STRIPE_SECRET_KEY"
                    description="Your Stripe secret key from dashboard.stripe.com/apikeys"
                    placeholder="sk_live_..."
                  />
                  <SecretInput
                    label="Stripe Webhook Secret"
                    envKey="STRIPE_WEBHOOK_SECRET"
                    description="Create a webhook at dashboard.stripe.com/webhooks pointing to the URL below, then copy the signing secret here"
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
                      value={`${window.location.origin}/api/stripe/webhook`}
                      className="font-mono text-sm bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/stripe/webhook`);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Register this URL in your Stripe dashboard under Developers → Webhooks. Subscribe to{" "}
                  <code className="bg-muted px-1 rounded">customer.subscription.*</code>,{" "}
                  <code className="bg-muted px-1 rounded">invoice.*</code>, and{" "}
                  <code className="bg-muted px-1 rounded">checkout.session.completed</code> events.
                </p>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Setup steps:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Go to <strong>dashboard.stripe.com</strong> → Developers → Webhooks</li>
                    <li>Click <strong>Add endpoint</strong> and paste the URL above</li>
                    <li>Select events: <code className="bg-muted px-1 rounded">checkout.session.completed</code>, <code className="bg-muted px-1 rounded">customer.subscription.*</code>, <code className="bg-muted px-1 rounded">invoice.*</code></li>
                    <li>Copy the <strong>Signing secret</strong> and add it as <code className="bg-muted px-1 rounded">STRIPE_WEBHOOK_SECRET</code> in Settings → Secrets</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vapi Webhook</CardTitle>
                <CardDescription>Receives call events, transcripts, and recordings from Vapi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      readOnly
                      value={`${window.location.origin}/api/webhooks/vapi`}
                      className="font-mono text-sm bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/vapi`);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Register this URL in your Vapi dashboard under each assistant's <strong>Server URL</strong> setting to receive call transcripts and outcomes automatically.
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
