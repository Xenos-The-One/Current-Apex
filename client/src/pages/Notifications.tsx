import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Star,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, React.ElementType> = {
  lead: User,
  appointment: Calendar,
  campaign: Mail,
  call: Phone,
  sms: MessageSquare,
  system: Zap,
  billing: Star,
};

const TYPE_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-600",
  appointment: "bg-purple-100 text-purple-600",
  campaign: "bg-green-100 text-green-600",
  call: "bg-orange-100 text-orange-600",
  sms: "bg-cyan-100 text-cyan-600",
  system: "bg-gray-100 text-gray-600",
  billing: "bg-yellow-100 text-yellow-600",
};

export default function Notifications() {
  const { agencyId } = useAgency();

  const { data, isLoading, refetch } = trpc.notifications.list.useQuery(
    { agencyId },
    { enabled: agencyId > 0 }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      refetch();
    },
  });

  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const notifications = (data ?? []) as any[];
  const unread = notifications.filter((n: any) => !n.isRead).length;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Bell className="w-6 h-6" /> Notifications
              {unread > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs">{unread} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">System alerts, reminders, and activity updates.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            {unread > 0 && (
              <Button size="sm" onClick={() => markAllRead.mutate({ agencyId })} disabled={markAllRead.isPending} className="gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
              <BellOff className="w-10 h-10 text-muted-foreground/30" />
              <p className="font-semibold">No notifications</p>
              <p className="text-sm text-muted-foreground">You're all caught up! Notifications will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n: any) => {
              const Icon = TYPE_ICONS[n.type ?? "system"] ?? Bell;
              const colorClass = TYPE_COLORS[n.type ?? "system"] ?? "bg-gray-100 text-gray-600";
              return (
                <Card key={n.id} className={`border shadow-sm transition-all hover:shadow-md ${!n.isRead ? "border-primary/20 bg-primary/5" : ""}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-medium ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          )}
                        </div>
                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                        {!n.isRead && (
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={() => markRead.mutate({ id: n.id })}
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          className="text-xs text-muted-foreground hover:text-red-500 ml-auto flex items-center gap-1"
                          onClick={() => deleteNotif.mutate({ id: n.id })}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
