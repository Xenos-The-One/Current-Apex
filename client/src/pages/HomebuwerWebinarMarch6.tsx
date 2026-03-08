import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Calendar, Clock, Gift, Home, DollarSign, CheckCircle2 } from 'lucide-react';

export default function HomebuwerWebinarMarch6() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const registerMutation = trpc.webinars.register.useMutation({
    onSuccess: () => {
      // Redirect to booking page instead of showing success message
      setLocation('/book');
    },
    onError: (error) => {
      toast.error(`Registration Failed: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    registerMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      webinarDate: '2026-03-06',
      webinarTime: '18:00:00',
      webinarType: 'first_time_homebuyer',
      source: 'landing_page',
      origin: window.location.origin,
    });
  };

  // Remove success screen - we redirect to /book instead

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            FREE WEBINAR
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            First-Time Homebuyer Down Payment Assistance Programs
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Discover how to get up to $20,000 in down payment assistance and make homeownership a reality
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">March 6th, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">6:00 PM PST</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">100% Free</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Registration Form */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Reserve Your Spot</h2>
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

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Registering...' : 'Register for Free Webinar'}
              </Button>
            </form>
          </Card>

          {/* What You'll Learn */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">What You'll Learn:</h3>
              <ul className="space-y-3">
                {[
                  'How to qualify for up to $20,000 in down payment assistance',
                  'Multiple DPA programs available in Nevada',
                  'Step-by-step process to apply and get approved',
                  'How to combine DPA with other first-time buyer benefits',
                  'Common mistakes to avoid when applying',
                  'Real success stories from Nevada homebuyers',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-xl font-bold mb-4">Why Attend?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Home className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Make Homeownership Possible</p>
                    <p className="text-sm text-muted-foreground">Even if you think you can't afford a down payment</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Save Thousands</p>
                    <p className="text-sm text-muted-foreground">Learn about programs most people don't know exist</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* About Tim */}
        <Card className="max-w-4xl mx-auto mt-12 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Your Instructor</h3>
            <p className="text-lg font-semibold mb-2">Tim Haskins</p>
            <p className="text-muted-foreground mb-4">
              Senior Loan Officer | Premier Mortgage Resources
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              With over 20 years of experience helping Nevada families achieve homeownership, 
              Tim has helped hundreds of first-time buyers navigate the complex world of down payment assistance programs.
            </p>
            <p className="text-xs text-muted-foreground">
              NMLS #1116876 | Premier Mortgage Resources
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
