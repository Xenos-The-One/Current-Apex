import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Home, DollarSign, Clock, Shield } from 'lucide-react';


export default function MortgageLanding() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    loanAmount: '',
    propertyType: 'purchase',
    timeframe: '0-3 months'
  });
  const [submitted, setSubmitted] = useState(false);

  const createLead = trpc.leads.capture.useMutation({
    onSuccess: () => {
      // Track Facebook Pixel Lead event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: 'Mortgage Pre-Approval',
          content_category: 'Lead Generation',
          value: formData.loanAmount,
          currency: 'USD'
        });
      }
      // Redirect to booking page instead of showing success message
      setLocation('/book');
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      source: 'Facebook Lead Ad',
      notes: `Loan Amount: ${formData.loanAmount}, Property Type: ${formData.propertyType}, Timeframe: ${formData.timeframe}`,
    });
  };

  // Remove success screen - we redirect to /book instead

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get Pre-Approved in 24 Hours
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Unlock your dream home with fast, hassle-free mortgage pre-approval from Premier Mortgage Resources
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
          <Card className="p-6 text-center">
            <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">24-Hour Approval</h3>
            <p className="text-sm text-muted-foreground">Get your pre-approval letter in as little as 24 hours</p>
          </Card>
          
          <Card className="p-6 text-center">
            <DollarSign className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Low Rates</h3>
            <p className="text-sm text-muted-foreground">Competitive rates across all 50 states</p>
          </Card>
          
          <Card className="p-6 text-center">
            <Shield className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Licensed in 49 States</h3>
            <p className="text-sm text-muted-foreground">Serving Nevada, California, Georgia, and 46 more states</p>
          </Card>
          
          <Card className="p-6 text-center">
            <Home className="w-12 h-12 text-orange-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">First-Time Buyers Welcome</h3>
            <p className="text-sm text-muted-foreground">Special programs for first-time homebuyers</p>
          </Card>
        </div>

        {/* Lead Capture Form */}
        <Card className="max-w-2xl mx-auto p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Start Your Pre-Approval Now</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
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
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                required
                placeholder="(702) 555-1234"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="loanAmount">Estimated Loan Amount *</Label>
              <select
                id="loanAmount"
                required
                className="w-full px-3 py-2 border border-input rounded-md"
                value={formData.loanAmount}
                onChange={(e) => setFormData({ ...formData, loanAmount: e.target.value })}
              >
                <option value="">Select amount...</option>
                <option value="Under $200k">Under $200,000</option>
                <option value="$200k - $400k">$200,000 - $400,000</option>
                <option value="$400k - $600k">$400,000 - $600,000</option>
                <option value="$600k - $800k">$600,000 - $800,000</option>
                <option value="Over $800k">Over $800,000</option>
              </select>
            </div>

            <div>
              <Label htmlFor="propertyType">Property Type *</Label>
              <select
                id="propertyType"
                required
                className="w-full px-3 py-2 border border-input rounded-md"
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
              >
                <option value="purchase">Purchase</option>
                <option value="refinance">Refinance</option>
                <option value="cash-out">Cash-Out Refinance</option>
              </select>
            </div>

            <div>
              <Label htmlFor="timeframe">When are you looking to buy? *</Label>
              <select
                id="timeframe"
                required
                className="w-full px-3 py-2 border border-input rounded-md"
                value={formData.timeframe}
                onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
              >
                <option value="0-3 months">0-3 months</option>
                <option value="3-6 months">3-6 months</option>
                <option value="6-12 months">6-12 months</option>
                <option value="Just exploring">Just exploring</option>
              </select>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createLead.isPending}
            >
              {createLead.isPending ? 'Submitting...' : 'Get My Pre-Approval'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By submitting, you agree to receive calls and texts from Premier Mortgage Resources.
              Our AI assistant will call you within 60 seconds.
            </p>
          </form>
        </Card>

        {/* Trust Indicators */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
            ⭐⭐⭐⭐⭐ Rated 4.9/5 by over 500 happy homeowners
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div>🏆 Licensed in 49 States</div>
            <div>🔒 Secure & Confidential</div>
            <div>💰 No Obligation</div>
            <div>⚡ 60-Second Response</div>
          </div>
          <div className="mt-6 text-xs text-gray-500">
            <p>Premier Mortgage Resources</p>
            <p>Tim Haskins - NMLS #1116876 | GA-1116876</p>
            <p>Licensed in 49 States</p>
          </div>
        </div>
      </div>
    </div>
  );
}
