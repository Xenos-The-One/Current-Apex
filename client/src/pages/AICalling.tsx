import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  ChevronRight,
  Clock,
  FileText,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  Play,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const OUTCOME_COLORS: Record<string, string> = {
  answered: "bg-green-100 text-green-700",
  no_answer: "bg-gray-100 text-gray-600",
  voicemail: "bg-blue-100 text-blue-700",
  busy: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  callback_requested: "bg-purple-100 text-purple-700",
  appointment_booked: "bg-teal-100 text-teal-700",
};

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "answered" || outcome === "appointment_booked") return <PhoneCall className="w-4 h-4 text-green-600" />;
  if (outcome === "no_answer") return <PhoneMissed className="w-4 h-4 text-gray-500" />;
  if (outcome === "failed") return <PhoneOff className="w-4 h-4 text-red-500" />;
  return <Phone className="w-4 h-4 text-blue-500" />;
}

function InitiateCallDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leadId: "", phoneNumber: "", assistantId: "", objective: "" });

  const callMutation = trpc.vapi.makeCall.useMutation({
    onSuccess: () => { toast.success("Call initiated via Vapi"); setOpen(false); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Bot className="w-4 h-4" /> Initiate AI Call</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Initiate AI Call via Vapi</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-700 font-medium">Vapi Integration Required</p>
            <p className="text-xs text-blue-600 mt-0.5">Configure your Vapi API key and assistant ID in Settings to enable AI calling.</p>
          </div>
          <div className="space-y-1"><Label>Lead ID</Label><Input type="number" value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))} placeholder="Lead ID to call" /></div>
          <div className="space-y-1"><Label>Phone Number</Label><Input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+1 555-0100" /></div>
          <div className="space-y-1"><Label>Vapi Assistant ID</Label><Input value={form.assistantId} onChange={e => setForm(f => ({ ...f, assistantId: e.target.value }))} placeholder="asst_..." /></div>
          <div className="space-y-1"><Label>Call Objective</Label><Textarea value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} rows={2} placeholder="Schedule a mortgage consultation..." /></div>
          <Button
            className="w-full"
            disabled={callMutation.isPending || !form.phoneNumber}
            onClick={() => callMutation.mutate({
              agencyId,
              leadId: form.leadId ? parseInt(form.leadId) : undefined,
              toNumber: form.phoneNumber,
            })}
          >
            {callMutation.isPending ? "Initiating..." : "Start AI Call"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CallDetailDialog({ call }: { call: any }) {
  const [open, setOpen] = useState(false);
  const duration = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <FileText className="w-3 h-3" /> Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Call Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium">{duration}</span></div>
            <div><span className="text-muted-foreground">Outcome:</span> <span className="font-medium capitalize">{call.outcome?.replace(/_/g, " ")}</span></div>
            <div><span className="text-muted-foreground">Score:</span> <span className="font-medium">{call.sentimentScore ?? "—"}/10</span></div>
          </div>

          {call.summary && (
            <div>
              <h3 className="text-sm font-semibold mb-1">Call Summary</h3>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{call.summary}</p>
            </div>
          )}

          {call.transcript && (
            <div>
              <h3 className="text-sm font-semibold mb-1">Transcript</h3>
              <div className="bg-muted/30 rounded-lg p-3 max-h-64 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">{call.transcript}</pre>
              </div>
            </div>
          )}

          {call.recordingUrl && (
            <div>
              <h3 className="text-sm font-semibold mb-1">Recording</h3>
              <audio controls className="w-full" src={call.recordingUrl} />
            </div>
          )}

          {call.nextAction && (
            <div>
              <h3 className="text-sm font-semibold mb-1">Recommended Next Action</h3>
              <p className="text-sm text-muted-foreground">{call.nextAction}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AICalling() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;

  const { data: callLogs, refetch } = trpc.vapi.listCalls.useQuery({ agencyId, limit: 50 });

  const stats = {
    total: callLogs?.length ?? 0,
    answered: callLogs?.filter((c: any) => c.outcome === "answered" || c.outcome === "appointment_booked").length ?? 0,
    avgDuration: callLogs?.length ? Math.round(callLogs.reduce((s: number, c: any) => s + (c.duration || 0), 0) / callLogs.length) : 0,
    appointments: callLogs?.filter((c: any) => c.outcome === "appointment_booked").length ?? 0,
  };

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-4 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">AI Calling</h1>
            <p className="text-muted-foreground text-sm">Vapi-powered AI calls with transcripts and recordings</p>
          </div>
          <InitiateCallDialog agencyId={agencyId} onSuccess={refetch} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Calls", value: stats.total, icon: Phone },
            { label: "Answered", value: stats.answered, icon: PhoneCall },
            { label: "Avg Duration", value: `${Math.floor(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s`, icon: Clock },
            { label: "Appointments Booked", value: stats.appointments, icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold font-display mt-0.5">{value}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call log table */}
        <Card>
          <CardHeader><CardTitle className="text-base">Call History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {callLogs?.length ? (
              <div className="divide-y divide-border">
                {callLogs.map((call: any) => {
                  const duration = call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "—";
                  return (
                    <div key={call.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <OutcomeIcon outcome={call.outcome} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{call.phoneNumber || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(call.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">{duration}</p>
                          {call.sentimentScore && (
                            <div className="flex items-center gap-0.5 justify-end">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs">{call.sentimentScore}/10</span>
                            </div>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_COLORS[call.outcome] || "bg-gray-100 text-gray-600"}`}>
                          {call.outcome?.replace(/_/g, " ")}
                        </span>
                        <CallDetailDialog call={call} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Bot className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No calls yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Initiate your first AI call to start building call history</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
