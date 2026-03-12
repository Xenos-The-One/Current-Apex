/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  Globe,
  Server,
  BarChart2,
  Layout,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  LocateFixed,
  ClipboardList,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = "gmb" | "business" | "social" | "website" | "ads" | "preferences" | "review";

const SECTIONS: { id: Section; label: string; icon: any; description: string }[] = [
  { id: "business", label: "Business Information", icon: Building2, description: "Legal name, EIN, address & timezone" },
  { id: "social", label: "Social Media Logins", icon: Facebook, description: "Connect your social accounts for automated posting" },
  { id: "gmb", label: "Google My Business", icon: Globe, description: "Connect your Google Business Profile" },
  { id: "website", label: "Website Access", icon: Globe, description: "Grant access for content publishing & SEO" },
  { id: "ads", label: "Ad Account Access", icon: BarChart2, description: "Connect ad platforms for campaign management" },
  { id: "preferences", label: "Website Preferences", icon: Layout, description: "Tell us about your ideal website" },
  { id: "review", label: "Review & Submit", icon: CheckCircle2, description: "Confirm all sections and mark setup complete" },
];

// ─── Password field ───────────────────────────────────────────────────────────

function PasswordInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Password"}
        className="pr-10"
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Section: Google My Business ─────────────────────────────────────────────
function GoogleMyBusinessSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    gmbConnected: false,
    gmbProfileName: "",
    gmbProfileUrl: "",
    gmbNotes: "",
  });
  useEffect(() => {
    if (defaultValues) {
      setForm({
        gmbConnected: defaultValues.gmb_connected ?? false,
        gmbProfileName: defaultValues.gmb_profile_name || "",
        gmbProfileUrl: defaultValues.gmb_profile_url || "",
        gmbNotes: defaultValues.gmb_notes || "",
      });
    }
  }, [defaultValues]);
  const mutation = trpc.accountSetup.saveGoogleMyBusiness.useMutation({
    onSuccess: () => { toast.success("Google My Business info saved"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Google Business Profile</h3>
            <p className="text-xs text-muted-foreground">Link your Google Business Profile for local SEO and reviews</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <Checkbox
            id="gmbConnected"
            checked={form.gmbConnected}
            onCheckedChange={(v) => set("gmbConnected", !!v)}
          />
          <div>
            <Label htmlFor="gmbConnected" className="text-sm font-medium cursor-pointer">
              Google Business Profile is connected
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">Check this once you have linked your profile below</p>
          </div>
          {form.gmbConnected && (
            <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Business Profile Name" hint="Exact name as it appears on Google">
            <Input
              value={form.gmbProfileName}
              onChange={(e) => set("gmbProfileName", e.target.value)}
              placeholder="e.g. Premier Mortgage LLC"
            />
          </Field>
          <Field label="Google Business Profile URL" hint="Link to your Google Maps listing">
            <div className="relative">
              <Input
                value={form.gmbProfileUrl}
                onChange={(e) => set("gmbProfileUrl", e.target.value)}
                placeholder="https://g.page/your-business"
                className="pr-9"
              />
              {form.gmbProfileUrl && (
                <a
                  href={form.gmbProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  title="Open link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </Field>
        </div>
        <Field label="Notes" hint="Any additional info about your Google Business setup">
          <Textarea
            value={form.gmbNotes}
            onChange={(e) => set("gmbNotes", e.target.value)}
            placeholder="e.g. Need to claim profile, or profile is under a different email..."
            rows={3}
          />
        </Field>
        {!form.gmbConnected && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20 p-3 flex gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {"Don't have a Google Business Profile yet? "}
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Create one at business.google.com
              </a>
              {" — it's free and essential for local visibility."}
            </p>
          </div>
        )}
      </div>
      <SaveButton loading={mutation.isPending} />
    </form>
  );
}


// ─── Address Autocomplete Input ───────────────────────────────────────────────
const FORGE_BASE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;
const MAPS_API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;

function AddressAutocompleteInput({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      fields: ["address_components", "formatted_address"],
    });
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current!.getPlace();
      if (place) onPlaceSelected(place);
    });
  }, [onPlaceSelected]);

  useEffect(() => {
    // Load Maps script if not already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }
    const existing = document.querySelector(`script[src*="maps/api/js"]`);
    if (existing) {
      existing.addEventListener("load", initAutocomplete);
      return;
    }
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${MAPS_API_KEY}&v=weekly&libraries=places`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = initAutocomplete;
    document.head.appendChild(script);
  }, [initAutocomplete]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Start typing an address..."}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        autoComplete="off"
      />
      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ─── Section: Business Information ───────────────────────────────────────────
const BUSINESS_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "llc", label: "LLC (Limited Liability Company)" },
  { value: "corporation", label: "Corporation (C-Corp / S-Corp)" },
  { value: "partnership", label: "Partnership" },
  { value: "nonprofit", label: "Nonprofit Organization" },
  { value: "other", label: "Other" },
];
const BUSINESS_REG_ID_TYPES = [
  { value: "ein", label: "EIN (Employer Identification Number)" },
  { value: "state_reg", label: "State Registration Number" },
  { value: "business_number", label: "Business Number" },
  { value: "corporation_number", label: "Corporation Number" },
  { value: "tax_id", label: "Tax ID" },
  { value: "other", label: "Other" },
];
const BUSINESS_CATEGORIES = [
  "Mortgage / Lending", "Real Estate", "Insurance", "Financial Planning",
  "Legal Services", "Accounting / Tax", "Healthcare", "Construction / Contracting",
  "Retail", "Restaurants / Food", "Technology", "Marketing / Advertising", "Other",
];
const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET) — New York, Miami" },
  { value: "America/Chicago", label: "Central Time (CT) — Chicago, Dallas" },
  { value: "America/Denver", label: "Mountain Time (MT) — Denver, Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) — Los Angeles, Seattle" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Puerto_Rico", label: "Atlantic Time (AST) — Puerto Rico" },
  { value: "America/Toronto", label: "Eastern Time — Toronto (Canada)" },
  { value: "America/Vancouver", label: "Pacific Time — Vancouver (Canada)" },
  { value: "Europe/London", label: "GMT / BST — London" },
  { value: "Europe/Paris", label: "CET — Paris, Berlin" },
  { value: "Asia/Dubai", label: "GST — Dubai" },
  { value: "Asia/Kolkata", label: "IST — India" },
  { value: "Australia/Sydney", label: "AEST — Sydney" },
];

function BusinessInfoSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    bizLegalName: "", bizDbaName: "", bizPhone: "", bizEmail: "",
    bizWebsite: "", bizCategory: "", bizDescription: "",
    ein: "", businessType: "", businessRegIdType: "",
    timezone: "", addressLine1: "", addressLine2: "",
    addressCity: "", addressState: "", addressPostalCode: "", addressCountry: "United States",
  });
  useEffect(() => {
    if (defaultValues) {
      setForm({
        bizLegalName: defaultValues.biz_legal_name || "",
        bizDbaName: defaultValues.biz_dba_name || "",
        bizPhone: defaultValues.biz_phone || "",
        bizEmail: defaultValues.biz_email || "",
        bizWebsite: defaultValues.biz_website || "",
        bizCategory: defaultValues.biz_category || "",
        bizDescription: defaultValues.biz_description || "",
        ein: defaultValues.ein || "",
        businessType: defaultValues.business_type || "",
        businessRegIdType: defaultValues.business_reg_id_type || "",
        timezone: defaultValues.timezone || "",
        addressLine1: defaultValues.address_line1 || "",
        addressLine2: defaultValues.address_line2 || "",
        addressCity: defaultValues.address_city || "",
        addressState: defaultValues.address_state || "",
        addressPostalCode: defaultValues.address_postal_code || "",
        addressCountry: defaultValues.address_country || "United States",
      });
    }
  }, [defaultValues]);
  const mutation = trpc.accountSetup.saveBusinessInfo.useMutation({
    onSuccess: () => { toast.success("Business information saved"); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const formatEin = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 9);
    if (digits.length > 2) return digits.slice(0, 2) + "-" + digits.slice(2);
    return digits;
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
      {/* Business Information */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Business Information</h3>
            <p className="text-xs text-muted-foreground">Legal details, contact info, and a brief description</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Legal Business Name" hint="Exact name registered with the state">
            <Input value={form.bizLegalName} onChange={(e) => set("bizLegalName", e.target.value)} placeholder="Premier Mortgage LLC" />
          </Field>
          <Field label="DBA / Operating Name" hint="Doing Business As — if different from legal name">
            <Input value={form.bizDbaName} onChange={(e) => set("bizDbaName", e.target.value)} placeholder="Premier Mortgage" />
          </Field>
          <Field label="Business Phone">
            <Input type="tel" value={form.bizPhone} onChange={(e) => set("bizPhone", e.target.value)} placeholder="+1 (555) 000-0000" />
          </Field>
          <Field label="Business Email">
            <Input type="email" value={form.bizEmail} onChange={(e) => set("bizEmail", e.target.value)} placeholder="info@yourbusiness.com" />
          </Field>
          <Field label="Website">
            <Input value={form.bizWebsite} onChange={(e) => set("bizWebsite", e.target.value)} placeholder="https://yourbusiness.com" />
          </Field>
          <Field label="Business Category / Industry">
            <Select value={form.bizCategory} onValueChange={(v) => set("bizCategory", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Short Business Description" hint="A 1-2 sentence description of what your business does">
          <Textarea value={form.bizDescription} onChange={(e) => set("bizDescription", e.target.value)} placeholder="We help first-time homebuyers navigate the mortgage process with personalized guidance..." rows={3} />
        </Field>
      </div>

      {/* EIN & Registration */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">EIN &amp; Registration</h3>
            <p className="text-xs text-muted-foreground">Tax identification and business registration details</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="EIN" hint="Employer Identification Number (XX-XXXXXXX)">
            <Input
              value={form.ein}
              onChange={(e) => set("ein", formatEin(e.target.value))}
              placeholder="12-3456789"
              maxLength={10}
            />
          </Field>
          <Field label="Business Type">
            <Select value={form.businessType} onValueChange={(v) => set("businessType", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Registration ID Type">
            <Select value={form.businessRegIdType} onValueChange={(v) => set("businessRegIdType", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {BUSINESS_REG_ID_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20 p-3 flex gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Your EIN is stored securely and used only for business verification and compliance purposes.
            It is never shared with third parties without your consent.
          </p>
        </div>
      </div>

      {/* Timezone */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/40 flex items-center justify-center">
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Timezone</h3>
            <p className="text-xs text-muted-foreground">Used for scheduling calls, emails, and automated follow-ups</p>
          </div>
        </div>
        <Field label="Business Timezone">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger><SelectValue placeholder="Select your timezone" /></SelectTrigger>
                <SelectContent>
                  {US_TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 text-xs h-10 whitespace-nowrap"
              onClick={() => {
                try {
                  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const match = US_TIMEZONES.find(tz => tz.value === detected);
                  if (match) {
                    set("timezone", detected);
                    toast.success(`Timezone set to ${match.label}`);
                  } else {
                    // Try to find a close match by region
                    const region = detected.split("/")[0];
                    const fallback = US_TIMEZONES.find(tz => tz.value.startsWith(region));
                    if (fallback) {
                      set("timezone", fallback.value);
                      toast.success(`Timezone set to ${fallback.label}`);
                    } else {
                      toast.info(`Detected: ${detected}. Please select manually.`);
                    }
                  }
                } catch {
                  toast.error("Could not detect timezone automatically");
                }
              }}
            >
              <LocateFixed className="w-3.5 h-3.5" />
              Auto-detect
            </Button>
          </div>
        </Field>
      </div>

      {/* Address */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Business Address</h3>
            <p className="text-xs text-muted-foreground">Used for local SEO, Google Business Profile, and correspondence</p>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Street Address">
            <AddressAutocompleteInput
              value={form.addressLine1}
              onChange={(v) => set("addressLine1", v)}
              onPlaceSelected={(place) => {
                // Auto-fill city, state, ZIP, country from Google Places result
                let street = "";
                let city = "";
                let state = "";
                let postal = "";
                let country = "United States";
                const comps = place.address_components || [];
                for (const c of comps) {
                  if (c.types.includes("street_number")) street = c.long_name + " ";
                  if (c.types.includes("route")) street += c.long_name;
                  if (c.types.includes("locality")) city = c.long_name;
                  if (c.types.includes("administrative_area_level_1")) state = c.short_name;
                  if (c.types.includes("postal_code")) postal = c.long_name;
                  if (c.types.includes("country")) country = c.long_name;
                }
                setForm(f => ({
                  ...f,
                  addressLine1: street.trim() || place.formatted_address || f.addressLine1,
                  addressCity: city || f.addressCity,
                  addressState: state || f.addressState,
                  addressPostalCode: postal || f.addressPostalCode,
                  addressCountry: country || f.addressCountry,
                }));
              }}
              placeholder="123 Main Street"
            />
          </Field>
          <Field label="Address Line 2" hint="Suite, unit, floor, etc.">
            <Input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Suite 200" />
          </Field>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="col-span-2 md:col-span-1">
              <Field label="City">
                <Input value={form.addressCity} onChange={(e) => set("addressCity", e.target.value)} placeholder="Atlanta" />
              </Field>
            </div>
            <div>
              <Field label="State / Province">
                <Input value={form.addressState} onChange={(e) => set("addressState", e.target.value)} placeholder="GA" />
              </Field>
            </div>
            <div>
              <Field label="ZIP / Postal Code">
                <Input value={form.addressPostalCode} onChange={(e) => set("addressPostalCode", e.target.value)} placeholder="30301" />
              </Field>
            </div>
          </div>
          <Field label="Country">
            <Input value={form.addressCountry} onChange={(e) => set("addressCountry", e.target.value)} placeholder="United States" />
          </Field>
        </div>
      </div>
      <SaveButton loading={mutation.isPending} />
    </form>
  );
}

// ─── Section: Social Media ────────────────────────────────────────────────────

function SocialMediaSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    fbEmail: defaultValues?.fb_email || "",
    fbPassword: defaultValues?.fb_password || "",
    fbPageId: defaultValues?.fb_page_id || "",
    fbPageName: defaultValues?.fb_page_name || "",
    igUsername: defaultValues?.ig_username || "",
    igPassword: defaultValues?.ig_password || "",
    linkedinEmail: defaultValues?.linkedin_email || "",
    linkedinPassword: defaultValues?.linkedin_password || "",
    linkedinPageUrl: defaultValues?.linkedin_page_url || "",
    tiktokUsername: defaultValues?.tiktok_username || "",
    tiktokPassword: defaultValues?.tiktok_password || "",
    youtubeEmail: defaultValues?.youtube_email || "",
    youtubePassword: defaultValues?.youtube_password || "",
    youtubeChannelUrl: defaultValues?.youtube_channel_url || "",
    twitterUsername: defaultValues?.twitter_username || "",
    twitterPassword: defaultValues?.twitter_password || "",
  });

  const mutation = trpc.accountSetup.saveSocialMedia.useMutation({
    onSuccess: () => { toast.success("Social media credentials saved"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const set = (key: string) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-8">
      <SecurityNote />

      {/* Facebook */}
      <PlatformCard icon={<Facebook className="w-5 h-5 text-blue-600" />} title="Facebook" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Facebook Email">
            <Input id="fbEmail" type="email" value={form.fbEmail} onChange={(e) => set("fbEmail")(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Facebook Password">
            <PasswordInput id="fbPassword" value={form.fbPassword} onChange={set("fbPassword")} />
          </Field>
          <Field label="Facebook Page ID" hint="Found in your Page's About section or URL">
            <Input id="fbPageId" value={form.fbPageId} onChange={(e) => set("fbPageId")(e.target.value)} placeholder="e.g. 123456789012345" />
          </Field>
          <Field label="Facebook Page Name">
            <Input id="fbPageName" value={form.fbPageName} onChange={(e) => set("fbPageName")(e.target.value)} placeholder="e.g. Premier Mortgage" />
          </Field>
        </div>
      </PlatformCard>

      {/* Instagram */}
      <PlatformCard icon={<Instagram className="w-5 h-5 text-pink-500" />} title="Instagram" color="pink">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Instagram Username">
            <Input id="igUsername" value={form.igUsername} onChange={(e) => set("igUsername")(e.target.value)} placeholder="@yourbusiness" />
          </Field>
          <Field label="Instagram Password">
            <PasswordInput id="igPassword" value={form.igPassword} onChange={set("igPassword")} />
          </Field>
        </div>
      </PlatformCard>

      {/* LinkedIn */}
      <PlatformCard icon={<Linkedin className="w-5 h-5 text-blue-700" />} title="LinkedIn" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="LinkedIn Email">
            <Input id="linkedinEmail" type="email" value={form.linkedinEmail} onChange={(e) => set("linkedinEmail")(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="LinkedIn Password">
            <PasswordInput id="linkedinPassword" value={form.linkedinPassword} onChange={set("linkedinPassword")} />
          </Field>
          <Field label="LinkedIn Page URL" hint="Your company page URL (optional)">
            <Input id="linkedinPageUrl" value={form.linkedinPageUrl} onChange={(e) => set("linkedinPageUrl")(e.target.value)} placeholder="https://linkedin.com/company/..." />
          </Field>
        </div>
      </PlatformCard>

      {/* TikTok */}
      <PlatformCard icon={<span className="text-sm font-bold text-gray-800">TK</span>} title="TikTok" color="gray">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="TikTok Username">
            <Input id="tiktokUsername" value={form.tiktokUsername} onChange={(e) => set("tiktokUsername")(e.target.value)} placeholder="@yourbusiness" />
          </Field>
          <Field label="TikTok Password">
            <PasswordInput id="tiktokPassword" value={form.tiktokPassword} onChange={set("tiktokPassword")} />
          </Field>
        </div>
      </PlatformCard>

      {/* YouTube */}
      <PlatformCard icon={<Youtube className="w-5 h-5 text-red-600" />} title="YouTube" color="red">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Google/YouTube Email">
            <Input id="youtubeEmail" type="email" value={form.youtubeEmail} onChange={(e) => set("youtubeEmail")(e.target.value)} placeholder="you@gmail.com" />
          </Field>
          <Field label="YouTube Password">
            <PasswordInput id="youtubePassword" value={form.youtubePassword} onChange={set("youtubePassword")} />
          </Field>
          <Field label="YouTube Channel URL">
            <Input id="youtubeChannelUrl" value={form.youtubeChannelUrl} onChange={(e) => set("youtubeChannelUrl")(e.target.value)} placeholder="https://youtube.com/@yourchannel" />
          </Field>
        </div>
      </PlatformCard>

      {/* Twitter / X */}
      <PlatformCard icon={<Twitter className="w-5 h-5 text-sky-500" />} title="Twitter / X" color="sky">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Twitter Username">
            <Input id="twitterUsername" value={form.twitterUsername} onChange={(e) => set("twitterUsername")(e.target.value)} placeholder="@yourbusiness" />
          </Field>
          <Field label="Twitter Password">
            <PasswordInput id="twitterPassword" value={form.twitterPassword} onChange={set("twitterPassword")} />
          </Field>
        </div>
      </PlatformCard>

      <SaveButton loading={mutation.isPending} />
    </form>
  );
}

// ─── Section: Website Access ──────────────────────────────────────────────────

const WEBSITE_PLATFORMS = ["WordPress", "Wix", "Squarespace", "Shopify", "Webflow", "Custom/HTML", "Other"];
const HOSTING_PROVIDERS = ["GoDaddy", "Bluehost", "SiteGround", "HostGator", "WP Engine", "Cloudflare", "AWS", "Other"];
const DOMAIN_REGISTRARS = ["GoDaddy", "Namecheap", "Google Domains", "Cloudflare", "Name.com", "Other"];

function WebsiteAccessSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    websiteUrl: defaultValues?.website_url || "",
    websitePlatform: defaultValues?.website_platform || "",
    websiteAdminUrl: defaultValues?.website_admin_url || "",
    websiteAdminEmail: defaultValues?.website_admin_email || "",
    websiteAdminPassword: defaultValues?.website_admin_password || "",
    ftpHost: defaultValues?.ftp_host || "",
    ftpUsername: defaultValues?.ftp_username || "",
    ftpPassword: defaultValues?.ftp_password || "",
    hostingProvider: defaultValues?.hosting_provider || "",
    hostingEmail: defaultValues?.hosting_email || "",
    hostingPassword: defaultValues?.hosting_password || "",
    domainRegistrar: defaultValues?.domain_registrar || "",
    domainEmail: defaultValues?.domain_email || "",
    domainPassword: defaultValues?.domain_password || "",
  });

  const mutation = trpc.accountSetup.saveWebsiteAccess.useMutation({
    onSuccess: () => { toast.success("Website access credentials saved"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const set = (key: string) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-8">
      <SecurityNote />

      {/* Website CMS */}
      <PlatformCard icon={<Globe className="w-5 h-5 text-emerald-600" />} title="Website / CMS Access" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Website URL">
            <Input id="websiteUrl" value={form.websiteUrl} onChange={(e) => set("websiteUrl")(e.target.value)} placeholder="https://yourwebsite.com" />
          </Field>
          <Field label="CMS Platform">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.websitePlatform}
              onChange={(e) => set("websitePlatform")(e.target.value)}
            >
              <option value="">Select platform...</option>
              {WEBSITE_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Admin Login URL" hint="e.g. yoursite.com/wp-admin">
            <Input id="websiteAdminUrl" value={form.websiteAdminUrl} onChange={(e) => set("websiteAdminUrl")(e.target.value)} placeholder="https://yourwebsite.com/wp-admin" />
          </Field>
          <Field label="Admin Email / Username">
            <Input id="websiteAdminEmail" value={form.websiteAdminEmail} onChange={(e) => set("websiteAdminEmail")(e.target.value)} placeholder="admin@yourwebsite.com" />
          </Field>
          <Field label="Admin Password">
            <PasswordInput id="websiteAdminPassword" value={form.websiteAdminPassword} onChange={set("websiteAdminPassword")} />
          </Field>
        </div>
      </PlatformCard>

      {/* FTP / Hosting */}
      <PlatformCard icon={<Server className="w-5 h-5 text-violet-600" />} title="FTP / Hosting Access" color="violet">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="FTP Host" hint="e.g. ftp.yourwebsite.com">
            <Input id="ftpHost" value={form.ftpHost} onChange={(e) => set("ftpHost")(e.target.value)} placeholder="ftp.yourwebsite.com" />
          </Field>
          <Field label="FTP Username">
            <Input id="ftpUsername" value={form.ftpUsername} onChange={(e) => set("ftpUsername")(e.target.value)} placeholder="ftpuser" />
          </Field>
          <Field label="FTP Password">
            <PasswordInput id="ftpPassword" value={form.ftpPassword} onChange={set("ftpPassword")} />
          </Field>
          <Field label="Hosting Provider">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.hostingProvider}
              onChange={(e) => set("hostingProvider")(e.target.value)}
            >
              <option value="">Select provider...</option>
              {HOSTING_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Hosting Account Email">
            <Input id="hostingEmail" type="email" value={form.hostingEmail} onChange={(e) => set("hostingEmail")(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Hosting Account Password">
            <PasswordInput id="hostingPassword" value={form.hostingPassword} onChange={set("hostingPassword")} />
          </Field>
        </div>
      </PlatformCard>

      {/* Domain Registrar */}
      <PlatformCard icon={<Globe className="w-5 h-5 text-amber-600" />} title="Domain Registrar" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Domain Registrar">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.domainRegistrar}
              onChange={(e) => set("domainRegistrar")(e.target.value)}
            >
              <option value="">Select registrar...</option>
              {DOMAIN_REGISTRARS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Registrar Account Email">
            <Input id="domainEmail" type="email" value={form.domainEmail} onChange={(e) => set("domainEmail")(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Registrar Account Password">
            <PasswordInput id="domainPassword" value={form.domainPassword} onChange={set("domainPassword")} />
          </Field>
        </div>
      </PlatformCard>

      <SaveButton loading={mutation.isPending} />
    </form>
  );
}

// ─── Section: Ad Accounts ─────────────────────────────────────────────────────

function AdAccountsSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    metaAdAccountId: defaultValues?.meta_ad_account_id || "",
    metaAdEmail: defaultValues?.meta_ad_email || "",
    metaAdPassword: defaultValues?.meta_ad_password || "",
    metaBusinessManagerId: defaultValues?.meta_bm_id || "",
    googleAdsCustomerId: defaultValues?.google_ads_customer_id || "",
    googleAdsEmail: defaultValues?.google_ads_email || "",
    googleAdsPassword: defaultValues?.google_ads_password || "",
    googleAnalyticsId: defaultValues?.google_analytics_id || "",
    googleSearchConsoleAccess: defaultValues?.google_search_console_access || false,
    tiktokAdsAccountId: defaultValues?.tiktok_ads_account_id || "",
    tiktokAdsEmail: defaultValues?.tiktok_ads_email || "",
    tiktokAdsPassword: defaultValues?.tiktok_ads_password || "",
  });

  const mutation = trpc.accountSetup.saveAdAccounts.useMutation({
    onSuccess: () => { toast.success("Ad account credentials saved"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const set = (key: string) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const setBool = (key: string) => (v: boolean) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-8">
      <SecurityNote />

      {/* Meta / Facebook Ads */}
      <PlatformCard icon={<Facebook className="w-5 h-5 text-blue-600" />} title="Meta Ads (Facebook & Instagram)" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Ad Account ID" hint="Found in Ads Manager → Account Overview">
            <Input id="metaAdAccountId" value={form.metaAdAccountId} onChange={(e) => set("metaAdAccountId")(e.target.value)} placeholder="act_123456789" />
          </Field>
          <Field label="Business Manager ID" hint="Found in Business Settings → Business Info">
            <Input id="metaBusinessManagerId" value={form.metaBusinessManagerId} onChange={(e) => set("metaBusinessManagerId")(e.target.value)} placeholder="123456789012345" />
          </Field>
          <Field label="Facebook Login Email">
            <Input id="metaAdEmail" type="email" value={form.metaAdEmail} onChange={(e) => set("metaAdEmail")(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Facebook Password">
            <PasswordInput id="metaAdPassword" value={form.metaAdPassword} onChange={set("metaAdPassword")} />
          </Field>
        </div>
      </PlatformCard>

      {/* Google Ads */}
      <PlatformCard icon={<BarChart2 className="w-5 h-5 text-green-600" />} title="Google Ads" color="green">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Google Ads Customer ID" hint="Found in Google Ads → top right corner (xxx-xxx-xxxx)">
            <Input id="googleAdsCustomerId" value={form.googleAdsCustomerId} onChange={(e) => set("googleAdsCustomerId")(e.target.value)} placeholder="123-456-7890" />
          </Field>
          <Field label="Google Account Email">
            <Input id="googleAdsEmail" type="email" value={form.googleAdsEmail} onChange={(e) => set("googleAdsEmail")(e.target.value)} placeholder="you@gmail.com" />
          </Field>
          <Field label="Google Account Password">
            <PasswordInput id="googleAdsPassword" value={form.googleAdsPassword} onChange={set("googleAdsPassword")} />
          </Field>
          <Field label="Google Analytics Property ID" hint="e.g. G-XXXXXXXXXX or UA-XXXXXXXX">
            <Input id="googleAnalyticsId" value={form.googleAnalyticsId} onChange={(e) => set("googleAnalyticsId")(e.target.value)} placeholder="G-XXXXXXXXXX" />
          </Field>
          <div className="flex items-center gap-3 pt-1">
            <Checkbox
              id="gscAccess"
              checked={form.googleSearchConsoleAccess}
              onCheckedChange={(v) => setBool("googleSearchConsoleAccess")(v === true)}
            />
            <Label htmlFor="gscAccess" className="cursor-pointer">
              I have Google Search Console set up for my website
            </Label>
          </div>
        </div>
      </PlatformCard>

      {/* TikTok Ads */}
      <PlatformCard icon={<span className="text-sm font-bold text-gray-800">TK</span>} title="TikTok Ads" color="gray">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="TikTok Ads Account ID">
            <Input id="tiktokAdsAccountId" value={form.tiktokAdsAccountId} onChange={(e) => set("tiktokAdsAccountId")(e.target.value)} placeholder="7123456789012345678" />
          </Field>
          <Field label="TikTok Ads Login Email">
            <Input id="tiktokAdsEmail" type="email" value={form.tiktokAdsEmail} onChange={(e) => set("tiktokAdsEmail")(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="TikTok Ads Password">
            <PasswordInput id="tiktokAdsPassword" value={form.tiktokAdsPassword} onChange={set("tiktokAdsPassword")} />
          </Field>
        </div>
      </PlatformCard>

      <SaveButton loading={mutation.isPending} />
    </form>
  );
}

// ─── Section: Website Preferences ────────────────────────────────────────────

const WEBSITE_GOALS = [
  { value: "lead_gen", label: "Generate Leads" },
  { value: "brand_authority", label: "Build Brand Authority" },
  { value: "showcase_listings", label: "Showcase Listings / Portfolio" },
  { value: "book_appointments", label: "Book Appointments" },
  { value: "educate_clients", label: "Educate Clients / Blog" },
  { value: "ecommerce", label: "Sell Products / Services" },
];

const WEBSITE_STYLES = [
  { value: "modern_minimal", label: "Modern & Minimal" },
  { value: "bold_professional", label: "Bold & Professional" },
  { value: "warm_friendly", label: "Warm & Friendly" },
  { value: "luxury_premium", label: "Luxury / Premium" },
  { value: "corporate_formal", label: "Corporate & Formal" },
  { value: "creative_unique", label: "Creative & Unique" },
];

const WEBSITE_PAGES_OPTIONS = [
  "Home", "About", "Services", "Blog", "Contact", "Testimonials",
  "FAQ", "Team", "Portfolio / Listings", "Calculators", "Resources", "Privacy Policy",
];

const WEBSITE_FEATURES_OPTIONS = [
  "Contact Form", "Live Chat", "Appointment Booking", "Mortgage Calculator",
  "Property Search", "Email Newsletter", "Social Media Feed", "Video Background",
  "Client Portal", "Document Upload", "Reviews / Testimonials Carousel",
  "Google Maps Integration", "SMS Opt-in", "Lead Capture Popup",
];

function WebsitePreferencesSection({ defaultValues, onSaved }: { defaultValues?: any; onSaved: () => void }) {
  const parseList = (v: string | null | undefined): string[] => {
    if (!v) return [];
    try { return JSON.parse(v); } catch { return v.split(",").map((s: string) => s.trim()).filter(Boolean); }
  };

  const [wantsNew, setWantsNew] = useState<boolean>(defaultValues?.wants_new_website || false);
  const [goal, setGoal] = useState(defaultValues?.website_goal || "");
  const [style, setStyle] = useState(defaultValues?.website_style || "");
  const [pages, setPages] = useState<string[]>(parseList(defaultValues?.website_pages));
  const [features, setFeatures] = useState<string[]>(parseList(defaultValues?.website_features));
  const [colorPrimary, setColorPrimary] = useState(defaultValues?.website_color_primary || "#1e40af");
  const [colorSecondary, setColorSecondary] = useState(defaultValues?.website_color_secondary || "#f59e0b");
  const [examples, setExamples] = useState(defaultValues?.website_examples || "");
  const [notes, setNotes] = useState(defaultValues?.website_additional_notes || "");

  const mutation = trpc.accountSetup.saveWebsitePreferences.useMutation({
    onSuccess: () => { toast.success("Website preferences saved"); onSaved(); },
    onError: (err) => toast.error(err.message),
  });

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      wantsNewWebsite: wantsNew,
      websiteGoal: goal,
      websiteStyle: style,
      websitePages: JSON.stringify(pages),
      websiteFeatures: JSON.stringify(features),
      websiteColorPrimary: colorPrimary,
      websiteColorSecondary: colorSecondary,
      websiteExamples: examples,
      websiteAdditionalNotes: notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Do you need a new website? */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-base text-foreground">Do you need a new website?</h3>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setWantsNew(true)}
            className={`flex-1 rounded-lg border-2 py-4 text-sm font-medium transition-all ${wantsNew ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            Yes, build me a new website
          </button>
          <button
            type="button"
            onClick={() => setWantsNew(false)}
            className={`flex-1 rounded-lg border-2 py-4 text-sm font-medium transition-all ${!wantsNew ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            No, I already have a website
          </button>
        </div>
      </div>

      {wantsNew && (
        <>
          {/* Primary Goal */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-base text-foreground">What is the primary goal of your website?</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {WEBSITE_GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium text-left transition-all ${goal === g.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Design Style */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-base text-foreground">What design style do you prefer?</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {WEBSITE_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium text-left transition-all ${style === s.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pages */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-base text-foreground">Which pages do you need?</h3>
            <p className="text-sm text-muted-foreground">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {WEBSITE_PAGES_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleItem(pages, setPages, p)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${pages.includes(p) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-base text-foreground">What features do you need?</h3>
            <p className="text-sm text-muted-foreground">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {WEBSITE_FEATURES_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleItem(features, setFeatures, f)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${features.includes(f) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-base text-foreground">Brand Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="colorPrimary">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="colorPrimary"
                    value={colorPrimary}
                    onChange={(e) => setColorPrimary(e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input value={colorPrimary} onChange={(e) => setColorPrimary(e.target.value)} placeholder="#1e40af" className="font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="colorSecondary">Secondary / Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="colorSecondary"
                    value={colorSecondary}
                    onChange={(e) => setColorSecondary(e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input value={colorSecondary} onChange={(e) => setColorSecondary(e.target.value)} placeholder="#f59e0b" className="font-mono" />
                </div>
              </div>
            </div>
          </div>

          {/* Example websites */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-base text-foreground">Example Websites You Like</h3>
            <p className="text-sm text-muted-foreground">Paste URLs of websites whose design or style you admire (one per line)</p>
            <Textarea
              value={examples}
              onChange={(e) => setExamples(e.target.value)}
              placeholder={"https://example1.com\nhttps://example2.com"}
              rows={4}
            />
          </div>
        </>
      )}

      {/* Additional Notes */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-base text-foreground">Additional Notes</h3>
        <p className="text-sm text-muted-foreground">Anything else we should know about your website needs or preferences?</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. We want a dark theme, our logo is a blue house icon, we serve the Miami area..."
          rows={5}
        />
      </div>

      <SaveButton loading={mutation.isPending} />
    </form>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SecurityNote() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
      <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Your credentials are encrypted and stored securely</p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          We only use these credentials to post content, run ads, and optimize your website on your behalf. We never share them with third parties.
        </p>
      </div>
    </div>
  );
}

function PlatformCard({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
        <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">Optional</Badge>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function SaveButton({ loading }: { loading: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button type="submit" disabled={loading} className="gap-2 min-w-[140px]">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {loading ? "Saving..." : "Save Section"}
      </Button>
    </div>
  );
}


// ─── Section: Review & Submit ─────────────────────────────────────────────────
function ReviewSection({ setupData, completedSections, onMarkComplete, isMarkingComplete }: {
  setupData: any;
  completedSections: Set<Section>;
  onMarkComplete: () => void;
  isMarkingComplete: boolean;
}) {
  const sections = [
    {
      id: "business" as Section,
      label: "Business Information",
      icon: Building2,
      color: "violet",
      fields: [
        { label: "Legal Name", value: setupData?.biz_legal_name },
        { label: "DBA Name", value: setupData?.biz_dba_name },
        { label: "Phone", value: setupData?.biz_phone },
        { label: "Email", value: setupData?.biz_email },
        { label: "Website", value: setupData?.biz_website },
        { label: "Category", value: setupData?.biz_category },
        { label: "EIN", value: setupData?.ein ? "••-•••••••" : undefined },
        { label: "Business Type", value: BUSINESS_TYPES.find(t => t.value === setupData?.business_type)?.label },
        { label: "Timezone", value: US_TIMEZONES.find(t => t.value === setupData?.timezone)?.label },
        { label: "Address", value: [setupData?.address_line1, setupData?.address_city, setupData?.address_state, setupData?.address_postal_code].filter(Boolean).join(", ") },
      ],
    },
    {
      id: "social" as Section,
      label: "Social Media",
      icon: Globe,
      color: "blue",
      fields: [
        { label: "Facebook Email", value: setupData?.fb_email },
        { label: "Facebook Page", value: setupData?.fb_page_name },
        { label: "Instagram", value: setupData?.ig_username },
        { label: "LinkedIn", value: setupData?.linkedin_email },
        { label: "TikTok", value: setupData?.tiktok_username },
        { label: "YouTube", value: setupData?.youtube_channel_url },
        { label: "Twitter / X", value: setupData?.twitter_username },
      ],
    },
    {
      id: "gmb" as Section,
      label: "Google My Business",
      icon: MapPin,
      color: "green",
      fields: [
        { label: "Connected", value: setupData?.gmb_connected ? "Yes" : "No" },
        { label: "Profile Name", value: setupData?.gmb_profile_name },
        { label: "Profile URL", value: setupData?.gmb_profile_url },
      ],
    },
    {
      id: "website" as Section,
      label: "Website Access",
      icon: Server,
      color: "emerald",
      fields: [
        { label: "Website URL", value: setupData?.website_url },
        { label: "CMS Platform", value: setupData?.website_platform },
        { label: "Admin Email", value: setupData?.website_admin_email },
        { label: "Hosting Provider", value: setupData?.hosting_provider },
        { label: "Domain Registrar", value: setupData?.domain_registrar },
      ],
    },
    {
      id: "ads" as Section,
      label: "Ad Accounts",
      icon: BarChart2,
      color: "orange",
      fields: [
        { label: "Meta Ad Account ID", value: setupData?.meta_ad_account_id },
        { label: "Google Ads Customer ID", value: setupData?.google_ads_customer_id },
        { label: "TikTok Ads Account ID", value: setupData?.tiktok_ads_account_id },
      ],
    },
    {
      id: "preferences" as Section,
      label: "Website Preferences",
      icon: Layout,
      color: "purple",
      fields: [
        { label: "Needs New Website", value: setupData?.wants_new_website ? "Yes" : "No" },
        { label: "Website Goal", value: setupData?.website_goal },
        { label: "Design Style", value: setupData?.website_style },
      ],
    },
  ];

  const completedCount = SECTIONS.filter(s => s.id !== "review" && completedSections.has(s.id)).length;
  const totalCount = SECTIONS.filter(s => s.id !== "review").length;
  const allDone = completedCount === totalCount;

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Setup Progress</h3>
            <p className="text-xs text-muted-foreground">{completedCount} of {totalCount} sections completed</p>
          </div>
          <div className="ml-auto">
            <Badge variant={allDone ? "default" : "secondary"} className={allDone ? "bg-emerald-600 text-white" : ""}>
              {allDone ? "Ready to Submit" : `${totalCount - completedCount} remaining`}
            </Badge>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Section summaries */}
      {sections.map((section) => {
        const isDone = completedSections.has(section.id);
        const Icon = section.icon;
        const filledFields = section.fields.filter(f => f.value && f.value !== "No");
        return (
          <div key={section.id} className={`rounded-xl border bg-card p-5 ${isDone ? "border-emerald-300 dark:border-emerald-700" : "border-border"}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDone ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-muted"}`}>
                {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Icon className="w-4 h-4 text-muted-foreground" />}
              </div>
              <h4 className="text-sm font-semibold text-foreground">{section.label}</h4>
              <Badge variant={isDone ? "outline" : "secondary"} className={`ml-auto text-xs ${isDone ? "border-emerald-400 text-emerald-700 dark:text-emerald-400" : ""}`}>
                {isDone ? "Complete" : "Incomplete"}
              </Badge>
            </div>
            {filledFields.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                {filledFields.map(f => (
                  <div key={f.label} className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{f.label}:</span>
                    <span className="text-xs text-foreground font-medium truncate">{f.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No information saved yet for this section.</p>
            )}
          </div>
        );
      })}

      {/* Submit button */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center gap-4 text-center">
        {allDone ? (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">All sections complete!</p>
              <p className="text-xs text-muted-foreground mt-1">Click below to mark your account setup as complete and notify your account manager.</p>
            </div>
            <Button
              onClick={onMarkComplete}
              disabled={isMarkingComplete}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 min-w-[200px]"
            >
              {isMarkingComplete ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isMarkingComplete ? "Submitting..." : "Mark Setup Complete"}
            </Button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{totalCount - completedCount} section{totalCount - completedCount > 1 ? "s" : ""} still incomplete</p>
              <p className="text-xs text-muted-foreground mt-1">Please go back and complete all sections before marking setup as done.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccountSetup() {
  const [activeSection, setActiveSection] = useState<Section>("business");
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());

  const { data: setupData, isLoading } = trpc.accountSetup.getSetup.useQuery();
  const markCompleteMutation = trpc.accountSetup.markComplete.useMutation({
    onSuccess: () => toast.success("Account setup marked as complete! 🎉"),
    onError: (err) => toast.error(err.message),
  });

  // Determine which sections have data
  useEffect(() => {
    if (!setupData) return;
    const completed = new Set<Section>();
    if (setupData.gmb_profile_name || setupData.gmb_connected) completed.add("gmb");
    if (setupData.biz_legal_name || setupData.ein || setupData.address_line1) completed.add("business");
    if (setupData.fb_email || setupData.ig_username || setupData.linkedin_email || setupData.twitter_username) completed.add("social");
    if (setupData.website_url || setupData.website_admin_email) completed.add("website");
    if (setupData.meta_ad_account_id || setupData.google_ads_email) completed.add("ads");
    if (setupData.website_goal || setupData.website_additional_notes) completed.add("preferences");
    setCompletedSections(completed);
  }, [setupData]);

  const markSectionComplete = (section: Section) => {
    setCompletedSections((prev) => new Set([...prev, section]));
  };

  const currentIndex = SECTIONS.findIndex((s) => s.id === activeSection);
  const isLastSection = currentIndex === SECTIONS.length - 1;
  const allComplete = SECTIONS.every((s) => completedSections.has(s.id));

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Setup</h1>
          <p className="text-muted-foreground mt-1">
            Provide your credentials so we can fully automate your social media, website, and ad campaigns.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {SECTIONS.map((section, idx) => {
            const isActive = activeSection === section.id;
            const isDone = completedSections.has(section.id);
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : isDone
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-emerald-500 text-white" : "bg-muted"}`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-muted-foreground">Step {idx + 1}</span>
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight">{section.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight hidden md:block">{section.description}</p>
              </button>
            );
          })}
        </div>

        {/* Section content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div>
            {activeSection === "gmb" && (
              <GoogleMyBusinessSection
                defaultValues={setupData}
                onSaved={() => markSectionComplete("gmb")}
              />
            )}
            {activeSection === "business" && (
              <BusinessInfoSection
                defaultValues={setupData}
                onSaved={() => markSectionComplete("business")}
              />
            )}
            {activeSection === "social" && (
              <SocialMediaSection
                defaultValues={setupData}
                onSaved={() => markSectionComplete("social")}
              />
            )}
            {activeSection === "website" && (
              <WebsiteAccessSection
                defaultValues={setupData}
                onSaved={() => markSectionComplete("website")}
              />
            )}
            {activeSection === "ads" && (
              <AdAccountsSection
                defaultValues={setupData}
                onSaved={() => markSectionComplete("ads")}
              />
            )}
            {activeSection === "preferences" && (
              <WebsitePreferencesSection
                defaultValues={setupData}
                onSaved={() => markSectionComplete("preferences")}
              />
            )}
            {activeSection === "review" && (
              <ReviewSection
                setupData={setupData}
                completedSections={completedSections}
                onMarkComplete={() => markCompleteMutation.mutate()}
                isMarkingComplete={markCompleteMutation.isPending}
              />
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setActiveSection(SECTIONS[currentIndex - 1]?.id || "social")}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>

          <div className="flex items-center gap-2">
            {allComplete && activeSection !== "review" && (
              <Button
                variant="outline"
                onClick={() => {
                  const reviewIdx = SECTIONS.findIndex(s => s.id === "review");
                  if (reviewIdx !== -1) setActiveSection("review");
                }}
                className="gap-2 text-emerald-700 border-emerald-400 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                <ClipboardList className="w-4 h-4" />
                Review & Submit
              </Button>
            )}
            {!isLastSection && (
              <Button
                onClick={() => setActiveSection(SECTIONS[currentIndex + 1].id)}
                className="gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Completion banner */}
        {setupData?.setup_completed_at && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Setup Complete</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Your account was fully configured on {new Date(setupData.setup_completed_at).toLocaleDateString()}.
                You can update any section at any time.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
