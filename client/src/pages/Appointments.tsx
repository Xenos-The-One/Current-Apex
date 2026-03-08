import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, Phone, Mail, MapPin, User, CheckCircle2, XCircle, AlertCircle, Sparkles, Loader2, ExternalLink, MessageSquare, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Appointments() {
  const [selectedStatus, setSelectedStatus] = useState<"all" | "scheduled" | "confirmed" | "completed" | "cancelled">("all");
  
  // Get all appointments for Premier Mortgage Resources
  const [dateRange] = useState(() => ({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  }));
  const { data: appointments, isLoading, refetch } = trpc.appointments.getAppointments.useQuery(dateRange);

  // Outreach modal state
  const [outreachModal, setOutreachModal] = useState<{ open: boolean; appointment: any | null }>({
    open: false,
    appointment: null,
  });
  const [outreachChannel, setOutreachChannel] = useState<"sms" | "email" | "both">("both");
  const [outreachMessage, setOutreachMessage] = useState("");

  // Status update mutation
  const updateStatus = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const updateStatusFn = (params: { appointmentId: number; status: string }) => {
    updateStatus.mutate({ appointmentId: params.appointmentId, status: params.status as any });
  };

  // Last-minute outreach mutation
  const sendOutreach = trpc.appointments.sendLastMinuteOutreach.useMutation({
    onSuccess: (data) => {
      const parts = [];
      if (data.results.sms) parts.push(`SMS: ${data.results.sms}`);
      if (data.results.email) parts.push(`Email: ${data.results.email}`);
      toast.success(`Outreach sent! ${parts.join(' | ')}`);
      setOutreachModal({ open: false, appointment: null });
      setOutreachMessage("");
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredAppointments = appointments?.filter(apt => 
    selectedStatus === "all" || apt.status === selectedStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "no_show": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed": return <CheckCircle2 className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      case "no_show": return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const stats = {
    total: appointments?.length || 0,
    scheduled: appointments?.filter((a: any) => a.status === "scheduled").length || 0,
    confirmed: appointments?.filter((a: any) => a.status === "confirmed").length || 0,
    completed: appointments?.filter((a: any) => a.status === "completed").length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header + Stats */}
        <div className="page-header">
          <div>
            <h1 className="text-lg font-semibold">Appointments</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage your consultation calendar</p>
          </div>
        </div>

        {/* Compact Stat Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Calendar, color: "text-muted-foreground" },
            { label: "Scheduled", value: stats.scheduled, icon: Clock, color: "text-blue-500" },
            { label: "Confirmed", value: stats.confirmed, icon: CheckCircle2, color: "text-green-500" },
            { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-gray-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card flex items-center gap-3">
              <Icon className={`h-5 w-5 shrink-0 ${color}`} />
              <div>
                <div className="text-xl font-bold leading-none">{value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b pb-0">
          {(["all", "scheduled", "confirmed", "completed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors capitalize ${
                selectedStatus === s
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Appointments Table */}
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{filteredAppointments?.length || 0} Appointment{filteredAppointments?.length !== 1 ? "s" : ""}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Loading appointments...</div>
            ) : filteredAppointments && filteredAppointments.length > 0 ? (
              <table className="w-full table-compact">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Name</th>
                    <th className="text-left hidden sm:table-cell">Date &amp; Time</th>
                    <th className="text-left hidden md:table-cell">Contact</th>
                    <th className="text-left">Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appointment: any) => (
                    <tr key={appointment.id}>
                      <td>
                        <div>
                          <p className="font-medium text-sm">{appointment.firstName} {appointment.lastName}</p>
                          {appointment.loanType && (
                            <p className="text-[10px] text-muted-foreground">{appointment.loanType}</p>
                          )}
                          {appointment.assignedTo === "loa" && (
                            <span className="text-[10px] text-purple-600">LOA</span>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <div>
                          <p className="text-xs font-medium">{new Date(appointment.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <p className="text-[11px] text-muted-foreground">{new Date(appointment.appointmentDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {appointment.duration}m</p>
                        </div>
                      </td>
                      <td className="hidden md:table-cell">
                        <div className="space-y-0.5">
                          {appointment.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />{appointment.phone}
                            </p>
                          )}
                          {appointment.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[160px]">{appointment.email}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          {appointment.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end">
                          {appointment.status === "scheduled" && (
                            <Button size="sm" className="h-7 px-2 text-xs"
                              onClick={() => updateStatusFn({ appointmentId: appointment.id, status: "confirmed" })}>
                              Confirm
                            </Button>
                          )}
                          {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                                onClick={() => updateStatusFn({ appointmentId: appointment.id, status: "completed" })}>
                                Done
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => { setOutreachModal({ open: true, appointment }); setOutreachChannel("both"); setOutreachMessage(""); }}>
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No appointments found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEO Publishing Scheduler */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
              Schedule SEO Content Around Appointments
            </CardTitle>
            <CardDescription>
              Auto-publish a blog post or landing page on a client's site before or after an appointment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeoPublishScheduler />
          </CardContent>
        </Card>
      </div>
      {/* Last-Minute Outreach Modal */}
      <Dialog open={outreachModal.open} onOpenChange={(open) => setOutreachModal({ open, appointment: outreachModal.appointment })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              Last-Minute Outreach
            </DialogTitle>
            <DialogDescription>
              Send a quick update to{" "}
              <strong>{outreachModal.appointment?.firstName} {outreachModal.appointment?.lastName}</strong>{" "}
              before their appointment on{" "}
              <strong>{outreachModal.appointment ? new Date(outreachModal.appointment.appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ""}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Send Via</Label>
              <Select value={outreachChannel} onValueChange={(v: any) => setOutreachChannel(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">SMS + Email</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={5}
                maxLength={500}
                placeholder="Hi [Name], just a quick reminder about your appointment today at [time]. Please bring your last 2 pay stubs and bank statements. Looking forward to speaking with you!"
                value={outreachMessage}
                onChange={(e) => setOutreachMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{outreachMessage.length}/500</p>
            </div>
            {/* Quick message templates */}
            <div>
              <Label className="text-xs text-muted-foreground">Quick Templates</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  "Reminder: bring your last 2 pay stubs, W-2s, and bank statements.",
                  "We're meeting via Zoom today — I'll send the link 15 min before.",
                  "Running 5 minutes behind — see you shortly!",
                  "Please confirm you're still able to make our appointment today.",
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    className="text-xs px-2 py-1 rounded border border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950 transition-colors text-left"
                    onClick={() => setOutreachMessage(tpl)}
                  >
                    {tpl.substring(0, 40)}…
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutreachModal({ open: false, appointment: null })}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!outreachMessage.trim() || sendOutreach.isPending}
              onClick={() => {
                if (!outreachModal.appointment) return;
                sendOutreach.mutate({
                  appointmentId: outreachModal.appointment.id,
                  channel: outreachChannel,
                  message: outreachMessage,
                });
              }}
            >
              {sendOutreach.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Outreach</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function SeoPublishScheduler() {
  const [contentId, setContentId] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [platform, setPlatform] = useState<"wordpress" | "webflow" | "shopify">("wordpress");
  const [siteUrl, setSiteUrl] = useState("");

  const schedulePublish = trpc.seoBridge.schedulePublishForAppointment.useMutation({
    onSuccess: () => { toast.success("Content scheduled for publishing!"); setContentId(""); setPublishDate(""); setSiteUrl(""); },
    onError: (err) => toast.error(err.message),
  });

  const { data: recentContent } = trpc.seo.content.list.useQuery({ page: 1, limit: 10, status: "approved" });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Approved SEO Content</Label>
          <Select value={contentId} onValueChange={setContentId}>
            <SelectTrigger><SelectValue placeholder="Select content to schedule" /></SelectTrigger>
            <SelectContent>
              {(recentContent?.content || []).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium">Publish Platform</Label>
          <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="wordpress">WordPress</SelectItem>
              <SelectItem value="webflow">Webflow</SelectItem>
              <SelectItem value="shopify">Shopify</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium">Site URL</Label>
          <Input placeholder="https://clientsite.com" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
        </div>
        <div>
          <Label className="text-sm font-medium">Publish Date &amp; Time</Label>
          <Input type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
        </div>
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          disabled={!contentId || !publishDate || !siteUrl || schedulePublish.isPending}
          onClick={() => schedulePublish.mutate({ contentId: parseInt(contentId), publishAt: new Date(publishDate).getTime(), platform, siteUrl })}
        >
          {schedulePublish.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scheduling...</> : <><Calendar className="w-4 h-4 mr-2" /> Schedule Publish</>}
        </Button>
      </div>
      <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg text-sm space-y-2">
        <p className="font-semibold text-purple-800 dark:text-purple-200">How it works</p>
        <ul className="space-y-1 text-muted-foreground text-xs list-disc list-inside">
          <li>Select an approved SEO article from the portal</li>
          <li>Choose the client's publishing platform</li>
          <li>Set a publish date (e.g., 1 day before the appointment)</li>
          <li>The content auto-publishes at the scheduled time</li>
        </ul>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <a href="/seo/scheduling" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3 mr-1" /> Full Scheduler in SEO Portal
          </a>
        </Button>
      </div>
    </div>
  );
}
