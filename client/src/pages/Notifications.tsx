import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import {
  Bell, BellOff, BellRing, Check, CheckCheck, Send, Smartphone,
  AlertTriangle, Flame, Calendar, BarChart3, FileText, Zap, UserPlus,
  MessageSquare, Settings, Trash2, RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  daily_standup:    { icon: Calendar,      color: "bg-blue-500/10 text-blue-500",   label: "Daily Standup" },
  weekly_strategy:  { icon: FileText,      color: "bg-purple-500/10 text-purple-500", label: "Weekly Strategy" },
  weekly_report:    { icon: BarChart3,     color: "bg-green-500/10 text-green-500", label: "Weekly Report" },
  hot_lead:         { icon: Flame,         color: "bg-red-500/10 text-red-500",     label: "Hot Lead" },
  new_lead:         { icon: UserPlus,      color: "bg-emerald-500/10 text-emerald-500", label: "New Lead" },
  appointment:      { icon: Calendar,      color: "bg-indigo-500/10 text-indigo-500", label: "Appointment" },
  follow_up:        { icon: MessageSquare, color: "bg-cyan-500/10 text-cyan-500",   label: "Follow-Up" },
  birthday_alert:   { icon: Calendar,      color: "bg-pink-500/10 text-pink-500",   label: "Birthday" },
  no_show_alert:    { icon: AlertTriangle, color: "bg-orange-500/10 text-orange-500", label: "No-Show" },
  webinar_milestone:{ icon: Zap,           color: "bg-yellow-500/10 text-yellow-500", label: "Webinar" },
  ad_spend_alert:   { icon: BarChart3,     color: "bg-amber-500/10 text-amber-500", label: "Ad Spend" },
  system:           { icon: Bell,          color: "bg-gray-500/10 text-gray-500",   label: "System" },
  custom:           { icon: Bell,          color: "bg-indigo-500/10 text-indigo-500", label: "Custom" },
};

const priorityColors: Record<string, string> = {
  low:    "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-500",
  high:   "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
};

// Notification preference categories
const PREF_CATEGORIES = [
  {
    id: "new_lead",
    label: "New Lead Alerts",
    description: "When a new lead comes in from any source (Facebook, website, manual)",
    icon: UserPlus,
    defaultOn: true,
  },
  {
    id: "hot_lead",
    label: "Hot Lead Alerts",
    description: "When AI scores a lead as high-priority based on engagement",
    icon: Flame,
    defaultOn: true,
  },
  {
    id: "appointment",
    label: "Appointment Notifications",
    description: "Booking confirmations, reminders, and no-shows",
    icon: Calendar,
    defaultOn: true,
  },
  {
    id: "follow_up",
    label: "Follow-Up Reminders",
    description: "When a lead needs follow-up based on AI analysis",
    icon: MessageSquare,
    defaultOn: true,
  },
  {
    id: "daily_standup",
    label: "Daily Standup Reports",
    description: "Morning performance summary from the AI Ops Director",
    icon: FileText,
    defaultOn: true,
  },
  {
    id: "weekly_report",
    label: "Weekly Reports",
    description: "Weekly pipeline and conversion analytics",
    icon: BarChart3,
    defaultOn: true,
  },
  {
    id: "ad_spend_alert",
    label: "Ad Spend Alerts",
    description: "When Facebook ad spend exceeds budget thresholds",
    icon: AlertTriangle,
    defaultOn: true,
  },
  {
    id: "webinar_milestone",
    label: "Webinar Milestones",
    description: "Registration, attendance, and conversion milestones",
    icon: Zap,
    defaultOn: false,
  },
];

