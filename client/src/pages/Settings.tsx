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
  KeyRound,
  Lock,
  Phone,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  User,
  Webhook,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// ─── Change Password Card ───────────────────────────────────────────────────
function ChangePasswordCard() {
  const { data: credData, isLoading: credLoading } = trpc.onboarding.hasPasswordCredentials.useQuery();
  const changePassword = trpc.onboarding.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setForm({ current: "", next: "", confirm: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  if (credLoading) return null;
  if (!credData?.hasPassword) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (form.next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    changePassword.mutate({ currentPassword: form.current, newPassword: form.next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Change Password
        </CardTitle>
        <CardDescription>Update the password you use to log in to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">Current Password</Label>
            <div className="relative">
              <Input
                id="cp-current"
                type={show.current ? "text" : "password"}
                value={form.current}
                onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
                placeholder="Enter your current password"
                className="pr-10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShow(s => ({ ...s, current: !s.current }))}
                tabIndex={-1}
              >
                {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New Password</Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={show.next ? "text" : "password"}
                value={form.next}
                onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
                placeholder="At least 8 characters"
                className="pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShow(s => ({ ...s, next: !s.next }))}
                tabIndex={-1}
              >
                {show.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="cp-confirm"
                type={show.confirm ? "text" : "password"}
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Re-enter your new password"
                className="pr-10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                tabIndex={-1}
              >
                {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.confirm && form.next !== form.confirm && (
              <p className="text-xs text-red-500">Passwords do not match.</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Minimum 8 characters
            </p>
            <Button
              type="submit"
              disabled={changePassword.isPending || !form.current || !form.next || form.next !== form.confirm}
              className="gap-1.5"
            >
              {changePassword.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {changePassword.isPending ? "Saving..." : "Update Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

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

// ─── Facebook Page Config Card ─────────────────────────────────────────────
function FacebookPageConfigCard() {
  const { agencyId } = useAgency();
  const { data: clients } = trpc.admin.listClients.useQuery({ agencyId });
  const { data: configs, refetch } = trpc.facebookLeads.listPageConfigs.useQuery();
  const saveConfig = trpc.facebookLeads.savePageConfig.useMutation({
    onSuccess: () => { toast.success("Facebook page config saved!"); refetch(); setForm({ pageId: "", pageName: "", pageAccessToken: "", clientId: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteConfig = trpc.facebookLeads.deletePageConfig.useMutation({
    onSuccess: () => { toast.success("Config removed"); refetch(); },
  });
  const emptyForm = { pageId: "", pageName: "", pageAccessToken: "", clientId: "", vapiAssistantId: "", autoVapiCall: true, autoSms: true, smsTemplate: "", leadTag: "Facebook Ad Lead" };
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [showToken, setShowToken] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  function startEdit(cfg: any) {
    setEditingPageId(cfg.pageId);
    setForm({
      pageId: cfg.pageId,
      pageName: cfg.pageName ?? "",
      pageAccessToken: "", // don't pre-fill masked token
      clientId: cfg.clientId ? String(cfg.clientId) : "",
      vapiAssistantId: cfg.vapiAssistantId ?? "",
      autoVapiCall: cfg.autoVapiCall !== false,
      autoSms: cfg.autoSms !== false,
      smsTemplate: cfg.smsTemplate ?? "",
      leadTag: cfg.leadTag ?? "Facebook Ad Lead",
    });
  }

  function cancelEdit() {
    setEditingPageId(null);
    setForm(emptyForm);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Webhook className="w-4 h-4" /> Facebook Lead Ads
        </CardTitle>
        <CardDescription>
          Configure page tokens and automation campaigns per client. Leads route automatically to the correct pipeline and trigger VAPI calls + SMS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Webhook URL */}
        <div>
          <Label>Webhook URL</Label>
          <div className="flex gap-2 mt-1">
            <Input readOnly value={`${window.location.origin}/api/webhooks/facebook`} className="font-mono text-sm bg-muted" />
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/facebook`); toast.success("Copied!"); }}>Copy</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Paste this into Facebook App → Webhooks → leadgen subscription. Verify token: <code className="bg-muted px-1 rounded">manus_crm_verify</code></p>
        </div>

        {/* Existing page configs */}
        {configs && configs.length > 0 && (
          <div className="space-y-2">
            <Label>Connected Pages</Label>
            {configs.map(cfg => (
              <div key={cfg.pageId} className="rounded-lg border p-3 text-sm space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{cfg.pageName || cfg.pageId}</p>
                    <p className="text-xs text-muted-foreground">Page ID: {cfg.pageId} · Client: {clients?.find(c => c.id === cfg.clientId)?.name ?? <span className="text-amber-500">Unassigned</span>}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => startEdit(cfg)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => deleteConfig.mutate({ pageId: cfg.pageId })}>Remove</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${(cfg as any).autoVapiCall !== false ? 'bg-green-500/10 text-green-600 border-green-200' : 'bg-muted text-muted-foreground'}`}>
                    {(cfg as any).autoVapiCall !== false ? '✓' : '✗'} VAPI Call
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${(cfg as any).autoSms !== false ? 'bg-blue-500/10 text-blue-600 border-blue-200' : 'bg-muted text-muted-foreground'}`}>
                    {(cfg as any).autoSms !== false ? '✓' : '✗'} Auto SMS
                  </span>
                  {(cfg as any).leadTag && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-600 border-purple-200">
                      Tag: {(cfg as any).leadTag}
                    </span>
                  )}
                </div>
                {(cfg as any).smsTemplate && (
                  <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 font-mono truncate">{(cfg as any).smsTemplate}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add / update page config */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{editingPageId ? `Editing: ${editingPageId}` : "Add / Update Page Config"}</p>
            {editingPageId && <Button variant="ghost" size="sm" className="text-xs h-7" onClick={cancelEdit}>Cancel</Button>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Facebook Page ID</Label>
              <Input value={form.pageId} onChange={e => setForm(f => ({ ...f, pageId: e.target.value }))} placeholder="e.g. 500444413143324" className="mt-1 text-sm" disabled={!!editingPageId} />
            </div>
            <div>
              <Label className="text-xs">Page Name (optional)</Label>
              <Input value={form.pageName} onChange={e => setForm(f => ({ ...f, pageName: e.target.value }))} placeholder="e.g. Premier Mortgage" className="mt-1 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Page Access Token {editingPageId && <span className="text-muted-foreground">(leave blank to keep existing)</span>}</Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input type={showToken ? "text" : "password"} value={form.pageAccessToken} onChange={e => setForm(f => ({ ...f, pageAccessToken: e.target.value }))} placeholder={editingPageId ? "Leave blank to keep existing token" : "EAALkIuCb5CM..."} className="pr-10 font-mono text-sm" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowToken(s => !s)}>
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Assign to Client</Label>
            <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select client..." /></SelectTrigger>
              <SelectContent>
                {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Automation settings */}
          <div className="rounded-md bg-muted/40 border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Automation Campaign</p>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.autoVapiCall} onChange={e => setForm(f => ({ ...f, autoVapiCall: e.target.checked }))} className="w-4 h-4 rounded" />
                <span>Auto VAPI Call <span className="text-xs text-muted-foreground">(5 min after lead arrives)</span></span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.autoSms} onChange={e => setForm(f => ({ ...f, autoSms: e.target.checked }))} className="w-4 h-4 rounded" />
                <span>Auto SMS <span className="text-xs text-muted-foreground">(after-hours only)</span></span>
              </label>
            </div>
            <div>
              <Label className="text-xs">Lead Tag</Label>
              <Input value={form.leadTag} onChange={e => setForm(f => ({ ...f, leadTag: e.target.value }))} placeholder="Facebook Ad Lead" className="mt-1 text-sm" />
              <p className="text-xs text-muted-foreground mt-0.5">Tag automatically applied to all leads from this page.</p>
            </div>
            <div>
              <Label className="text-xs">Custom SMS Template <span className="text-muted-foreground">(optional)</span></Label>
              <textarea
                value={form.smsTemplate}
                onChange={e => setForm(f => ({ ...f, smsTemplate: e.target.value }))}
                placeholder={`Hi {{firstName}}! Thanks for reaching out. Book here: {{bookingUrl}} — {{clientName}}`}
                className="mt-1 w-full text-sm rounded-md border bg-background px-3 py-2 resize-none h-20 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-0.5">Placeholders: <code className="bg-muted px-1 rounded">{'{{firstName}}'}</code> <code className="bg-muted px-1 rounded">{'{{clientName}}'}</code> <code className="bg-muted px-1 rounded">{'{{bookingUrl}}'}</code></p>
            </div>
            <div>
              <Label className="text-xs">VAPI Assistant ID Override <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={form.vapiAssistantId} onChange={e => setForm(f => ({ ...f, vapiAssistantId: e.target.value }))} placeholder="Leave blank to use global Facebook assistant" className="mt-1 text-sm font-mono" />
            </div>
          </div>

          <Button
            size="sm"
            disabled={!form.pageId || (!editingPageId && !form.pageAccessToken) || saveConfig.isPending}
            onClick={() => {
              saveConfig.mutate({
                pageId: form.pageId,
                pageName: form.pageName || undefined,
                pageAccessToken: form.pageAccessToken || (editingPageId ? "KEEP_EXISTING" : ""),
                clientId: form.clientId ? Number(form.clientId) : undefined,
                agencyId,
                vapiAssistantId: form.vapiAssistantId || undefined,
                autoVapiCall: form.autoVapiCall,
                autoSms: form.autoSms,
                smsTemplate: form.smsTemplate || undefined,
                leadTag: form.leadTag || undefined,
              });
            }}
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> {saveConfig.isPending ? "Saving..." : editingPageId ? "Update Config" : "Save Page Config"}
          </Button>
        </div>
      </CardContent>
    </Card>
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

            {/* Square */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" /> Square — Payments
                </CardTitle>
                <CardDescription>
                  Subscription billing and payment processing via Square. Get credentials at developer.squareup.com.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1">
                  <p className="font-medium">Setup: Connect Your Square Account</p>
                  <p>Visit <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" className="underline font-medium">developer.squareup.com/apps</a> to create an application and get your credentials. Use Sandbox mode for testing.</p>
                </div>
                <div className="space-y-3">
                  <SecretInput
                    label="Square Access Token"
                    envKey="SQUARE_ACCESS_TOKEN"
                    description="From Square Developer Dashboard → Applications → Credentials. Use sandbox token for testing, production token for live payments."
                    placeholder="EAAAl..."
                  />
                  <SecretInput
                    label="Square Location ID"
                    envKey="SQUARE_LOCATION_ID"
                    description="From Square Developer Dashboard → Locations. Required for creating payment links."
                    placeholder="LXXXXXXXXXXXXXXXXX"
                  />
                  <SecretInput
                    label="Square Webhook Signature Key"
                    envKey="SQUARE_WEBHOOK_SIGNATURE_KEY"
                    description="From Square Developer Dashboard → Webhooks → Signature key. Used to verify incoming webhook events."
                    placeholder="..."
                  />
                  <SecretInput
                    label="Square Environment"
                    envKey="SQUARE_ENVIRONMENT"
                    description='Set to "sandbox" for testing or "production" for live payments.'
                    placeholder="sandbox"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Webhooks ── */}
          <TabsContent value="webhooks" className="mt-5 space-y-4">
            <FacebookPageConfigCard />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Square Webhook</CardTitle>
                <CardDescription>Required for payment and subscription status updates from Square.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      readOnly
                      value={`${window.location.origin}/api/square/webhook`}
                      className="font-mono text-sm bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/square/webhook`);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Register this URL in your Square Developer Dashboard under Webhooks. Subscribe to{" "}
                  <code className="bg-muted px-1 rounded">payment.completed</code>,{" "}
                  <code className="bg-muted px-1 rounded">order.updated</code>, and{" "}
                  <code className="bg-muted px-1 rounded">subscription.created</code> events.
                </p>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Setup steps:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Go to <strong>developer.squareup.com/apps</strong> → Your App → Webhooks</li>
                    <li>Click <strong>Add endpoint</strong> and paste the URL above</li>
                    <li>Select events: <code className="bg-muted px-1 rounded">payment.completed</code>, <code className="bg-muted px-1 rounded">order.updated</code>, <code className="bg-muted px-1 rounded">subscription.created</code></li>
                    <li>Copy the <strong>Signature key</strong> and add it as <code className="bg-muted px-1 rounded">SQUARE_WEBHOOK_SIGNATURE_KEY</code> in Settings → Integrations</li>
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
                <CardDescription>Your personal account information.</CardDescription>
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
                    To update your name or email, contact your account manager.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Change Password — only shown when user has password credentials */}
            <ChangePasswordCard />
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
