import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  UserPlus,
  Calendar,
  RefreshCw,
  Megaphone,
  Moon,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";

type NotifPrefs = {
  newLead: boolean;
  appointment: boolean;
  statusChange: boolean;
  assignment: boolean;
  marketing: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
};

const DEFAULT_PREFS: NotifPrefs = {
  newLead: true,
  appointment: true,
  statusChange: true,
  assignment: true,
  marketing: false,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "08:00",
};

const NOTIF_TYPES = [
  {
    key: "newLead" as const,
    icon: UserPlus,
    label: "New Leads",
    description: "When a new lead enters the pipeline from any source (form, import, AI call)",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    key: "appointment" as const,
    icon: Calendar,
    label: "Appointments",
    description: "Reminders 24 hours and 1 hour before scheduled appointments",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "statusChange" as const,
    icon: RefreshCw,
    label: "Status Changes",
    description: "When a lead moves to a new pipeline stage or their status is updated",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    key: "assignment" as const,
    icon: UserPlus,
    label: "Lead Assignments",
    description: "When a lead is assigned to you or reassigned to another team member",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    key: "marketing" as const,
    icon: Megaphone,
    label: "Campaign Reports",
    description: "Summary when an email or SMS campaign finishes sending",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
];

export default function NotificationPreferences() {
  const { data: savedPrefs, isLoading } = trpc.notifications.getPrefs.useQuery();
  const updatePrefs = trpc.notifications.updatePrefs.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences saved");
    },
    onError: (e) => {
      toast.error(e.message || "Failed to save preferences");
    },
  });

  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (savedPrefs) {
      setPrefs({ ...DEFAULT_PREFS, ...savedPrefs });
    }
  }, [savedPrefs]);

  const handleToggle = (key: keyof NotifPrefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updatePrefs.mutate(prefs);
    setIsDirty(false);
  };

  const enabledCount = NOTIF_TYPES.filter((t) => prefs[t.key]).length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Preferences
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Control which events send you push notifications and in-app alerts.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {enabledCount}/{NOTIF_TYPES.length} enabled
          </Badge>
        </div>

        {/* Notification Types */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Notification Types</CardTitle>
            <CardDescription className="text-xs">
              Choose which events trigger push notifications on your device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {NOTIF_TYPES.map((item, idx) => {
              const Icon = item.icon;
              const enabled = prefs[item.key];
              return (
                <div key={item.key}>
                  {idx > 0 && <Separator />}
                  <div className="flex items-center gap-4 px-6 py-4">
                    <div className={`w-9 h-9 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.label}</p>
                        {!enabled && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            Muted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => handleToggle(item.key, v)}
                      aria-label={`Toggle ${item.label} notifications`}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  Quiet Hours
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Suppress push notifications during specific hours. In-app notifications still appear.
                </CardDescription>
              </div>
              <Switch
                checked={prefs.quietHoursEnabled}
                onCheckedChange={(v) => handleToggle("quietHoursEnabled", v)}
                aria-label="Toggle quiet hours"
              />
            </div>
          </CardHeader>
          {prefs.quietHoursEnabled && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Start</Label>
                    <Input
                      type="time"
                      value={prefs.quietStart}
                      onChange={(e) => {
                        setPrefs((p) => ({ ...p, quietStart: e.target.value }));
                        setIsDirty(true);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-4 shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">End</Label>
                    <Input
                      type="time"
                      value={prefs.quietEnd}
                      onChange={(e) => {
                        setPrefs((p) => ({ ...p, quietEnd: e.target.value }));
                        setIsDirty(true);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Push notifications will be suppressed from{" "}
                <strong>{prefs.quietStart}</strong> to{" "}
                <strong>{prefs.quietEnd}</strong> every day.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              const allOn: NotifPrefs = { ...prefs, newLead: true, appointment: true, statusChange: true, assignment: true, marketing: true };
              setPrefs(allOn);
              setIsDirty(true);
            }}
          >
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              const allOff: NotifPrefs = { ...prefs, newLead: false, appointment: false, statusChange: false, assignment: false, marketing: false };
              setPrefs(allOff);
              setIsDirty(true);
            }}
          >
            <BellOff className="w-3 h-3 mr-1" />
            Mute All
          </Button>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {isDirty ? "You have unsaved changes." : "All changes saved."}
          </p>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updatePrefs.isPending}
            size="sm"
            className="gap-1.5"
          >
            {updatePrefs.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
