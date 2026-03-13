import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock,
  MapPin, Phone, Video, User, Edit2, Trash2, Check, X, RotateCcw,
  Sparkles, List, Grid3X3, AlignLeft, Filter, Search, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Eye, MoreHorizontal, Loader2,
  Link2, Settings2, Unlink,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day" | "agenda";

type Appointment = {
  id: number;
  title?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  calendarId?: number | null;
  calendarName?: string | null;
  appointmentDate: Date;
  endTime?: Date | null;
  duration?: number | null;
  meetingType?: string | null;
  location?: string | null;
  timezone?: string | null;
  status: string;
  notes?: string | null;
  assignedUserId?: number | null;
  assignedUserName?: string | null;
  source?: string | null;
  appointmentType?: string | null;
  // Recurrence
  recurrenceRule?: string | null;
  recurrenceSeriesId?: string | null;
  recurrenceEndDate?: Date | null;
};

type CalendarResource = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  confirmed:   { label: "Confirmed",   color: "text-green-700",  bg: "bg-green-100",  icon: <CheckCircle className="w-3 h-3" /> },
  unconfirmed: { label: "Unconfirmed", color: "text-yellow-700", bg: "bg-yellow-100", icon: <AlertCircle className="w-3 h-3" /> },
  scheduled:   { label: "Scheduled",   color: "text-blue-700",   bg: "bg-blue-100",   icon: <CalendarIcon className="w-3 h-3" /> },
  completed:   { label: "Completed",   color: "text-slate-600",  bg: "bg-slate-100",  icon: <Check className="w-3 h-3" /> },
  cancelled:   { label: "Cancelled",   color: "text-red-700",    bg: "bg-red-100",    icon: <XCircle className="w-3 h-3" /> },
  no_show:     { label: "No Show",     color: "text-orange-700", bg: "bg-orange-100", icon: <X className="w-3 h-3" /> },
  no_answer:   { label: "No Answer",   color: "text-purple-700", bg: "bg-purple-100", icon: <Phone className="w-3 h-3" /> },
  busy:        { label: "Busy",        color: "text-gray-700",   bg: "bg-gray-100",   icon: <AlertCircle className="w-3 h-3" /> },
};

const MEETING_TYPE_ICONS: Record<string, React.ReactNode> = {
  phone:     <Phone className="w-3 h-3" />,
  video:     <Video className="w-3 h-3" />,
  in_person: <MapPin className="w-3 h-3" />,
};

// Meeting type color palette — used for appointment card color-coding
const MEETING_TYPE_COLORS: Record<string, string> = {
  phone:     "#6366F1", // indigo
  video:     "#0EA5E9", // sky blue
  in_person: "#10B981", // emerald
};

function getMeetingTypeColor(meetingType: string | null | undefined, calendarColor: string): string {
  if (!meetingType) return calendarColor;
  return MEETING_TYPE_COLORS[meetingType] ?? calendarColor;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getContactName(appt: Appointment): string {
  if (appt.title) return appt.title;
  const name = `${appt.firstName} ${appt.lastName}`.trim();
  return name || "Untitled Appointment";
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isSameDay(a: Date, b: Date): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd;
  });
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

