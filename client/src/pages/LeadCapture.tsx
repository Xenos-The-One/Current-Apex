import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Phone, Mail, Clock, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function LeadCapture() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    loanType: "Purchase",
    notes: "",
  });

  const createLead = trpc.leads.capture.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      // TODO: Trigger Vapi auto-call
    },
    onError: (error: any) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createLead.mutateAsync({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      source: "Facebook Ad",
      notes: `Loan Type: ${formData.loanType}${formData.notes ? ` | ${formData.notes}` : ""}`,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">Thank You, {formData.firstName}!</h1>
            
            <p className="text-lg text-gray-600 mb-6">
              We've received your information and we'll call you within the next 5 minutes to discuss your mortgage options.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-lg mb-4">What Happens Next?</h3>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">We'll Call You (Within 5 Minutes)</p>
                    <p className="text-sm text-gray-600">Our mortgage expert will reach out at {formData.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Quick Qualification</p>
                    <p className="text-sm text-gray-600">We'll ask a few questions to understand your needs</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Get Your Options</p>
                    <p className="text-sm text-gray-600">We'll present the best mortgage programs for your situation</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-900">
                <strong>Keep your phone handy!</strong> We'll be calling from a local number within the next few minutes.
              </p>
            </div>
            
            <Button
              size="lg"
              onClick={() => setLocation("/book")}
            >
              Or Schedule a Specific Time
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Value Proposition */}
          <div className="text-white">
            <h1 className="text-5xl font-bold mb-6">
              Get Pre-Approved in 15 Minutes
            </h1>
            
            <p className="text-xl mb-8 text-blue-100">
              Licensed in 49 states. Fast approvals. Competitive rates. Expert guidance from start to finish.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">We'll Call You in 5 Minutes</p>
                  <p className="text-sm text-blue-100">No waiting, no hassle</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">15-Minute Pre-Approval</p>
                  <p className="text-sm text-blue-100">Fast decisions, same-day letters</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Licensed in 49 States</p>
                  <p className="text-sm text-blue-100">Nationwide coverage (except NY)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <p className="text-sm text-blue-100 mb-2">Trusted by thousands of homebuyers</p>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white font-semibold">4.9/5</span>
                <span className="text-blue-100 text-sm">(2,847 reviews)</span>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <Card>
            <CardContent className="pt-8 pb-6">
              <h2 className="text-2xl font-bold mb-2">Get Started Now</h2>
              <p className="text-gray-600 mb-6">Fill out the form and we'll call you in 5 minutes</p>
              
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
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll call this number within 5 minutes</p>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="loanType">What are you looking for? *</Label>
                  <select
                    id="loanType"
                    required
                    value={formData.loanType}
                    onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Purchase">Buying a Home</option>
                    <option value="Refinance">Refinancing</option>
                    <option value="HELOC">Home Equity Line of Credit</option>
                    <option value="Cash-Out Refinance">Cash-Out Refinance</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="notes">Any questions or details?</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional - tell us more about your situation..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={createLead.isPending}
                  className="w-full"
                >
                  {createLead.isPending ? "Submitting..." : "Get My Free Consultation →"}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By submitting, you agree to receive calls and texts. No spam, ever.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
