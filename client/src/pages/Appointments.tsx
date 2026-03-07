import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Calendar, CheckCircle, Clock, MapPin, Plus, Video, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-100 text-blue-700",
  video: "bg-purple-100 text-purple-700",
  in_person: "bg-green-100 text-green-700",
  phone_screen: "bg-amber-100 text-amber-700",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
  rescheduled: "bg-amber-100 text-amber-700",
};

function AddAppointmentDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "call", startAt: "", endAt: "", location: "",
    meetingLink: "", notes: "", leadId: "", sendReminder: true as boolean,
  });

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => { toast.success("Appointment scheduled"); setOpen(false); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      agencyId,
      title: form.title,
      type: form.type as any,
      startAt: new Date(form.startAt),
      endAt: form.endAt ? new Date(form.endAt) : new Date(new Date(form.startAt).getTime() + 60 * 60 * 1000),
      location: form.location || undefined,
      meetingUrl: form.meetingLink || undefined,
      notes: form.notes || undefined,
      leadId: form.leadId ? parseInt(form.leadId) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Schedule Appointment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Initial Consultation" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["call", "video", "in_person", "phone_screen"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Lead ID</Label><Input type="number" value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))} placeholder="Optional" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Start *</Label><Input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>End</Label><Input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} /></div>
          </div>
          {form.type === "in_person" && (
            <div className="space-y-1"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="123 Main St" /></div>
          )}
          {form.type === "video" && (
            <div className="space-y-1"><Label>Meeting Link</Label><Input value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://zoom.us/j/..." /></div>
          )}
          <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Scheduling..." : "Schedule Appointment"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentCard({ appt, agencyId, onRefetch }: { appt: any; agencyId: number; onRefetch: () => void }) {
  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => { toast.success("Updated"); onRefetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const isPast = new Date(appt.startAt) < new Date();
  const duration = appt.endAt ? Math.round((new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime()) / 60000) : 60;

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${appt.type === "video" ? "bg-purple-100" : appt.type === "in_person" ? "bg-green-100" : "bg-blue-100"}`}>
              {appt.type === "video" ? <Video className="w-4 h-4 text-purple-600" /> : <Calendar className="w-4 h-4 text-blue-600" />}
            </div>
            <div>
              <p className="font-semibold text-sm">{appt.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{appt.type?.replace(/_/g, " ")}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[appt.status] || ""}`}>
            {appt.status}
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{new Date(appt.startAt).toLocaleDateString()} at {new Date(appt.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span>· {duration}min</span>
          </div>
          {appt.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" /> <span className="truncate">{appt.location}</span>
            </div>
          )}
          {appt.meetingUrl && (
            <a href={appt.meetingUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
              <Video className="w-3 h-3" /> Join Meeting
            </a>
          )}
        </div>

        {appt.status === "scheduled" && !isPast && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="h-6 text-xs gap-1 flex-1"
              onClick={() => updateMutation.mutate({ id: appt.id, agencyId, status: "confirmed" })}
            >
              <CheckCircle className="w-3 h-3" /> Confirm
            </Button>
            <Button
              variant="outline" size="sm" className="h-6 text-xs gap-1 flex-1 text-destructive hover:text-destructive"
              onClick={() => updateMutation.mutate({ id: appt.id, agencyId, status: "cancelled" })}
            >
              <XCircle className="w-3 h-3" /> Cancel
            </Button>
          </div>
        )}
        {appt.status === "confirmed" && !isPast && (
          <Button
            variant="outline" size="sm" className="mt-3 h-6 text-xs gap-1 w-full"
            onClick={() => updateMutation.mutate({ id: appt.id, agencyId, status: "completed" })}
          >
            <CheckCircle className="w-3 h-3" /> Mark Complete
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;
  const [filter, setFilter] = useState("upcoming");

  const { data: upcoming, refetch: refetchUpcoming } = trpc.appointments.upcoming.useQuery({ agencyId, limit: 20 });
  const { data: all, refetch: refetchAll } = trpc.appointments.list.useQuery({ agencyId, limit: 50 });

  const appointments = filter === "upcoming" ? upcoming : all;
  const refetch = filter === "upcoming" ? refetchUpcoming : refetchAll;

  const stats = {
    total: all?.length ?? 0,
    scheduled: all?.filter(a => a.status === "scheduled").length ?? 0,
    confirmed: all?.filter(a => a.status === "confirmed").length ?? 0,
    completed: all?.filter(a => a.status === "completed").length ?? 0,
  };

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-4 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Appointments</h1>
            <p className="text-muted-foreground text-sm">{stats.total} total appointments</p>
          </div>
          <AddAppointmentDialog agencyId={agencyId} onSuccess={refetch} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "blue" },
            { label: "Scheduled", value: stats.scheduled, color: "blue" },
            { label: "Confirmed", value: stats.confirmed, color: "green" },
            { label: "Completed", value: stats.completed, color: "gray" },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold font-display mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {["upcoming", "all"].map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
              {f}
            </Button>
          ))}
        </div>

        {/* Appointments grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {appointments?.map(appt => (
            <AppointmentCard key={appt.id} appt={appt} agencyId={agencyId} onRefetch={refetch} />
          ))}
          {appointments?.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No appointments found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Schedule your first appointment to get started</p>
            </div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
