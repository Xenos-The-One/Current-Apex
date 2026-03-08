import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Calculator, Phone } from "lucide-react";
import { useLocation } from "wouter";

export default function RefinanceCalculator() {
  const [, setLocation] = useLocation();
  const [currentLoan, setCurrentLoan] = useState({
    balance: "300000",
    rate: "6.5",
    payment: "2400"
  });
  const [newLoan, setNewLoan] = useState({
    rate: "5.25"
  });
  const [contactInfo, setContactInfo] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [showResults, setShowResults] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  const createLeadMutation = trpc.leads.capture.useMutation({
    onSuccess: () => {
      setLocation("/book");
    },
  });

  const calculateSavings = () => {
    const balance = parseFloat(currentLoan.balance);
    const currentRate = parseFloat(currentLoan.rate) / 100 / 12;
    const newRate = parseFloat(newLoan.rate) / 100 / 12;
    const months = 360; // 30 years

    // Calculate current payment if not provided
    let currentPayment = parseFloat(currentLoan.payment);
    if (!currentPayment) {
      currentPayment = (balance * currentRate * Math.pow(1 + currentRate, months)) / (Math.pow(1 + currentRate, months) - 1);
    }

    // Calculate new payment
    const newPayment = (balance * newRate * Math.pow(1 + newRate, months)) / (Math.pow(1 + newRate, months) - 1);

    const monthlySavings = currentPayment - newPayment;
    const yearlySavings = monthlySavings * 12;
    const lifetimeSavings = monthlySavings * months;

    return {
      currentPayment: Math.round(currentPayment),
      newPayment: Math.round(newPayment),
      monthlySavings: Math.round(monthlySavings),
      yearlySavings: Math.round(yearlySavings),
      lifetimeSavings: Math.round(lifetimeSavings)
    };
  };

  const handleCalculate = () => {
    setShowResults(true);
  };

  const handleGetStarted = () => {
    setShowContactForm(true);
  };

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track Facebook Pixel Lead event
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Lead', {
        content_name: 'Refinance Calculator Lead',
        value: savings?.lifetimeSavings || 0,
        currency: 'USD'
      });
    }
    
    createLeadMutation.mutate({
      firstName: contactInfo.name.split(" ")[0] || contactInfo.name,
      lastName: contactInfo.name.split(" ").slice(1).join(" ") || "",
      email: contactInfo.email,
      phone: contactInfo.phone,
      source: "refinance_calculator",
      notes: `Refinance Calculator - Current: ${currentLoan.balance} @ ${currentLoan.rate}%, New: ${newLoan.rate}%`
    });
  };

  const savings = showResults ? calculateSavings() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container max-w-6xl py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            FREE REFINANCE CALCULATOR
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Could You Save Money<br />
            <span className="text-green-600">By Refinancing Your Mortgage?</span>
          </h1>
          <p className="text-xl text-gray-600">
            Find out in 60 seconds with our free calculator
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Calculator */}
          <div>
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-green-600" />
                  Refinance Savings Calculator
                </CardTitle>
                <CardDescription>
                  Enter your current mortgage details
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Current Loan */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Your Current Mortgage</h3>
                  
                  <div>
                    <Label htmlFor="balance">Current Loan Balance</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="balance"
                        type="number"
                        className="pl-9"
                        value={currentLoan.balance}
                        onChange={(e) => setCurrentLoan({ ...currentLoan, balance: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="currentRate">Current Interest Rate (%)</Label>
                    <Input
                      id="currentRate"
                      type="number"
                      step="0.01"
                      value={currentLoan.rate}
                      onChange={(e) => setCurrentLoan({ ...currentLoan, rate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="currentPayment">Current Monthly Payment (Optional)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="currentPayment"
                        type="number"
                        className="pl-9"
                        placeholder="We'll calculate if left blank"
                        value={currentLoan.payment}
                        onChange={(e) => setCurrentLoan({ ...currentLoan, payment: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* New Loan */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-gray-900">Potential New Rate</h3>
                  
                  <div>
                    <Label htmlFor="newRate">New Interest Rate (%)</Label>
                    <Input
                      id="newRate"
                      type="number"
                      step="0.01"
                      value={newLoan.rate}
                      onChange={(e) => setNewLoan({ ...newLoan, rate: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Current rates: 5.25% - 6.00% (depending on credit)
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleCalculate}
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                >
                  Calculate My Savings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Results or Info */}
          <div className="space-y-6">
            {!showResults ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Why Refinance?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold">Lower Your Monthly Payment</p>
                        <p className="text-sm text-gray-600">Reduce your interest rate and save hundreds per month</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold">Tap Into Your Home Equity</p>
                        <p className="text-sm text-gray-600">Get cash for home improvements, debt consolidation, or other needs</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calculator className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold">Shorten Your Loan Term</p>
                        <p className="text-sm text-gray-600">Pay off your mortgage faster and save on interest</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <p className="text-sm text-blue-900">
                      <strong>Did you know?</strong> Even a 0.5% rate reduction can save you thousands of dollars over the life of your loan!
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : !showContactForm ? (
              <>
                <Card className="shadow-xl border-2 border-green-500">
                  <CardHeader className="bg-green-50">
                    <CardTitle className="text-2xl text-green-900">Your Potential Savings</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Current Payment</p>
                        <p className="text-2xl font-bold text-gray-900">${savings?.currentPayment.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">New Payment</p>
                        <p className="text-2xl font-bold text-green-600">${savings?.newPayment.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="text-center p-6 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg">
                      <p className="text-sm text-gray-700 mb-1">Monthly Savings</p>
                      <p className="text-4xl font-bold text-green-600">${savings?.monthlySavings.toLocaleString()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Yearly Savings</p>
                        <p className="text-xl font-bold text-gray-900">${savings?.yearlySavings.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Lifetime Savings</p>
                        <p className="text-xl font-bold text-gray-900">${savings?.lifetimeSavings.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-4 text-center">
                        Want to see if you qualify for these savings?
                      </p>
                      <Button
                        onClick={handleGetStarted}
                        className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                      >
                        Get My Free Consultation
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6 text-sm text-blue-900">
                    <p className="mb-2"><strong>Important:</strong> This is an estimate based on the information you provided.</p>
                    <p>Actual rates and savings depend on your credit score, loan-to-value ratio, and other factors. Let's talk to get you an exact quote!</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="shadow-xl border-2 border-green-500">
                <CardHeader className="bg-green-50">
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-6 h-6 text-green-600" />
                    Get Your Free Consultation
                  </CardTitle>
                  <CardDescription>
                    Let's discuss your refinance options
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmitContact} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        required
                        value={contactInfo.name}
                        onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                      disabled={createLeadMutation.isPending}
                    >
                      {createLeadMutation.isPending ? "Submitting..." : "Book My Free Consultation"}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      By submitting, you'll be directed to schedule a free 30-minute consultation with Tim Haskins, NMLS #1116876.
                    </p>
                  </form>
                </CardContent>
              </Card>
            )}
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
