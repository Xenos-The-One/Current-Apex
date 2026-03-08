import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Calendar, Clock, Users, Video, Gift } from "lucide-react";


export default function WebinarLanding() {

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    state: "Nevada",
    brokerage: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const registerMutation = trpc.webinars.register.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: any) => {
      alert("Registration failed: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track Facebook Pixel CompleteRegistration event
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'CompleteRegistration', {
        content_name: 'DPA Webinar Registration',
        status: 'completed'
      });
    }
    
    registerMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      webinarDate: "2026-02-19",
      webinarTime: "18:00:00",
      webinarType: "first_time_homebuyer",
      source: "landing_page",
      origin: window.location.origin,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl">You're All Set! 🎉</CardTitle>
            <CardDescription className="text-lg mt-2">
              Your spot is reserved for the DPA Webinar on February 19th at 6:00 PM PST
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Check your email for the confirmation and calendar invite</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>We'll send you reminders 7 days, 3 days, 1 day, and 1 hour before</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>The Zoom link will be sent 1 hour before the webinar starts</span>
                </li>
              </ul>
            </div>

            <div className="text-center pt-4">
              <p className="text-gray-600 mb-4">See you on February 19th!</p>
              <p className="text-sm text-gray-500">
                Tim Haskins, NMLS #1116876<br />
                The Home Loan Coach
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="container max-w-6xl py-12">
        <div className="text-center mb-12">
          <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            FREE WEBINAR FOR REAL ESTATE AGENTS
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Help Your Buyers Get Up To<br />
            <span className="text-green-600">$20,000 in Down Payment Assistance</span>
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Learn the exact strategies to close more deals with DPA programs
          </p>

          {/* Date/Time Banner */}
          <div className="bg-white border-2 border-green-500 rounded-lg p-6 max-w-2xl mx-auto mb-8 shadow-lg">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-green-600" />
                <span className="font-semibold">February 19, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-green-600" />
                <span className="font-semibold">6:00 PM PST</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="w-6 h-6 text-green-600" />
                <span className="font-semibold">Live on Zoom</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left: Benefits */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Learn:</h2>
              <div className="space-y-4">
                {[
                  "The 3 most popular DPA programs in Nevada (and how to qualify your buyers)",
                  "How to get pre-approval letters in 24 hours (even for tricky situations)",
                  "Common mistakes that disqualify buyers—and how to avoid them",
                  "Step-by-step process to close deals with DPA (from application to closing)",
                  "Live Q&A: Get answers to your specific DPA questions"
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Bonus: Exclusive Resources
              </h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li>✅ DPA Program Comparison Cheat Sheet</li>
                <li>✅ Pre-Approval Checklist for Your Clients</li>
                <li>✅ Email Templates to Educate Buyers</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Your Host:</h3>
              <p className="text-gray-700 mb-2">
                <strong>Tim Haskins, NMLS #1116876</strong><br />
                The Home Loan Coach
              </p>
              <p className="text-sm text-gray-600">
                Tim has helped hundreds of real estate agents close more deals using down payment assistance programs. He specializes in making complex mortgage programs simple and accessible.
              </p>
            </div>
          </div>

          {/* Right: Registration Form */}
          <div className="sticky top-8">
            <Card className="shadow-xl border-2 border-green-500">
              <CardHeader className="bg-green-50">
                <CardTitle className="text-2xl text-center">Reserve Your Spot</CardTitle>
                <CardDescription className="text-center">
                  Limited to 100 agents - Register now!
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="brokerage">Brokerage (Optional)</Label>
                    <Input
                      id="brokerage"
                      value={formData.brokerage}
                      onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Registering..." : "Save My Spot - It's FREE!"}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By registering, you'll receive webinar reminders and mortgage tips from Tim Haskins.
                  </p>
                </form>
              </CardContent>
            </Card>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span className="text-sm">87 agents already registered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
