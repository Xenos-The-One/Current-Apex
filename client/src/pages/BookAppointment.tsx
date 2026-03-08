import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function BookAppointment() {
  const [step, setStep] = useState<"date" | "time" | "details" | "success">("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<Date | undefined>();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Fetch available slots from server
  const { data: serverSlots = [], refetch: refetchSlots } = trpc.appointments.getAvailableSlots.useQuery(
    {
      agencyId: 1,
      date: selectedDate || new Date(),
    },
    {
      enabled: !!selectedDate, // Only fetch when a date is selected
    }
  );

  // Convert server slots to Date objects
  const availableSlots = useMemo(() => {
    if (!serverSlots || serverSlots.length === 0) return [];
    return serverSlots.map(slot => new Date(slot.time));
  }, [serverSlots]);

  const bookAppointment = trpc.appointments.bookAppointment.useMutation({
    onSuccess: async () => {
      // Refetch available slots to remove booked slot
      await refetchSlots();
      
      // Track Facebook Pixel CompleteRegistration event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'CompleteRegistration', {
          content_name: 'Strategy Call Booking',
          status: 'completed'
        });
      }
      
      toast.success("Appointment booked successfully! Check your email for confirmation.");
      setStep("success");
    },
    onError: (error) => {
      toast.error(`Failed to book appointment: ${error.message}`);
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setStep("time");
    }
  };

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time);
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTime) {
      toast.error("Please select a time");
      return;
    }

    await bookAppointment.mutateAsync({
      agencyId: 1,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      appointmentDate: selectedTime,
      notes: formData.notes || undefined,
      source: "Strategy Call Booking",
    });
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">Appointment Booked!</h1>
            
            <p className="text-lg text-muted-foreground mb-6">
              Thank you, {formData.firstName}! Your appointment has been confirmed.
            </p>
            
            <div className="bg-primary/5 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-lg mb-4">Appointment Details:</h3>
              <div className="space-y-2">
                <p><strong>Date:</strong> {selectedTime?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time:</strong> {selectedTime?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                <p><strong>Duration:</strong> 30 minutes</p>
                <p><strong>Type:</strong> Phone/Video Call</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-900 dark:text-yellow-200">
                <strong>Check your email!</strong> We've sent you a confirmation with a calendar invite. 
                We'll call you at {formData.phone} at the scheduled time.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-left">What to prepare for your call:</h4>
              <ul className="text-sm text-muted-foreground text-left space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Your current income and employment information</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Credit score (approximate is fine)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Down payment amount you have available</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Any questions about mortgage programs</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "date") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select a Date
            </CardTitle>
            <CardDescription>Choose your preferred appointment date</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "time") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Select a Time
            </CardTitle>
            <CardDescription>
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot.getTime()}
                  variant={selectedTime?.getTime() === slot.getTime() ? "default" : "outline"}
                  onClick={() => handleTimeSelect(slot)}
                  className="text-sm"
                >
                  {slot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Button>
              ))}
            </div>
            {availableSlots.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No available slots for this date</p>
            )}
            <Button
              variant="ghost"
              onClick={() => setStep("date")}
              className="mt-4 w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Date Selection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Details step
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
          <CardDescription>
            {selectedTime?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Tell us about your mortgage needs..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("time")}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={bookAppointment.isPending}
                className="flex-1"
              >
                {bookAppointment.isPending ? "Booking..." : "Confirm Appointment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
