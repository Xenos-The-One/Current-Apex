import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Gift,
  Mic,
  Phone,
  PhoneCall,
  PhoneMissed,
  Play,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// ─── Appointments Tab ──────────────────────────────────────────────────────
function AppointmentsTab({ agencyId }: { agencyId: number }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "consultation" as const,
    startAt: "",
    endAt: "",
    location: "",
    meetingUrl: "",
    notes: "",
  });

  const { data: appts = [], refetch } = trpc.appointments.list.useQuery({ agencyId, limit: 50 });

  const createAppt = trpc.appointments.create.useMutation({
    onSuccess: () => { toast.success("Appointment scheduled"); setShowAdd(false); refetch(); },
    onError: () => toast.error("Failed to schedule appointment"),
  });

  const STATUS_COLORS: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-orange-100 text-orange-700",
    rescheduled: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{appts.length} appointments</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Schedule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Initial Consultation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow_up">Follow-Up</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Office / Zoom" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start *</Label>
                  <Input type="datetime-local" value={form.startAt} onChange={e => setForm(p => ({ ...p, startAt: e.target.value }))} />
                </div>
                <div>
                  <Label>End *</Label>
                  <Input type="datetime-local" value={form.endAt} onChange={e => setForm(p => ({ ...p, endAt: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Meeting URL</Label>
                <Input value={form.meetingUrl} onChange={e => setForm(p => ({ ...p, meetingUrl: e.target.value }))} placeholder="https://zoom.us/..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                onClick={() => createAppt.mutate({
                  agencyId,
                  title: form.title,
                  type: form.type,
                  startAt: new Date(form.startAt),
                  endAt: new Date(form.endAt),
                  location: form.location || undefined,
                  meetingUrl: form.meetingUrl || undefined,
                  notes: form.notes || undefined,
                })}
                disabled={!form.title || !form.startAt || !form.endAt || createAppt.isPending}
              >
                {createAppt.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {appts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No appointments scheduled yet.
            </CardContent>
          </Card>
        ) : (
          appts.map((appt: (typeof appts)[number]) => (
            <Card key={appt.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{appt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(appt.startAt).toLocaleString()} · {appt.type?.replace("_", " ")}
                  </p>
                  {appt.location && <p className="text-xs text-muted-foreground mt-0.5">{appt.location}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[appt.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                        {(appt.status ?? "").replace("_", " ")}
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Call Review Tab ───────────────────────────────────────────────────────
function CallReviewTab({ agencyId }: { agencyId: number }) {
  const { data: calls = [] } = trpc.vapi.listCalls.useQuery({ agencyId, limit: 50, offset: 0 });

  const SENTIMENT_ICON: Record<string, React.ReactNode> = {
    positive: <ThumbsUp className="w-3.5 h-3.5 text-green-500" />,
    neutral: <Zap className="w-3.5 h-3.5 text-yellow-500" />,
    negative: <ThumbsDown className="w-3.5 h-3.5 text-red-500" />,
  };

  const STATUS_ICON: Record<string, React.ReactNode> = {
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    failed: <PhoneMissed className="w-4 h-4 text-red-500" />,
    no_answer: <PhoneMissed className="w-4 h-4 text-orange-500" />,
    in_progress: <PhoneCall className="w-4 h-4 text-blue-500 animate-pulse" />,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{calls.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {calls.filter((c: (typeof calls)[number]) => c.appointmentBooked).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Appointments Booked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {calls.length > 0
                ? Math.round(calls.reduce((acc: number, c: (typeof calls)[number]) => acc + (c.duration ?? 0), 0) / calls.length / 60)
                : 0}m
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg Duration</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">To</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sentiment</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Booked</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Recording</th>
                </tr>
              </thead>
              <tbody>
                {calls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No calls recorded yet.
                    </td>
                  </tr>
                ) : (
                  calls.map((call: (typeof calls)[number]) => (
                    <tr key={call.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {STATUS_ICON[call.status ?? ""] ?? <Phone className="w-4 h-4 text-muted-foreground" />}
                          <span className="text-xs capitalize">{(call.status ?? "").replace("_", " ")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{call.toNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {call.sentiment ? SENTIMENT_ICON[call.sentiment] : <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {call.appointmentBooked
                          ? <Badge className="text-xs bg-green-100 text-green-700 border-0">Yes</Badge>
                          : <span className="text-xs text-muted-foreground">No</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {call.createdAt ? new Date(call.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {call.recordingUrl ? (
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => window.open(call.recordingUrl!, "_blank")}>
                            <Play className="w-3 h-3 mr-1" /> Play
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No recording</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Follow-Ups Tab ────────────────────────────────────────────────────────
function FollowUpsTab({ agencyId }: { agencyId: number }) {
  const { data: leadsData } = trpc.leads.list.useQuery({
    agencyId,
    limit: 50,
    offset: 0,
  });
  const leads = leadsData?.leads ?? [];
  const followUpLeads = leads.filter((l: (typeof leads)[number]) => l.nextFollowUpAt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{followUpLeads.length} leads need follow-up</p>
      </div>

      <div className="grid gap-3">
        {followUpLeads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No follow-ups scheduled. Set follow-up dates on your leads.
            </CardContent>
          </Card>
        ) : (
          followUpLeads.map((lead: (typeof leads)[number]) => {
            const followUpDate = new Date(lead.nextFollowUpAt!);
            const isOverdue = followUpDate < new Date();
            const isToday = followUpDate.toDateString() === new Date().toDateString();
            return (
              <Card key={lead.id} className={`hover:shadow-sm transition-shadow ${isOverdue ? "border-red-200" : isToday ? "border-yellow-200" : ""}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? "bg-red-100" : isToday ? "bg-yellow-100" : "bg-primary/10"}`}>
                    <Bell className={`w-5 h-5 ${isOverdue ? "text-red-500" : isToday ? "text-yellow-600" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{lead.status.replace("_", " ")} · {lead.contactType.replace("_", " ")}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-medium ${isOverdue ? "text-red-500" : isToday ? "text-yellow-600" : "text-muted-foreground"}`}>
                      {isOverdue ? "Overdue" : isToday ? "Today" : followUpDate.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{followUpDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Birthdays Tab ─────────────────────────────────────────────────────────
function BirthdaysTab({ agencyId }: { agencyId: number }) {
  // Borrowers with dateOfBirth set
  const { data: borrowers = [] } = trpc.borrowers.list.useQuery({ agencyId, limit: 100, offset: 0 });

  const today = new Date();
  const upcomingBirthdays = borrowers
    .filter((b: (typeof borrowers)[number]) => b.dateOfBirth)
    .map((b: (typeof borrowers)[number]) => {
      const dob = new Date(b.dateOfBirth!);
      const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      const nextBirthday = thisYear < today ? new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate()) : thisYear;
      const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...b, nextBirthday, daysUntil };
    })
    .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Upcoming borrower birthdays — great opportunity to reach out!</p>
      <div className="grid gap-3">
        {upcomingBirthdays.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No birthdays on record. Add date of birth to borrower profiles.
            </CardContent>
          </Card>
        ) : (
          upcomingBirthdays.map((b: any) => (
            <Card key={b.id} className={`hover:shadow-sm transition-shadow ${b.daysUntil === 0 ? "border-yellow-300 bg-yellow-50/50" : ""}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${b.daysUntil === 0 ? "bg-yellow-100" : "bg-primary/10"}`}>
                  <Gift className={`w-5 h-5 ${b.daysUntil === 0 ? "text-yellow-600" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{b.firstName} {b.lastName}</p>
                  <p className="text-xs text-muted-foreground">{b.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${b.daysUntil === 0 ? "text-yellow-600" : b.daysUntil <= 7 ? "text-orange-500" : "text-muted-foreground"}`}>
                    {b.daysUntil === 0 ? "🎂 Today!" : `${b.daysUntil}d`}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.nextBirthday.toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Activity Hub ─────────────────────────────────────────────────────
export default function ActivityHub() {
  const { agencyId } = useAgency();

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display">Activity</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track appointments, calls, follow-ups, and upcoming birthdays</p>
        </div>

        <Tabs defaultValue="appointments">
          <TabsList className="h-9">
            <TabsTrigger value="appointments" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="call-review" className="gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Call Review
            </TabsTrigger>
            <TabsTrigger value="follow-ups" className="gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Follow-Ups
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Birthdays
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="mt-4">
            <AppointmentsTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="call-review" className="mt-4">
            <CallReviewTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="follow-ups" className="mt-4">
            <FollowUpsTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="birthdays" className="mt-4">
            <BirthdaysTab agencyId={agencyId} />
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