export default function Notifications() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREF_CATEGORIES.map((c) => [c.id, c.defaultOn]))
  );

  const { isSupported, permission, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.notifications.list.useQuery({
    limit: 50,
    offset: 0,
    unreadOnly: showUnreadOnly,
  });
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery();
  const { data: subStatus } = trpc.notifications.subscriptionStatus.useQuery();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("All notifications marked as read");
    },
  });

  const cleanupMutation = trpc.notifications.cleanupSubscriptions.useMutation({
    onSuccess: (data: any) => {
      utils.notifications.subscriptionStatus.invalidate();
      toast.success(`Cleaned up ${data.cleaned} stale device subscription${data.cleaned !== 1 ? "s" : ""}. Kept ${data.kept} active.`);
    },
    onError: (err) => toast.error("Cleanup failed: " + err.message),
  });

  const testPushMutation = trpc.notifications.testPush.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("Test notification sent to this device.");
    },
    onError: (err) => toast.error("Failed to send test: " + err.message),
  });

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Push notifications enabled! You'll now receive alerts on this device.");
      utils.notifications.subscriptionStatus.invalidate();
    } else if (permission === "denied") {
      toast.error("Notifications blocked. Please enable notifications in your browser settings.");
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.info("Push notifications disabled for this device.");
      utils.notifications.subscriptionStatus.invalidate();
    }
  };

  const notifications = data?.notifications || [];
  const unreadCount = unreadData?.count || 0;
  const deviceCount = subStatus?.devices?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              Lead alerts, AI Ops reports, and team updates
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">{unreadCount} unread</Badge>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreferences(!showPreferences)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Preferences
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notification Preferences Panel */}
        {showPreferences && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose which events trigger push notifications and appear in your notification center.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PREF_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={prefs[cat.id] ?? cat.defaultOn}
                      onCheckedChange={(checked) =>
                        setPrefs((prev) => ({ ...prev, [cat.id]: checked }))
                      }
                    />
                  </div>
                );
              })}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Preferences are saved per-device. Changes take effect immediately for new notifications.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Push Notification Setup Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Push Notifications</CardTitle>
                  <CardDescription>
                    {isSubscribed
                      ? `Active on this device${deviceCount > 1 ? ` (${deviceCount} devices total)` : ""}`
                      : "Enable to get instant alerts on your phone"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isSupported ? (
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={(checked) => {
                      if (checked) handleSubscribe();
                      else handleUnsubscribe();
                    }}
                    disabled={pushLoading || permission === "denied"}
                  />
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Not supported</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          {isSubscribed && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Test button — requires confirmation to prevent accidental spam */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={testPushMutation.isPending}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Send Test Notification
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Send a test notification?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will send a single test push notification to this device and create an entry in your notification center. Use this to verify push notifications are working.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => testPushMutation.mutate()}>
                        Send Test
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Cleanup stale subscriptions */}
                {deviceCount > 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cleanupMutation.mutate()}
                    disabled={cleanupMutation.isPending}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Clean up {deviceCount - 1} stale device{deviceCount - 1 !== 1 ? "s" : ""}
                  </Button>
                )}

                <span className="text-xs text-muted-foreground">
                  {deviceCount} device{deviceCount !== 1 ? "s" : ""} registered
                </span>
              </div>
            </CardContent>
          )}

          {!isSubscribed && isSupported && permission !== "denied" && (
            <CardContent className="pt-0">
              <div className="bg-background rounded-lg p-4 border">
                <h4 className="font-medium text-sm mb-2">How to install on your phone:</h4>
                <ol className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    <span><strong>Android:</strong> Open in Chrome → menu (3 dots) → "Add to Home Screen"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    <span><strong>iOS:</strong> Open in Safari → Share button → "Add to Home Screen"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    <span>Open the app from your home screen, then toggle push notifications ON above</span>
                  </li>
                </ol>
              </div>
            </CardContent>
          )}

          {permission === "denied" && (
            <CardContent className="pt-0">
              <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  Notifications are blocked. Go to your browser settings to allow notifications for this site.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Button
            variant={showUnreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            {showUnreadOnly ? <BellRing className="h-4 w-4 mr-1" /> : <Bell className="h-4 w-4 mr-1" />}
            {showUnreadOnly ? "Unread only" : "All notifications"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              utils.notifications.list.invalidate();
              utils.notifications.unreadCount.invalidate();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Notification List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No notifications yet</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {showUnreadOnly
                  ? "All caught up! No unread notifications."
                  : "Lead alerts, AI reports, and appointment updates will appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif: any) => {
              const config = typeConfig[notif.type] || typeConfig.system;
              const Icon = config.icon;
              const priorityColor = priorityColors[notif.priority] || priorityColors.normal;

              return (
                <Card
                  key={notif.id}
                  className={`transition-all cursor-pointer hover:shadow-md ${
                    !notif.isRead ? "border-primary/30 bg-primary/[0.02]" : "opacity-75"
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markReadMutation.mutate({ id: notif.id });
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className={`text-sm font-medium ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                            {notif.title}
                          </h4>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityColor}`}>
                            {notif.priority}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                            {config.label}
                          </Badge>
                          {!notif.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                          {notif.body && notif.body.length > 300
                            ? <Streamdown>{notif.body}</Streamdown>
                            : notif.body}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/60">
                          <span>
                            {notif.createdAt
                              ? new Date(notif.createdAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                  timeZoneName: "short",
                                })
                              : "Just now"}
                          </span>
                          {notif.pushSent && (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" /> Push sent
                            </span>
                          )}
                          {notif.teamMemberName && (
                            <span>To: {notif.teamMemberName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
