import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Home,
  Shield,
  Star,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

type Step = "date" | "time" | "details" | "success";

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<Date | undefined>();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    loanType: "",
    notes: "",
  });

  // Fetch booking page info
  const { data: page, isLoading: pageLoading, error: pageError } = trpc.publicFeatures.getBookingPage.useQuery(
    { slug: slug || "" },
    { enabled: !!slug, retry: false }
  );

  // Fetch available slots
  const { data: serverSlots = [], refetch: refetchSlots } = trpc.appointments.getAvailableSlots.useQuery(
    { agencyId: page?.agencyId || 1, date: selectedDate || new Date() },
    { enabled: !!selectedDate && !!page }
  );

  const availableSlots = useMemo(() => {
    if (!serverSlots || serverSlots.length === 0) return [];
    return serverSlots.map((slot: any) => new Date(slot.time));
  }, [serverSlots]);

  const bookMutation = trpc.appointments.bookAppointment.useMutation({
    onSuccess: async () => {
      await refetchSlots();
      setStep("success");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to book appointment. Please try again.");
    },
  });

  const handleBook = () => {
    if (!selectedTime || !page) return;
    bookMutation.mutate({
      agencyId: page.agencyId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      appointmentDate: selectedTime,
      loanType: formData.loanType || undefined,
      notes: formData.notes || undefined,
      source: `booking_page_${slug}`,
    });
  };

  const isDetailsValid = formData.firstName && formData.lastName && formData.email && formData.phone;

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-200">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (pageError || !page) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 border-white/20 text-white text-center">
          <CardContent className="pt-10 pb-8">
            <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold mb-2">Page Not Found</h2>
            <p className="text-blue-200 text-sm">This booking page doesn't exist or is no longer available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 border-white/20 text-white text-center">
          <CardContent className="pt-10 pb-8">
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're Booked!</h2>
            <p className="text-blue-200 mb-4">
              Your consultation with <span className="text-white font-semibold">{page.name}</span> is confirmed.
            </p>
            {selectedTime && (
              <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-blue-300" />
                  <span className="text-sm text-blue-200">
                    {selectedTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-300" />
                  <span className="text-sm text-blue-200">
                    {selectedTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            )}
            <p className="text-xs text-blue-300">A confirmation email with calendar invite has been sent to {formData.email}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{page.name}</p>
              <p className="text-blue-300 text-xs capitalize">{page.businessType.replace("_", " ")}</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
            Free Consultation
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">{page.bookingTitle}</h1>
          <p className="text-blue-200 max-w-xl mx-auto">{page.bookingDescription}</p>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {["Free 30-Min Consultation", "No Obligation", "Expert Guidance", "Fast Pre-Approval"].map(badge => (
            <div key={badge} className="flex items-center gap-1.5 text-xs text-blue-200">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              {badge}
            </div>
          ))}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["date", "time", "details"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s ? "bg-blue-500 text-white" :
                (["date", "time", "details"].indexOf(step) > i) ? "bg-emerald-500 text-white" :
                "bg-white/10 text-blue-300"
              }`}>
                {(["date", "time", "details"].indexOf(step) > i) ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${step === s ? "text-white" : "text-blue-400"}`}>
                {s === "date" ? "Pick a Date" : s === "time" ? "Choose Time" : "Your Info"}
              </span>
              {i < 2 && <div className="w-8 h-px bg-white/20" />}
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Step 1: Date */}
          {step === "date" && (
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-400" />
                  Select a Date
                </CardTitle>
                <CardDescription className="text-blue-300">Choose your preferred consultation date</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const day = date.getDay();
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    return isPast || day === 0 || day === 6;
                  }}
                  className="rounded-xl bg-white/5 border-white/10 text-white"
                />
              </CardContent>
              <div className="px-6 pb-6">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!selectedDate}
                  onClick={() => setStep("time")}
                >
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Time */}
          {step === "time" && (
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Select a Time
                </CardTitle>
                <CardDescription className="text-blue-300">
                  {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-blue-300">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No available slots for this date. Please select another day.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.toISOString()}
                        onClick={() => setSelectedTime(slot)}
                        className={`p-3 rounded-lg text-sm font-medium transition-all ${
                          selectedTime?.toISOString() === slot.toISOString()
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 text-blue-200 hover:bg-white/20"
                        }`}
                      >
                        {slot.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
              <div className="px-6 pb-6 flex gap-3">
                <Button variant="outline" className="flex-1 border-white/20 text-blue-200 hover:bg-white/10" onClick={() => setStep("date")}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!selectedTime}
                  onClick={() => setStep("details")}
                >
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Details */}
          {step === "details" && (
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-400" />
                  Your Information
                </CardTitle>
                <CardDescription className="text-blue-300">
                  {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at{" "}
                  {selectedTime?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-blue-200 text-sm">First Name *</Label>
                    <Input
                      value={formData.firstName}
                      onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                      placeholder="John"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-blue-200 text-sm">Last Name *</Label>
                    <Input
                      value={formData.lastName}
                      onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                      placeholder="Smith"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-400"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-blue-200 text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="john@example.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-blue-200 text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone *</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(555) 000-0000"
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-blue-200 text-sm">Loan Type (optional)</Label>
                  <Select value={formData.loanType} onValueChange={v => setFormData(p => ({ ...p, loanType: v }))}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select loan type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Home Purchase</SelectItem>
                      <SelectItem value="refinance">Refinance</SelectItem>
                      <SelectItem value="heloc">HELOC</SelectItem>
                      <SelectItem value="reverse_mortgage">Reverse Mortgage</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="other">Other / Not Sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-blue-200 text-sm">Notes (optional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Any questions or details you'd like to share beforehand..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-400 resize-none"
                    rows={3}
                  />
                </div>
              </CardContent>
              <div className="px-6 pb-6 flex gap-3">
                <Button variant="outline" className="flex-1 border-white/20 text-blue-200 hover:bg-white/10" onClick={() => setStep("time")}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!isDetailsValid || bookMutation.isPending}
                  onClick={handleBook}
                >
                  {bookMutation.isPending ? (
                    <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Booking...</>
                  ) : (
                    <>Confirm Booking <CheckCircle2 className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-blue-400 text-xs mt-8">
          Powered by Indigo Labs AI · Your information is secure and never shared
        </p>
      </div>
    </div>
  );
}
