import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Calendar, Clock, Users, Award } from "lucide-react";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export default function WebinarRegistration() {
  const [registered, setRegistered] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    state: "",
    brokerage: "",
  });

  const registerMutation = trpc.campaignsOld.registerWebinar.useMutation({
    onSuccess: () => {
      setRegistered(true);
      toast.success("Registration Successful!", {
        description: "Check your email for webinar details and calendar invite.",
      });
    },
    onError: (error: any) => {
      toast.error("Registration Failed", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      ...formData,
      webinarId: "dpa-feb-19-2026",
      webinarTitle: "Down Payment Assistance Programs for Real Estate Agents",
      webinarDate: new Date("2026-02-19T18:00:00-08:00"),
    });
  };

  if (registered) {
    return (
      <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl">You're Registered!</CardTitle>
            <CardDescription className="text-lg mt-2">
              We've sent a confirmation email to {formData.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold">Wednesday, February 19th, 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold">6:00 PM Pacific Time</p>
                  <p className="text-sm text-gray-600">9:00 PM Eastern • 7:00 PM Mountain • 8:00 PM Central</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">What's Next?</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium">Check Your Email</p>
                    <p className="text-sm text-gray-600">You'll receive a confirmation with the webinar link and calendar invite.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium">Add to Calendar</p>
                    <p className="text-sm text-gray-600">Click the calendar link in your email to save the date.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium">Join on February 19th</p>
                    <p className="text-sm text-gray-600">We'll send you a reminder 24 hours before and 2 hours before the webinar.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-center text-gray-700">
                <strong>Can't make it live?</strong> No problem! All registrants will receive a recording within 24 hours.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Stop Losing Deals Over Down Payments
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Free Webinar for Real Estate Agents
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-gray-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">February 19th, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">6:00 PM PST</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">Live + Q&A</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Benefits */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What You'll Learn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Federal & State DPA Programs</p>
                    <p className="text-sm text-gray-600">Discover programs available nationwide and in your state</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Qualification Criteria</p>
                    <p className="text-sm text-gray-600">Learn which buyers qualify and how to pre-screen them</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Presentation Strategies</p>
                    <p className="text-sm text-gray-600">Master how to present DPA options to close more deals</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Real Success Stories</p>
                    <p className="text-sm text-gray-600">See how other agents are using these programs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About Your Host</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Tim Haskins</p>
                    <p className="text-sm text-gray-600 mb-2">Premier Mortgage Resources</p>
                    <p className="text-sm text-gray-700">
                      Licensed loan officer serving 49 states with expertise in down payment assistance programs,
                      first-time buyer loans, and creative financing solutions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Registration Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Register for Free</CardTitle>
                <CardDescription>
                  Limited seating available - reserve your spot now
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Select your state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brokerage">Brokerage Name (Optional)</Label>
                    <Input
                      id="brokerage"
                      value={formData.brokerage}
                      onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Registering..." : "Register Now - It's Free"}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    By registering, you'll receive webinar details and reminders via email.
                  </p>
                </form>
              </CardContent>
            </Card>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-center text-gray-700">
                <strong>Can't attend live?</strong> Register anyway and we'll send you the recording within 24 hours!
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is this really free?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Yes! This is a free educational webinar for real estate agents.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Will I receive a recording?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Yes, all registrants will receive a recording within 24 hours.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What if I can't attend live?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Register anyway and we'll send you the recording!</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is this specific to certain states?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We cover both federal programs (available nationwide) and state-specific programs across all 49 states we serve.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
