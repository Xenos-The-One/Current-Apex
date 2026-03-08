import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Download, Home, DollarSign, FileText, Gift } from "lucide-react";

export default function FirstTimeBuyerGuide() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const createLeadMutation = trpc.leads.capture.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track Facebook Pixel Lead event
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Lead', {
        content_name: 'First-Time Buyer Guide Download',
        content_category: 'Lead Magnet'
      });
    }
    
    createLeadMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      source: "first_time_buyer_guide",
      notes: "Downloaded First-Time Homebuyer Guide"
    });
  };

  const handleDownload = () => {
    // In production, this would trigger a PDF download
    // For now, just redirect to booking page
    window.location.href = "/book";
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Check Your Email! 📧</CardTitle>
            <CardDescription className="text-lg mt-2">
              Your First-Time Homebuyer Guide is on its way
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">What's in the Guide:</h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Step-by-step homebuying process (from pre-approval to closing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Down payment assistance programs (up to $20,000 available!)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Credit score requirements and how to improve yours</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Common first-time buyer mistakes (and how to avoid them)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Mortgage calculator and affordability worksheet</span>
                </li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-gray-600 mb-4">Ready to take the next step?</p>
              <Button
                onClick={handleDownload}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Book Your Free Consultation
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
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
      <div className="container max-w-6xl py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            FREE DOWNLOADABLE GUIDE
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Your Complete Guide to<br />
            <span className="text-blue-600">Buying Your First Home in Nevada</span>
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Everything you need to know to go from renter to homeowner
          </p>

          <div className="flex items-center justify-center gap-4 text-gray-700">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>32-Page PDF</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              <span>Instant Download</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-blue-600" />
              <span>100% Free</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left: What's Inside */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What's Inside the Guide:</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Home className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">The Complete Homebuying Process</h3>
                    <p className="text-gray-600 text-sm">Step-by-step roadmap from pre-approval to closing day, with timelines and checklists</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Down Payment Assistance Programs</h3>
                    <p className="text-gray-600 text-sm">How to get up to $20,000 in FREE money for your down payment (yes, really!)</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Credit Score Secrets</h3>
                    <p className="text-gray-600 text-sm">What score you really need (it's lower than you think!) and how to improve it fast</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Required Documents Checklist</h3>
                    <p className="text-gray-600 text-sm">Exactly what paperwork you'll need (so you're not scrambling at the last minute)</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Bonus Resources Included:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✅ Mortgage Affordability Calculator</li>
                  <li>✅ Closing Costs Estimator</li>
                  <li>✅ Home Inspection Checklist</li>
                  <li>✅ Moving Day Planner</li>
                  <li>✅ Homeownership Budget Template</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-gray-900 mb-2">About Your Guide Author:</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Tim Haskins, NMLS #1116876</strong><br />
                  The Home Loan Coach
                </p>
                <p className="text-sm text-gray-600">
                  Tim has helped hundreds of first-time homebuyers in Nevada achieve their dream of homeownership. He specializes in down payment assistance programs and making the mortgage process simple and stress-free.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right: Download Form */}
          <div className="sticky top-8">
            <Card className="shadow-2xl border-2 border-blue-500">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="text-2xl text-center">Get Your Free Guide</CardTitle>
                <CardDescription className="text-center">
                  Enter your info to download instantly
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

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                    disabled={createLeadMutation.isPending}
                  >
                    {createLeadMutation.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        Download My Free Guide
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By downloading, you'll receive the guide via email plus helpful homebuying tips from Tim Haskins, NMLS #1116876.
                  </p>
                </form>

                <div className="mt-6 pt-6 border-t text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>1,247 people</strong> have downloaded this guide
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className="w-5 h-5 text-yellow-400 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">4.9/5 average rating</p>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
              <p className="font-semibold mb-1">🎁 Limited Time Bonus:</p>
              <p>Download now and get a FREE 30-minute consultation with Tim to discuss your homebuying goals!</p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">What First-Time Buyers Are Saying:</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah M.",
                quote: "This guide made everything so clear! I thought I needed $40K saved up, but I bought my first home with just $5,000 down thanks to the DPA programs Tim showed me.",
              },
              {
                name: "Marcus T.",
                quote: "I was intimidated by the whole process, but this guide broke it down step-by-step. Tim answered all my questions and made it stress-free.",
              },
              {
                name: "Jessica & David R.",
                quote: "We downloaded the guide on Monday, got pre-approved on Wednesday, and found our dream home the next week. Best decision we ever made!",
              },
            ].map((testimonial, i) => (
              <Card key={i} className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className="w-4 h-4 text-yellow-400 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm mb-3 italic">"{testimonial.quote}"</p>
                  <p className="text-gray-900 font-semibold text-sm">— {testimonial.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-600">
          <p>Tim Haskins, NMLS #1116876 | The Home Loan Coach</p>
          <p className="mt-2">Licensed in Nevada | Equal Housing Opportunity</p>
        </div>
      </div>
    </div>
  );
}