function getCalendarColor(calId: number | null | undefined, calendars: CalendarResource[]): string {
  if (!calId) return "#6366F1";
  return calendars.find(c => c.id === calId)?.color ?? "#6366F1";
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Appointment Card (mini) ──────────────────────────────────────────────────

function ApptChip({ appt, onClick, calendarColor }: { appt: Appointment; onClick: () => void; calendarColor: string }) {
  const isCancel = appt.status === "cancelled" || appt.status === "no_show";
  const color = getMeetingTypeColor(appt.meetingType, calendarColor);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate transition-opacity hover:opacity-80 ${isCancel ? "opacity-50 line-through" : ""}`}
      style={{ backgroundColor: color + "22", color, borderLeft: `3px solid ${color}` }}
      title={`${getContactName(appt)} · ${appt.meetingType?.replace("_", " ") ?? ""}`}
    >
      {formatTime(appt.appointmentDate)} {getContactName(appt)}
      {appt.recurrenceSeriesId && <span className="ml-1 opacity-60">↻</span>}
    </button>
  );
}

// ─── Add/Edit Appointment Modal ───────────────────────────────────────────────

function AppointmentModal({
  open,
  onClose,
  initial,
  calendars,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<Appointment> & { defaultDate?: Date };
  calendars: CalendarResource[];
  onSaved: () => void;
}) {
  const isEdit = !!initial?.id;
  const utils = trpc.useUtils();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [contactName, setContactName] = useState(
    initial ? `${initial.firstName ?? ""} ${initial.lastName ?? ""}`.trim() : ""
  );
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [calendarId, setCalendarId] = useState<string>(initial?.calendarId?.toString() ?? "");
  const [date, setDate] = useState(() => {
    const d = initial?.appointmentDate ?? initial?.defaultDate ?? new Date();
    return new Date(d).toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    if (initial?.endTime) return new Date(initial.endTime).toISOString().slice(0, 16);
    const d = initial?.appointmentDate ?? initial?.defaultDate ?? new Date();
    const end = new Date(d);
    end.setMinutes(end.getMinutes() + 30);
    return end.toISOString().slice(0, 16);
  });
  const [meetingType, setMeetingType] = useState(initial?.meetingType ?? "phone");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [status, setStatus] = useState(initial?.status ?? "unconfirmed");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [apptType, setApptType] = useState(initial?.appointmentType ?? "consultation");
  const [assignedTo, setAssignedTo] = useState(initial?.assignedUserName ?? "");
  const [recurrenceRule, setRecurrenceRule] = useState(initial?.recurrenceRule ?? "none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => {
    if (initial?.recurrenceEndDate) return new Date(initial.recurrenceEndDate).toISOString().slice(0, 10);
    // Default end date: 3 months from now
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });

  const createMut = trpc.calendars.createAppointment.useMutation({
    onSuccess: () => { toast.success("Appointment created"); utils.calendars.listAppointments.invalidate(); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const createRecurringMut = trpc.calendars.createRecurringAppointments.useMutation({
    onSuccess: (r: any) => { toast.success(`Created ${r.count} recurring appointments`); utils.calendars.listAppointments.invalidate(); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.calendars.updateAppointment.useMutation({
    onSuccess: () => { toast.success("Appointment updated"); utils.calendars.listAppointments.invalidate(); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const startDt = new Date(date);
    const endDt = new Date(endDate);
    const dur = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
    const cal = calendars.find(c => c.id === Number(calendarId));
    const payload = {
      title: title || contactName || "Appointment",
      contactName,
      firstName: contactName.split(" ")[0] ?? "",
      lastName: contactName.split(" ").slice(1).join(" ") ?? "",
      email,
      phone,
      calendarId: calendarId ? Number(calendarId) : undefined,
      calendarName: cal?.name,
      appointmentDate: startDt,
      endTime: endDt,
      duration: dur > 0 ? dur : 30,
      meetingType: meetingType as any,
      location,
      timezone: "America/New_York",
      status: status as any,
      notes,
      appointmentType: apptType as any,
      assignedUserName: assignedTo || undefined,
      recurrenceRule: recurrenceRule !== "none" ? recurrenceRule : undefined,
      recurrenceEndDate: recurrenceRule !== "none" ? new Date(recurrenceEndDate) : undefined,
    };
    if (isEdit) updateMut.mutate({ id: initial!.id!, ...payload });
    else if (recurrenceRule !== "none") createRecurringMut.mutate(payload as any);
    else createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending || createRecurringMut.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Appointment" : "New Appointment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Initial Consultation" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contact Name</Label>
              <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-0100" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start</Label>
              <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Calendar</Label>
              <Select value={calendarId} onValueChange={setCalendarId}>
                <SelectTrigger><SelectValue placeholder="Select calendar" /></SelectTrigger>
                <SelectContent>
                  {calendars.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Meeting Type</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Appointment Type</Label>
              <Select value={apptType} onValueChange={setApptType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="follow_up">Follow-Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location / Meeting URL</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Address or Zoom link" />
          </div>
          <div className="space-y-1">
            <Label>Assigned To</Label>
            <Input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Team member name" />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." rows={3} />
          </div>

          {/* Recurrence — only show for new appointments */}
          {!isEdit && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Repeat</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Frequency</Label>
                  <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {recurrenceRule !== "none" && (
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="h-8 text-sm" />
                  </div>
                )}
              </div>
              {recurrenceRule !== "none" && (
                <p className="text-xs text-muted-foreground">
                  Appointments will be created {recurrenceRule === "weekly" ? "every week" : recurrenceRule === "biweekly" ? "every 2 weeks" : "every month"} until {new Date(recurrenceEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : recurrenceRule !== "none" ? "Create Recurring Series" : "Create Appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Appointment Detail Sheet ─────────────────────────────────────────────────

function AppointmentDetail({
  appt,
  calendars,
  onClose,
  onEdit,
  onRefresh,
}: {
  appt: Appointment;
  calendars: CalendarResource[];
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState(appt.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState(new Date(appt.appointmentDate).toISOString().slice(0, 16));
  const [newEnd, setNewEnd] = useState(appt.endTime ? new Date(appt.endTime).toISOString().slice(0, 16) : "");

  const invalidate = () => utils.calendars.listAppointments.invalidate();

  const statusMut = trpc.calendars.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); invalidate(); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });
  const notesMut = trpc.calendars.updateNotes.useMutation({
    onSuccess: () => { toast.success("Notes saved"); setEditingNotes(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rescheduleMut = trpc.calendars.reschedule.useMutation({
    onSuccess: () => { toast.success("Appointment rescheduled"); setRescheduleOpen(false); invalidate(); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.calendars.deleteAppointment.useMutation({
    onSuccess: () => { toast.success("Appointment deleted"); invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const cancelSeriesMut = trpc.calendars.cancelRecurringSeries.useMutation({
    onSuccess: (r: any) => { toast.success(`Cancelled ${r.count} appointments in series`); invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const color = getCalendarColor(appt.calendarId, calendars);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b" style={{ borderTop: `4px solid ${color}` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{getContactName(appt)}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={appt.status} />
              {appt.calendarName && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + "22", color }}>
                  {appt.calendarName}
                </span>
              )}
              {appt.recurrenceSeriesId && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                  ↻ {appt.recurrenceRule?.replace("biweekly", "bi-weekly") ?? "recurring"}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={onEdit}><Edit2 className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteMut.mutate({ id: appt.id })}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Time & Meeting */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">{formatDate(appt.appointmentDate)}</span>
            <span className="text-muted-foreground">
              {formatTime(appt.appointmentDate)}
              {appt.endTime && ` – ${formatTime(appt.endTime)}`}
              {appt.duration && ` (${appt.duration} min)`}
            </span>
          </div>
          {appt.meetingType && (
            <div className="flex items-center gap-2 text-sm">
              {MEETING_TYPE_ICONS[appt.meetingType]}
              <span className="capitalize text-muted-foreground">{appt.meetingType.replace("_", " ")}</span>
              {appt.location && <span className="text-foreground">{appt.location}</span>}
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
          <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
            <p className="text-sm font-medium">{appt.firstName} {appt.lastName}</p>
            {appt.email && <p className="text-sm text-muted-foreground">{appt.email}</p>}
            {appt.phone && <p className="text-sm text-muted-foreground">{appt.phone}</p>}
            {appt.source && <p className="text-xs text-muted-foreground">Source: {appt.source}</p>}
          </div>
        </div>

        {/* Assigned */}
        {appt.assignedUserName && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Assigned to</span>
            <span className="font-medium">{appt.assignedUserName}</span>
          </div>
        )}

        {/* Recurring Series Indicator */}
        {appt.recurrenceSeriesId && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
            <div className="flex items-center gap-2">
              <span className="text-indigo-600 text-sm">↻</span>
              <div>
                <p className="text-xs font-medium text-indigo-800">Recurring appointment</p>
                <p className="text-xs text-indigo-600 capitalize">{appt.recurrenceRule?.replace("biweekly", "bi-weekly")} series</p>
              </div>
            </div>
            <Button
              size="sm" variant="ghost" className="text-red-500 hover:text-red-600 text-xs h-7"
              onClick={() => {
                if (confirm("Cancel all future appointments in this series?")) {
                  cancelSeriesMut.mutate({ seriesId: appt.recurrenceSeriesId!, fromDate: new Date(appt.appointmentDate) });
                }
              }}
              disabled={cancelSeriesMut.isPending}
            >
              Cancel Series
            </Button>
          </div>
        )}

        {/* Quick Status Actions */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {appt.status !== "confirmed" && (
              <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => statusMut.mutate({ id: appt.id, status: "confirmed" })}>
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Confirm
              </Button>
            )}
            {appt.status !== "completed" && (
              <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => statusMut.mutate({ id: appt.id, status: "completed" })}>
                <Check className="w-3.5 h-3.5 mr-1.5" /> Complete
              </Button>
            )}
            {appt.status !== "cancelled" && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => statusMut.mutate({ id: appt.id, status: "cancelled" })}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel
              </Button>
            )}
            {appt.status !== "no_show" && (
              <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => statusMut.mutate({ id: appt.id, status: "no_show" })}>
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> No Show
              </Button>
            )}
            <Button size="sm" variant="outline" className="col-span-2"
              onClick={() => setRescheduleOpen(true)}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reschedule
            </Button>
          </div>
        </div>

        {/* Reschedule Form */}
        {rescheduleOpen && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Reschedule</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">New Start</Label>
                <Input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New End</Label>
                <Input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="text-xs" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => rescheduleMut.mutate({
                id: appt.id,
                newDate: new Date(newDate),
                newEndTime: newEnd ? new Date(newEnd) : undefined,
              })} disabled={rescheduleMut.isPending}>
                {rescheduleMut.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
            {!editingNotes && (
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingNotes(true)}>
                <Edit2 className="w-3 h-3 mr-1" /> Edit
              </Button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => notesMut.mutate({ id: appt.id, notes })} disabled={notesMut.isPending}>
                  {notesMut.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingNotes(false); setNotes(appt.notes ?? ""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[2rem]">
              {notes || <span className="italic">No notes yet. Click Edit to add.</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  year, month, appointments, calendars, onDayClick, onApptClick,
}: {
  year: number; month: number;
  appointments: Appointment[]; calendars: CalendarResource[];
  onDayClick: (date: Date) => void; onApptClick: (a: Appointment) => void;
}) {
  const days = getMonthDays(year, month);
  const today = new Date();

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="min-h-[120px] border-b border-r bg-muted/10" />;
          const dayAppts = appointments.filter(a => isSameDay(new Date(a.appointmentDate), day));
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] border-b border-r p-1.5 cursor-pointer hover:bg-muted/20 transition-colors ${isToday ? "bg-blue-50/50" : ""}`}
              onClick={() => onDayClick(day)}
            >
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${isToday ? "bg-blue-600 text-white" : "text-foreground"}`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map(a => (
                  <ApptChip key={a.id} appt={a} calendarColor={getCalendarColor(a.calendarId, calendars)}
                    onClick={e => { (e as any).stopPropagation?.(); onApptClick(a); }} />
                ))}
                {dayAppts.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-1">+{dayAppts.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  date, appointments, calendars, onSlotClick, onApptClick,
}: {
  date: Date; appointments: Appointment[]; calendars: CalendarResource[];
  onSlotClick: (date: Date) => void; onApptClick: (a: Appointment) => void;
}) {
  const days = getWeekDays(date);
  const today = new Date();
  const visibleHours = HOURS.slice(7, 21); // 7am to 8pm

  return (
    <div className="flex-1 overflow-auto">
      {/* Header row */}
      <div className="grid sticky top-0 z-10 bg-background border-b" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
        <div className="border-r" />
        {days.map(d => {
          const isToday = isSameDay(d, today);
          return (
            <div key={d.toISOString()} className={`py-2 text-center border-r ${isToday ? "bg-blue-50" : ""}`}>
              <p className="text-xs text-muted-foreground">{DAYS_OF_WEEK[d.getDay()]}</p>
              <p className={`text-lg font-semibold ${isToday ? "text-blue-600" : ""}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div className="relative">
        {visibleHours.map(hour => (
          <div key={hour} className="grid" style={{ gridTemplateColumns: "60px repeat(7, 1fr)", minHeight: "60px" }}>
            <div className="border-r border-b px-2 pt-1 text-xs text-muted-foreground text-right">
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
            {days.map(d => {
              const slotAppts = appointments.filter(a => {
                const ad = new Date(a.appointmentDate);
                return isSameDay(ad, d) && ad.getHours() === hour;
              });
              return (
                <div
                  key={d.toISOString()}
                  className="border-r border-b p-0.5 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => { const dt = new Date(d); dt.setHours(hour, 0, 0, 0); onSlotClick(dt); }}
                >
                  {slotAppts.map(a => (
                    <ApptChip key={a.id} appt={a} calendarColor={getCalendarColor(a.calendarId, calendars)}
                      onClick={e => { (e as any).stopPropagation?.(); onApptClick(a); }} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  date, appointments, calendars, onSlotClick, onApptClick,
}: {
  date: Date; appointments: Appointment[]; calendars: CalendarResource[];
  onSlotClick: (date: Date) => void; onApptClick: (a: Appointment) => void;
}) {
  const dayAppts = appointments.filter(a => isSameDay(new Date(a.appointmentDate), date));
  const visibleHours = HOURS.slice(7, 21);

  return (
    <div className="flex-1 overflow-auto">
      <div className="sticky top-0 bg-background border-b p-3 text-center">
        <p className="text-lg font-semibold">{date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <p className="text-sm text-muted-foreground">{dayAppts.length} appointment{dayAppts.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="max-w-2xl mx-auto">
        {visibleHours.map(hour => {
          const slotAppts = dayAppts.filter(a => new Date(a.appointmentDate).getHours() === hour);
          return (
            <div key={hour} className="flex border-b min-h-[64px]">
              <div className="w-16 shrink-0 border-r px-2 pt-1 text-xs text-muted-foreground text-right">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              <div
                className="flex-1 p-1 cursor-pointer hover:bg-muted/20 transition-colors space-y-1"
                onClick={() => { const dt = new Date(date); dt.setHours(hour, 0, 0, 0); onSlotClick(dt); }}
              >
                {slotAppts.map(a => {
                  const calColor = getCalendarColor(a.calendarId, calendars);
                  const color = getMeetingTypeColor(a.meetingType, calColor);
                  return (
                    <div
                      key={a.id}
                      className="rounded-lg p-2 cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: color + "18", borderLeft: `4px solid ${color}` }}
                      onClick={e => { e.stopPropagation(); onApptClick(a); }}
                    >
                      <p className="text-sm font-medium" style={{ color }}>{getContactName(a)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(a.appointmentDate)}{a.endTime && ` – ${formatTime(a.endTime)}`}
                        {a.meetingType && ` · ${a.meetingType.replace("_", " ")}`}
                        {a.recurrenceSeriesId && " · ↻ recurring"}
                      </p>
                      <StatusBadge status={a.status} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Agenda View ──────────────────────────────────────────────────────────────

function AgendaView({
  appointments, calendars, onApptClick,
}: {
  appointments: Appointment[]; calendars: CalendarResource[]; onApptClick: (a: Appointment) => void;
}) {
  const sorted = [...appointments].sort((a, b) =>
    new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
  );

  // Group by date
  const groups: Record<string, Appointment[]> = {};
  for (const a of sorted) {
    const key = new Date(a.appointmentDate).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No appointments in this range</p>
          <p className="text-sm">Try adjusting the date range or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-6 max-w-3xl mx-auto w-full">
      {Object.entries(groups).map(([dateStr, appts]) => (
        <div key={dateStr}>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-sm font-semibold text-foreground">{new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
            <div className="flex-1 h-px bg-border" />
            <Badge variant="secondary">{appts.length}</Badge>
          </div>
          <div className="space-y-2">
            {appts.map(a => {
              const calColor = getCalendarColor(a.calendarId, calendars);
              const color = getMeetingTypeColor(a.meetingType, calColor);
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                  style={{ borderLeft: `4px solid ${color}` }}
                  onClick={() => onApptClick(a)}
                >
                  <div className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">
                    {formatTime(a.appointmentDate)}
                    {a.endTime && <><br />{formatTime(a.endTime)}</>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getContactName(a)}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.firstName} {a.lastName}{a.phone && ` · ${a.phone}`}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={a.status} />
                      {a.meetingType && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {MEETING_TYPE_ICONS[a.meetingType]}{a.meetingType.replace("_", " ")}
                        </span>
                      )}
                      {a.calendarName && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: color + "22", color }}>
                          {a.calendarName}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.duration && <div className="text-xs text-muted-foreground shrink-0">{a.duration}m</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────────────────────

export default function Calendar() {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [newApptDate, setNewApptDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCalendar, setFilterCalendar] = useState("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const [showBookingLink, setShowBookingLink] = useState(false);
  const [bookingLinkCalId, setBookingLinkCalId] = useState<number | null>(null);
  const [bookingSlug, setBookingSlug] = useState("");

  // Date range for query
  const { startDate, endDate } = useMemo(() => {
    if (view === "month") {
      return {
        startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59),
      };
    } else if (view === "week") {
      const days = getWeekDays(currentDate);
      return { startDate: days[0], endDate: new Date(days[6].getTime() + 86400000 - 1) };
    } else if (view === "day") {
      const s = new Date(currentDate); s.setHours(0, 0, 0, 0);
      const e = new Date(currentDate); e.setHours(23, 59, 59, 999);
      return { startDate: s, endDate: e };
    } else {
      // Agenda: 60 days
      const s = new Date(); s.setDate(s.getDate() - 7);
      const e = new Date(); e.setDate(e.getDate() + 60);
      return { startDate: s, endDate: e };
    }
  }, [view, currentDate]);

  const { data: calendarsData = [], refetch: refetchCalendars } = trpc.calendars.listCalendars.useQuery();
  const { data: appointmentsData = [], refetch: refetchAppts, isLoading } = trpc.calendars.listAppointments.useQuery({
    startDate,
    endDate,
    status: filterStatus !== "all" ? filterStatus : undefined,
    calendarId: filterCalendar !== "all" ? Number(filterCalendar) : undefined,
    pageSize: 500,
  });

  const utils = trpc.useUtils();

  // Google sync
  const { data: googleSyncStatus } = trpc.calendars.getGoogleSyncStatus.useQuery();
  const initiateGoogleMut = trpc.calendars.initiateGoogleSync.useMutation({
    onSuccess: (r) => { window.open(r.authUrl, "_blank"); },
    onError: (e) => toast.error(e.message),
  });
  const disconnectGoogleMut = trpc.calendars.disconnectGoogleSync.useMutation({
    onSuccess: () => { toast.success("Google Calendar disconnected"); utils.calendars.getGoogleSyncStatus.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  // Booking link
  const setSlugMut = trpc.calendars.setCalendarSlug.useMutation({
    onSuccess: () => {
      toast.success("Booking link saved!");
      utils.calendars.listCalendars.invalidate();
      setShowBookingLink(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const seedMut = trpc.calendars.seedCalendarData.useMutation({
    onSuccess: (r) => {
      if (r.skipped) toast.info("Calendar data already exists.");
      else toast.success(`Sample data created! ${r.calendars} calendars, ${r.appointments} appointments.`);
      utils.calendars.listCalendars.invalidate();
      utils.calendars.listAppointments.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter appointments
  const filteredAppts = useMemo(() => {
    let list = appointmentsData as Appointment[];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        getContactName(a).toLowerCase().includes(q) ||
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        (a.phone ?? "").includes(q) ||
        (a.email ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointmentsData, search]);

  // Navigation
  const navigate = useCallback((dir: -1 | 1) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else if (view === "day") d.setDate(d.getDate() + dir);
      else d.setDate(d.getDate() + dir * 30);
      return d;
    });
  }, [view]);

  const headerTitle = useMemo(() => {
    if (view === "month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "week") {
      const days = getWeekDays(currentDate);
      return `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (view === "day") return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return "Upcoming Appointments";
  }, [view, currentDate]);

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  const handleSlotClick = (date: Date) => {
    setNewApptDate(date);
    setShowAddModal(true);
  };

  const handleApptClick = (a: Appointment) => {
    setSelectedAppt(a);
  };

  const isEmpty = calendarsData.length === 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0 flex-wrap">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-sm font-medium min-w-[140px] text-center">
              {headerTitle}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>

          {/* View Toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            {(["month", "week", "day", "agenda"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search appointments..." className="pl-8 h-8 w-48 text-sm"
            />
          </div>

          {/* Filters */}
          <Button variant="outline" size="sm" onClick={() => setShowFilters(v => !v)}>
            <Filter className="w-3.5 h-3.5 mr-1.5" /> Filters
          </Button>

          {/* Seed */}
          {isEmpty && (
            <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
              {seedMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Seed Sample Data
            </Button>
          )}

          {/* Booking Link */}
          <Button variant="outline" size="sm" onClick={() => {
            const cals = calendarsData as any[];
            if (cals.length > 0) {
              setBookingLinkCalId(cals[0].id);
              setBookingSlug(cals[0].slug || "");
              setShowBookingLink(true);
            } else {
              toast.info("Create a calendar first to get a booking link.");
            }
          }}>
            <Link2 className="w-3.5 h-3.5 mr-1.5" /> Booking Link
          </Button>
          {/* Google Sync */}
          <Button variant="outline" size="sm" onClick={() => setShowGoogleSync(true)}>
            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Google Sync
          </Button>
          <Button size="sm" onClick={() => { setNewApptDate(new Date()); setShowAddModal(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Appointment
          </Button>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Calendar:</Label>
              <Select value={filterCalendar} onValueChange={setFilterCalendar}>
                <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calendars</SelectItem>
                  {calendarsData.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-muted-foreground">{filteredAppts.length} appointments</span>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => { setFilterStatus("all"); setFilterCalendar("all"); setSearch(""); }}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Calendar Legend */}
        {calendarsData.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-1.5 border-b bg-background shrink-0 overflow-x-auto">
            {calendarsData.map(c => (
              <button
                key={c.id}
                className={`flex items-center gap-1.5 text-xs whitespace-nowrap transition-opacity ${filterCalendar !== "all" && filterCalendar !== c.id.toString() ? "opacity-40" : ""}`}
                onClick={() => setFilterCalendar(prev => prev === c.id.toString() ? "all" : c.id.toString())}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            {Object.entries(MEETING_TYPE_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {type === "in_person" ? "In Person" : type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
            ))}
          </div>
        )}

        {/* Empty State */}
        {isEmpty && !isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Calendars Yet</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Seed sample data to explore the calendar, or create your first appointment to get started.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                  {seedMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Seed Sample Data
                </Button>
                <Button variant="outline" onClick={() => { setNewApptDate(new Date()); setShowAddModal(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> New Appointment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* KPI Stats Bar */}
        {!isEmpty && !isLoading && appointmentsData.length > 0 && (
          <div className="flex items-center gap-6 px-4 py-2 border-b bg-muted/20 shrink-0 overflow-x-auto">
            {(() => {
              const all = appointmentsData as Appointment[];
              const total = all.length;
              const completed = all.filter(a => a.status === "completed").length;
              const noShow = all.filter(a => a.status === "no_show").length;
              const confirmed = all.filter(a => a.status === "confirmed" || a.status === "scheduled").length;
              const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;
              const showRate = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <>
                  <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                    <span className="font-semibold text-foreground">{total}</span>
                    <span className="text-muted-foreground">Total</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                    <span className="font-semibold text-green-600">{confirmed}</span>
                    <span className="text-muted-foreground">Confirmed</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                    <span className="font-semibold text-blue-600">{completed}</span>
                    <span className="text-muted-foreground">Completed ({showRate}%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                    <span className={`font-semibold ${noShowRate >= 20 ? "text-red-600" : noShowRate >= 10 ? "text-orange-500" : "text-muted-foreground"}`}>{noShow}</span>
                    <span className="text-muted-foreground">No-Shows</span>
                    {noShowRate > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        noShowRate >= 20 ? "bg-red-100 text-red-700" :
                        noShowRate >= 10 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{noShowRate}% rate</span>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Calendar Views */}
        {!isEmpty && !isLoading && (
          <>
            {view === "month" && (
              <MonthView
                year={currentDate.getFullYear()} month={currentDate.getMonth()}
                appointments={filteredAppts} calendars={calendarsData}
                onDayClick={handleDayClick} onApptClick={handleApptClick}
              />
            )}
            {view === "week" && (
              <WeekView
                date={currentDate} appointments={filteredAppts} calendars={calendarsData}
                onSlotClick={handleSlotClick} onApptClick={handleApptClick}
              />
            )}
            {view === "day" && (
              <DayView
                date={currentDate} appointments={filteredAppts} calendars={calendarsData}
                onSlotClick={handleSlotClick} onApptClick={handleApptClick}
              />
            )}
            {view === "agenda" && (
              <AgendaView appointments={filteredAppts} calendars={calendarsData} onApptClick={handleApptClick} />
            )}
          </>
        )}
      </div>

      {/* Appointment Detail Sheet */}
      <Sheet open={!!selectedAppt} onOpenChange={v => !v && setSelectedAppt(null)}>
        <SheetContent className="w-[400px] sm:w-[480px] p-0 flex flex-col">
          {selectedAppt && (
            <AppointmentDetail
              appt={selectedAppt}
              calendars={calendarsData}
              onClose={() => setSelectedAppt(null)}
              onEdit={() => { setEditAppt(selectedAppt); setSelectedAppt(null); }}
              onRefresh={() => refetchAppts()}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <AppointmentModal
          open={showAddModal}
          onClose={() => { setShowAddModal(false); setNewApptDate(null); }}
          initial={{ defaultDate: newApptDate ?? new Date() }}
          calendars={calendarsData}
          onSaved={() => refetchAppts()}
        />
      )}

      {/* Edit Appointment Modal */}
      {editAppt && (
        <AppointmentModal
          open={!!editAppt}
          onClose={() => setEditAppt(null)}
          initial={editAppt}
          calendars={calendarsData}
          onSaved={() => refetchAppts()}
        />
      )}

      {/* Google Calendar Sync Dialog */}
      <Dialog open={showGoogleSync} onOpenChange={setShowGoogleSync}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Calendar Sync
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {googleSyncStatus?.hasTokens ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Connected</p>
                    <p className="text-xs text-green-600">{(googleSyncStatus as any).connectedEmail}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">New confirmed appointments will automatically sync to your Google Calendar.</p>
                <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => disconnectGoogleMut.mutate()} disabled={disconnectGoogleMut.isPending}>
                  <Unlink className="w-3.5 h-3.5 mr-1.5" /> Disconnect Google Calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {!(googleSyncStatus as any)?.isConfigured && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm font-medium text-amber-800">API credentials required</p>
                    <p className="text-xs text-amber-600 mt-1">Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Settings → Secrets to enable Google Calendar sync.</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Connect your Google Calendar to automatically sync confirmed appointments. A one-time OAuth authorization is required.</p>
                <Button className="w-full" onClick={() => initiateGoogleMut.mutate({ origin: window.location.origin })} disabled={initiateGoogleMut.isPending || !(googleSyncStatus as any)?.isConfigured}>
                  {initiateGoogleMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Connect Google Calendar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Link Dialog */}
      <Dialog open={showBookingLink} onOpenChange={setShowBookingLink}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Public Booking Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Calendar</Label>
              <Select value={bookingLinkCalId?.toString() ?? ""} onValueChange={v => {
                const cal = (calendarsData as any[]).find(c => c.id === Number(v));
                setBookingLinkCalId(Number(v));
                setBookingSlug(cal?.slug || "");
              }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select calendar" /></SelectTrigger>
                <SelectContent>
                  {(calendarsData as any[]).map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Booking Link Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{window.location.origin}/book/</span>
                <Input
                  value={bookingSlug}
                  onChange={e => setBookingSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="my-calendar"
                  className="h-8 text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
            </div>
            {bookingSlug && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Your booking link:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 truncate">{window.location.origin}/book/{bookingSlug}</code>
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/book/${bookingSlug}`);
                    toast.success("Copied to clipboard!");
                  }}>
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowBookingLink(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!bookingLinkCalId || !bookingSlug) return;
              setSlugMut.mutate({ calendarId: bookingLinkCalId, slug: bookingSlug });
            }} disabled={setSlugMut.isPending || !bookingSlug}>
              {setSlugMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              Save Booking Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
