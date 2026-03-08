import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Upload, TrendingUp, Users, Zap, RefreshCw } from 'lucide-react';

export default function PartnerProgram() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    brokerage: '',
    licenseNumber: '',
    state: '',
    yearsExperience: '',
    estimatedOldLeads: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const createPartner = trpc.leads.capture.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPartner.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      source: 'Datacrawl Partner Program',
      status: 'new',
      notes: `Brokerage: ${formData.brokerage}, License: ${formData.licenseNumber}, State: ${formData.state}, Experience: ${formData.yearsExperience} years, Est. Old Leads: ${formData.estimatedOldLeads}`,
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Welcome to the Partnership!</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Thank you for joining Premier Mortgage Resources' Lead Nurturing Partnership.
          </p>
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h2 className="font-semibold text-lg mb-3">What Happens Next:</h2>
            <div className="text-left space-y-2">
              <p>✅ Check your email for upload instructions (arrives within 5 minutes)</p>
              <p>✅ Upload your old lead list (CSV or Excel)</p>
              <p>✅ We'll start nurturing them within 48 hours</p>
              <p>✅ Hot leads get referred BACK to you</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Questions? Call/text Tim at (702) 555-LOAN or email tim@premiermortgageresources.com
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Turn Your Dead Leads Into Closings
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Send us your old leads → We nurture them with AI → Hot ones get referred back to YOU
          </p>
          <p className="text-2xl font-semibold text-purple-600">100% Free. You Close the Deal, We Handle the Mortgage.</p>
        </div>

        {/* Stats Banner */}
        <div className="max-w-5xl mx-auto mb-12">
          <Card className="p-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">20-30%</div>
                <div className="text-sm opacity-90">of "dead" leads are ready to buy NOW</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">$0</div>
                <div className="text-sm opacity-90">Cost to you (we do all the work)</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">2-3x</div>
                <div className="text-sm opacity-90">ROI on leads you already paid for</div>
              </div>
            </div>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="max-w-4xl mx-auto p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">How the Partnership Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">1. Upload Old Leads</h3>
              <p className="text-sm text-muted-foreground">Send us leads that didn't buy 6-12 months ago</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">2. We Nurture Them</h3>
              <p className="text-sm text-muted-foreground">AI-powered email, SMS, and voice calls</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">3. Hot Leads Referred Back</h3>
              <p className="text-sm text-muted-foreground">We send you the ones ready to buy</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">4. You Close the Deal</h3>
              <p className="text-sm text-muted-foreground">You get the commission, we get the mortgage</p>
            </div>
          </div>
        </Card>

        {/* Case Study */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="p-8 bg-green-50 border-green-200">
            <h2 className="text-2xl font-bold mb-4 text-center">Real Results</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-3">Agent: Sarah M., Keller Williams Las Vegas</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Old Leads Uploaded:</strong> 200 (from 2023-2024)</p>
                  <p><strong>Campaign Duration:</strong> 30 days</p>
                  <p><strong>Email Opens:</strong> 47</p>
                  <p><strong>Phone Conversations:</strong> 12</p>
                  <p><strong>Hot Leads Referred Back:</strong> 3</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-green-700">Results:</h3>
                <div className="space-y-2 text-sm">
                  <p>✅ 2 under contract</p>
                  <p>✅ 1 pre-approved and actively looking</p>
                  <p>✅ Estimated commission: $12,000-$18,000</p>
                  <p>✅ Cost to Sarah: $0</p>
                  <p className="text-lg font-semibold text-green-700 mt-4">2-3 closings from leads collecting dust</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* What You Get */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">What You Get (100% Free)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">AI-Powered Lead Nurturing</h3>
                <p className="text-sm text-muted-foreground">Personalized emails, SMS, and voice calls automatically</p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Hot Leads Referred Back to You</h3>
                <p className="text-sm text-muted-foreground">We only send you the ones ready to buy</p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Down Payment Assistance Education</h3>
                <p className="text-sm text-muted-foreground">We educate leads on DPA programs (up to $10,000 available)</p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">24-Hour Pre-Approvals</h3>
                <p className="text-sm text-muted-foreground">Your referred leads get pre-approved fast</p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Weekly Engagement Reports</h3>
                <p className="text-sm text-muted-foreground">See who's opening emails, answering calls, and getting hot</p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Zero Risk, Zero Cost</h3>
                <p className="text-sm text-muted-foreground">You already paid for these leads—now they actually convert</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Signup Form */}
        <Card className="max-w-2xl mx-auto p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Join the Partnership Program</h2>
          <p className="text-center text-muted-foreground mb-6">
            Limited to 20 agent partners per month to ensure quality nurturing
          </p>
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
              <Label htmlFor="brokerage">Brokerage *</Label>
              <Input
                id="brokerage"
                required
                placeholder="Keller Williams, RE/MAX, etc."
                value={formData.brokerage}
                onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="licenseNumber">Real Estate License # *</Label>
                <Input
                  id="licenseNumber"
                  required
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <select
                  id="state"
                  required
                  className="w-full px-3 py-2 border border-input rounded-md"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                >
                  <option value="">Select state...</option>
                  <option value="NV">Nevada</option>
                  <option value="CA">California</option>
                  <option value="GA">Georgia</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yearsExperience">Years of Experience *</Label>
                <select
                  id="yearsExperience"
                  required
                  className="w-full px-3 py-2 border border-input rounded-md"
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>
              <div>
                <Label htmlFor="estimatedOldLeads">Estimated Old Leads *</Label>
                <select
                  id="estimatedOldLeads"
                  required
                  className="w-full px-3 py-2 border border-input rounded-md"
                  value={formData.estimatedOldLeads}
                  onChange={(e) => setFormData({ ...formData, estimatedOldLeads: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="0-50">0-50 leads</option>
                  <option value="50-100">50-100 leads</option>
                  <option value="100-200">100-200 leads</option>
                  <option value="200-500">200-500 leads</option>
                  <option value="500+">500+ leads</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createPartner.isPending}
            >
              {createPartner.isPending ? 'Submitting...' : 'Join the Partnership Program'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By submitting, you agree to receive communications from Premier Mortgage Resources.
              No fees, no contracts, no obligations—cancel anytime.
            </p>
          </form>
        </Card>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Is there a cost to join?</h3>
              <p className="text-sm text-muted-foreground">No. It's completely free. No fees, no contracts, no obligations.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What if my old leads don't want to hear from me?</h3>
              <p className="text-sm text-muted-foreground">The outreach comes from Premier Mortgage Resources, not your brokerage. We position it as educational (down payment assistance programs, market updates) so it's not salesy.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">How do I upload my old leads?</h3>
              <p className="text-sm text-muted-foreground">After you sign up, we'll send you upload instructions. Just send us a CSV or Excel file with First Name, Last Name, Email, and Phone Number.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What happens when a lead is hot?</h3>
              <p className="text-sm text-muted-foreground">We call or email you immediately and refer the lead back to you. You take it from there and close the deal.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">What if the lead doesn't close with you?</h3>
              <p className="text-sm text-muted-foreground">That's okay—we're building a long-term partnership, not a transactional relationship. We'll keep nurturing the other leads and send you the next hot ones.</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Can I upload leads from any state?</h3>
              <p className="text-sm text-muted-foreground">Yes! We're licensed in 49 states, so we can nurture leads almost anywhere in the country.</p>
            </Card>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
            ⭐⭐⭐⭐⭐ Trusted by 20+ real estate agents across Nevada, California, and Georgia
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div>🏆 Licensed in 49 States</div>
            <div>⚡ AI-Powered Nurturing</div>
            <div>🎁 100% Free</div>
            <div>🤝 No Fees, No Contracts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
