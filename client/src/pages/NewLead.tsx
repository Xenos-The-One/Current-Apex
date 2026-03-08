import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function NewLead() {
  const [, navigate] = useLocation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  // New Tier 1 fields
  const [contactType, setContactType] = useState("borrower");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanType, setLoanType] = useState("");
  const [probability, setProbability] = useState("");
  const [partnerTier, setPartnerTier] = useState("");

  const createLead = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      toast.success("Lead created successfully");
      navigate("/leads");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName) {
      toast.error("First name and last name are required");
      return;
    }

    if (!email && !phone) {
      toast.error("Please provide at least email or phone");
      return;
    }

    createLead.mutate({
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      source: source || undefined,
      notes: notes || undefined,
      contactType: contactType as any || undefined,
      loanAmount: loanAmount ? parseFloat(loanAmount) : undefined,
      loanType: loanType || undefined,
      probability: probability ? parseInt(probability) : undefined,
      partnerTier: partnerTier || undefined,
    });
  };

  const isPartnerType = contactType !== "borrower";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Add New Lead</h1>
            <p className="text-muted-foreground">Create a new lead manually</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Enter the contact's details and classification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Type */}
              <div className="space-y-2">
                <Label htmlFor="contactType">Contact Type</Label>
                <Select value={contactType} onValueChange={setContactType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrower">Borrower / Consumer</SelectItem>
                    <SelectItem value="real_estate_agent">Real Estate Agent</SelectItem>
                    <SelectItem value="attorney">Attorney</SelectItem>
                    <SelectItem value="insurance_agent">Insurance Agent</SelectItem>
                    <SelectItem value="title_company">Title Company</SelectItem>
                    <SelectItem value="builder_developer">Builder / Developer</SelectItem>
                    <SelectItem value="lender">Lender</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Lead Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Facebook, Instagram, LinkedIn"
                  list="lead-sources"
                />
                <datalist id="lead-sources">
                  <option value="Facebook" />
                  <option value="Instagram" />
                  <option value="LinkedIn" />
                  <option value="Google Ads" />
                  <option value="Referral" />
                  <option value="Website" />
                  <option value="Cold Call" />
                  <option value="Email Campaign" />
                </datalist>
              </div>

              <Separator />

              {/* Loan / Deal Details */}
              <div>
                <h3 className="font-semibold text-sm mb-3">
                  {isPartnerType ? "Partnership Details" : "Loan Details"}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {!isPartnerType && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="loanType">Loan Type</Label>
                        <Select value={loanType} onValueChange={setLoanType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select loan type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="purchase">Purchase</SelectItem>
                            <SelectItem value="refinance">Refinance</SelectItem>
                            <SelectItem value="heloc">HELOC</SelectItem>
                            <SelectItem value="reverse_mortgage">Reverse Mortgage</SelectItem>
                            <SelectItem value="construction">Construction</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="loanAmount">Loan Amount ($)</Label>
                        <Input
                          id="loanAmount"
                          type="number"
                          min="0"
                          step="1000"
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(e.target.value)}
                          placeholder="350000"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="probability">Probability (%)</Label>
                    <Input
                      id="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={probability}
                      onChange={(e) => setProbability(e.target.value)}
                      placeholder="50"
                    />
                  </div>

                  {isPartnerType && (
                    <div className="space-y-2">
                      <Label htmlFor="partnerTier">Partner Tier</Label>
                      <Select value={partnerTier} onValueChange={setPartnerTier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bronze">Bronze</SelectItem>
                          <SelectItem value="silver">Silver</SelectItem>
                          <SelectItem value="gold">Gold</SelectItem>
                          <SelectItem value="platinum">Platinum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about this lead..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Link href="/leads">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createLead.isPending}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Lead
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
