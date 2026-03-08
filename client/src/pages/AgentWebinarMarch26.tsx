import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Calendar, Clock, Users, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function AgentWebinarMarch26() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    brokerage: '',
  });

  const registerMutation = trpc.webinars.register.useMutation({
    onSuccess: () => {
      toast.success('Registration Successful!', {
        description: 'Check your email for webinar details and calendar invite.',
      });
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        brokerage: '',
      });
    },
    onError: (error) => {
      toast.error('Registration Failed', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      webinarDate: '2026-03-26',
      webinarTime: '18:00:00',
      webinarType: 'agents',
      source: 'landing_page',
      origin: window.location.origin,
      ...formData,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="container py-12 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            <Calendar className="mr-2 inline-block h-4 w-4" />
            March 26, 2026
          </div>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
            Close More Deals with Confidence
          </h1>
          
          <p className="mb-8 text-xl text-gray-600 md:text-2xl">
            Learn proven strategies from 20+ years of mortgage lending experience
          </p>

          <div className="mb-12 flex flex-wrap items-center justify-center gap-6 text-gray-700">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-medium">60 Minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Real Estate Agents</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Actionable Strategies</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="mx-auto max-w-2xl p-8 shadow-xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
            Reserve Your Spot
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Smith"
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
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="brokerage">Brokerage</Label>
              <Input
                id="brokerage"
                value={formData.brokerage}
                onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                placeholder="Your Brokerage Name"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full text-lg"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Registering...' : 'Register Now'}
            </Button>
          </form>
        </Card>

        {/* What You'll Learn */}
        <div className="mx-auto mt-16 max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">
            What You'll Learn
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            {[
              'Navigate complex loan scenarios with confidence',
              'Help more clients qualify for their dream homes',
              'Understand down payment assistance programs',
              'Build stronger lender partnerships',
              'Close deals faster with proven strategies',
              'Overcome common financing objections',
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-6 w-6 flex-shrink-0 text-green-600" />
                <p className="text-lg text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* About the Expert */}
        <div className="mx-auto mt-16 max-w-4xl">
          <Card className="p-8">
            <h2 className="mb-6 text-center text-3xl font-bold text-gray-900">
              Your Expert Instructor
            </h2>
            
            <div className="text-center">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">Tim Haskins</h3>
              <p className="mb-4 text-lg text-blue-600">NMLS #1116876</p>
              <p className="text-lg leading-relaxed text-gray-700">
                With over 20 years of experience in mortgage lending, Tim has helped thousands 
                of families achieve homeownership. His deep understanding of loan programs, 
                down payment assistance, and creative financing solutions makes him a trusted 
                partner for real estate agents across the region.
              </p>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-gray-600">
          <p>Premier Mortgage Resources</p>
          <p className="mt-2">Tim Haskins, NMLS #1116876</p>
          <p className="mt-2">Questions? Contact us at tim@lockinloans.com</p>
        </div>
      </div>
    </div>
  );
}
