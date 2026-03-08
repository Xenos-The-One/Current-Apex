import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, User, Home, Briefcase, CreditCard, FileText, Target, MapPin } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function BorrowerForm() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;
  const borrowerId = params.id ? parseInt(params.id) : undefined;

  // Load existing borrower data if editing
  const { data: existingData } = trpc.borrowers.get.useQuery(
    { id: borrowerId! },
    { enabled: !!borrowerId }
  );

  const existing = existingData?.borrower;

  const createMutation = trpc.borrowers.create.useMutation({
    onSuccess: (data) => {
      toast.success("Borrower added successfully!");
      setLocation(`/borrowers/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.borrowers.update.useMutation({
    onSuccess: () => {
      toast.success("Borrower updated!");
      setLocation(`/borrowers/${borrowerId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Form state
  const [form, setForm] = useState<Record<string, any>>({});

  // Merge existing data with form overrides
  const getValue = (field: string) => {
    if (form[field] !== undefined) return form[field];
    if (existing && (existing as any)[field] !== undefined && (existing as any)[field] !== null) {
      return (existing as any)[field];
    }
    return "";
  };

  const setValue = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = getValue("firstName");
    const lastName = getValue("lastName");
    if (!firstName || !lastName) {
      toast.error("First and last name are required");
      return;
    }

    // Build submission data
    const data: any = {
      firstName,
      lastName,
      email: getValue("email") || null,
      phone: getValue("phone") || null,
      secondaryPhone: getValue("secondaryPhone") || null,
      maritalStatus: getValue("maritalStatus") || null,
      preferredContactMethod: getValue("preferredContactMethod") || null,
      currentAddress: getValue("currentAddress") || null,
      city: getValue("city") || null,
      state: getValue("state") || null,
      zipCode: getValue("zipCode") || null,
      county: getValue("county") || null,
      housingStatus: getValue("housingStatus") || null,
      monthlyRent: getValue("monthlyRent") || null,
      employmentStatus: getValue("employmentStatus") || null,
      employer: getValue("employer") || null,
      jobTitle: getValue("jobTitle") || null,
      monthlyIncome: getValue("monthlyIncome") || null,
      annualIncome: getValue("annualIncome") || null,
      additionalIncome: getValue("additionalIncome") || null,
      additionalIncomeSource: getValue("additionalIncomeSource") || null,
      creditScoreRange: getValue("creditScoreRange") || null,
      creditScoreExact: getValue("creditScoreExact") ? parseInt(getValue("creditScoreExact")) : null,
      totalDebt: getValue("totalDebt") || null,
      monthlyDebtPayments: getValue("monthlyDebtPayments") || null,
      downPaymentAmount: getValue("downPaymentAmount") || null,
      downPaymentSource: getValue("downPaymentSource") || null,
      savingsAmount: getValue("savingsAmount") || null,
      loanPurpose: getValue("loanPurpose") || null,
      loanType: getValue("loanType") || null,
      desiredLoanAmount: getValue("desiredLoanAmount") || null,
      estimatedPropertyValue: getValue("estimatedPropertyValue") || null,
      interestRateQuoted: getValue("interestRateQuoted") || null,
      loanTerm: getValue("loanTerm") || null,
      propertyType: getValue("propertyType") || null,
      propertyUse: getValue("propertyUse") || null,
      targetPropertyAddress: getValue("targetPropertyAddress") || null,
      targetCity: getValue("targetCity") || null,
      targetState: getValue("targetState") || null,
      targetZipCode: getValue("targetZipCode") || null,
      currentLender: getValue("currentLender") || null,
      currentLoanBalance: getValue("currentLoanBalance") || null,
      currentInterestRate: getValue("currentInterestRate") || null,
      currentMonthlyPayment: getValue("currentMonthlyPayment") || null,
      isFirstTimeBuyer: getValue("isFirstTimeBuyer") === true,
      isVaEligible: getValue("isVaEligible") === true,
      isDpaEligible: getValue("isDpaEligible") === true,
      dpaProgram: getValue("dpaProgram") || null,
      isPreApproved: getValue("isPreApproved") === true,
      preApprovalAmount: getValue("preApprovalAmount") || null,
      pipelineStatus: getValue("pipelineStatus") || "new",
      purchaseTimeline: getValue("purchaseTimeline") || null,
      urgencyLevel: getValue("urgencyLevel") || null,
      leadSource: getValue("leadSource") || null,
      leadSourceDetail: getValue("leadSourceDetail") || null,
      scoreTier: getValue("scoreTier") || null,
      internalNotes: getValue("internalNotes") || null,
    };

    if (isEditing && borrowerId) {
      updateMutation.mutate({ id: borrowerId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation(isEditing ? `/borrowers/${borrowerId}` : "/borrowers")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl font-bold">{isEditing ? "Edit Borrower" : "Add New Borrower"}</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
              <TabsTrigger value="personal" className="text-xs"><User className="h-3 w-3 mr-1" /> Personal</TabsTrigger>
              <TabsTrigger value="address" className="text-xs"><MapPin className="h-3 w-3 mr-1" /> Address</TabsTrigger>
              <TabsTrigger value="employment" className="text-xs"><Briefcase className="h-3 w-3 mr-1" /> Employment</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs"><CreditCard className="h-3 w-3 mr-1" /> Financial</TabsTrigger>
              <TabsTrigger value="loan" className="text-xs"><FileText className="h-3 w-3 mr-1" /> Loan</TabsTrigger>
              <TabsTrigger value="property" className="text-xs"><Home className="h-3 w-3 mr-1" /> Property</TabsTrigger>
              <TabsTrigger value="pipeline" className="text-xs"><Target className="h-3 w-3 mr-1" /> Pipeline</TabsTrigger>
            </TabsList>

            {/* PERSONAL INFO TAB */}
            <TabsContent value="personal">
              <Card>
                <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input value={getValue("firstName")} onChange={e => setValue("firstName", e.target.value)} required />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input value={getValue("lastName")} onChange={e => setValue("lastName", e.target.value)} required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={getValue("email")} onChange={e => setValue("email", e.target.value)} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={getValue("phone")} onChange={e => setValue("phone", e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <Label>Secondary Phone</Label>
                    <Input value={getValue("secondaryPhone")} onChange={e => setValue("secondaryPhone", e.target.value)} />
                  </div>
                  <div>
                    <Label>Marital Status</Label>
                    <Select value={getValue("maritalStatus") || "none"} onValueChange={v => setValue("maritalStatus", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preferred Contact Method</Label>
                    <Select value={getValue("preferredContactMethod") || "phone"} onValueChange={v => setValue("preferredContactMethod", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="mail">Mail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={getValue("isFirstTimeBuyer") === true} onCheckedChange={v => setValue("isFirstTimeBuyer", v)} />
                    <Label>First-Time Homebuyer</Label>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={getValue("isVaEligible") === true} onCheckedChange={v => setValue("isVaEligible", v)} />
                    <Label>VA Eligible</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ADDRESS TAB */}
            <TabsContent value="address">
              <Card>
                <CardHeader><CardTitle className="text-lg">Current Address</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Street Address</Label>
                    <Input value={getValue("currentAddress")} onChange={e => setValue("currentAddress", e.target.value)} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={getValue("city")} onChange={e => setValue("city", e.target.value)} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={getValue("state")} onChange={e => setValue("state", e.target.value)} />
                  </div>
                  <div>
                    <Label>Zip Code</Label>
                    <Input value={getValue("zipCode")} onChange={e => setValue("zipCode", e.target.value)} />
                  </div>
                  <div>
                    <Label>County</Label>
                    <Input value={getValue("county")} onChange={e => setValue("county", e.target.value)} />
                  </div>
                  <div>
                    <Label>Housing Status</Label>
                    <Select value={getValue("housingStatus") || "none"} onValueChange={v => setValue("housingStatus", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="renting">Renting</SelectItem>
                        <SelectItem value="own_with_mortgage">Own with Mortgage</SelectItem>
                        <SelectItem value="own_free_clear">Own Free & Clear</SelectItem>
                        <SelectItem value="living_with_family">Living with Family</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Monthly Rent/Mortgage</Label>
                    <Input type="number" value={getValue("monthlyRent")} onChange={e => setValue("monthlyRent", e.target.value)} placeholder="$" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* EMPLOYMENT TAB */}
            <TabsContent value="employment">
              <Card>
                <CardHeader><CardTitle className="text-lg">Employment & Income</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Employment Status</Label>
                    <Select value={getValue("employmentStatus") || "none"} onValueChange={v => setValue("employmentStatus", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="employed">Employed</SelectItem>
                        <SelectItem value="self_employed">Self-Employed</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                        <SelectItem value="military">Military</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Employer</Label>
                    <Input value={getValue("employer")} onChange={e => setValue("employer", e.target.value)} />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input value={getValue("jobTitle")} onChange={e => setValue("jobTitle", e.target.value)} />
                  </div>
                  <div>
                    <Label>Monthly Income</Label>
                    <Input type="number" value={getValue("monthlyIncome")} onChange={e => setValue("monthlyIncome", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Annual Income</Label>
                    <Input type="number" value={getValue("annualIncome")} onChange={e => setValue("annualIncome", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Additional Income</Label>
                    <Input type="number" value={getValue("additionalIncome")} onChange={e => setValue("additionalIncome", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Additional Income Source</Label>
                    <Input value={getValue("additionalIncomeSource")} onChange={e => setValue("additionalIncomeSource", e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FINANCIAL TAB */}
            <TabsContent value="financial">
              <Card>
                <CardHeader><CardTitle className="text-lg">Financial Profile</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Credit Score Range</Label>
                    <Select value={getValue("creditScoreRange") || "unknown"} onValueChange={v => setValue("creditScoreRange", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Unknown</SelectItem>
                        <SelectItem value="below_580">Below 580</SelectItem>
                        <SelectItem value="580_619">580-619</SelectItem>
                        <SelectItem value="620_659">620-659</SelectItem>
                        <SelectItem value="660_699">660-699</SelectItem>
                        <SelectItem value="700_739">700-739</SelectItem>
                        <SelectItem value="740_779">740-779</SelectItem>
                        <SelectItem value="780_plus">780+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Exact Credit Score (if known)</Label>
                    <Input type="number" min={300} max={850} value={getValue("creditScoreExact")} onChange={e => setValue("creditScoreExact", e.target.value)} />
                  </div>
                  <div>
                    <Label>Total Debt</Label>
                    <Input type="number" value={getValue("totalDebt")} onChange={e => setValue("totalDebt", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Monthly Debt Payments</Label>
                    <Input type="number" value={getValue("monthlyDebtPayments")} onChange={e => setValue("monthlyDebtPayments", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Savings Amount</Label>
                    <Input type="number" value={getValue("savingsAmount")} onChange={e => setValue("savingsAmount", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Down Payment Amount</Label>
                    <Input type="number" value={getValue("downPaymentAmount")} onChange={e => setValue("downPaymentAmount", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Down Payment Source</Label>
                    <Select value={getValue("downPaymentSource") || "none"} onValueChange={v => setValue("downPaymentSource", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="gift">Gift</SelectItem>
                        <SelectItem value="grant">Grant</SelectItem>
                        <SelectItem value="401k">401(k)</SelectItem>
                        <SelectItem value="sale_of_property">Sale of Property</SelectItem>
                        <SelectItem value="dpa_program">DPA Program</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={getValue("bankruptcyHistory") === true} onCheckedChange={v => setValue("bankruptcyHistory", v)} />
                    <Label>Bankruptcy History</Label>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={getValue("foreclosureHistory") === true} onCheckedChange={v => setValue("foreclosureHistory", v)} />
                    <Label>Foreclosure History</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LOAN TAB */}
            <TabsContent value="loan">
              <Card>
                <CardHeader><CardTitle className="text-lg">Loan Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Loan Purpose</Label>
                    <Select value={getValue("loanPurpose") || "none"} onValueChange={v => setValue("loanPurpose", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="refinance_rate_term">Refinance (Rate/Term)</SelectItem>
                        <SelectItem value="refinance_cash_out">Refinance (Cash Out)</SelectItem>
                        <SelectItem value="heloc">HELOC</SelectItem>
                        <SelectItem value="reverse_mortgage">Reverse Mortgage</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="renovation">Renovation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Loan Type</Label>
                    <Select value={getValue("loanType") || "none"} onValueChange={v => setValue("loanType", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="conventional">Conventional</SelectItem>
                        <SelectItem value="fha">FHA</SelectItem>
                        <SelectItem value="va">VA</SelectItem>
                        <SelectItem value="usda">USDA</SelectItem>
                        <SelectItem value="jumbo">Jumbo</SelectItem>
                        <SelectItem value="non_qm">Non-QM</SelectItem>
                        <SelectItem value="bridge">Bridge</SelectItem>
                        <SelectItem value="hard_money">Hard Money</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Desired Loan Amount</Label>
                    <Input type="number" value={getValue("desiredLoanAmount")} onChange={e => setValue("desiredLoanAmount", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Estimated Property Value</Label>
                    <Input type="number" value={getValue("estimatedPropertyValue")} onChange={e => setValue("estimatedPropertyValue", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Interest Rate Quoted</Label>
                    <Input type="number" step="0.001" value={getValue("interestRateQuoted")} onChange={e => setValue("interestRateQuoted", e.target.value)} placeholder="%" />
                  </div>
                  <div>
                    <Label>Loan Term</Label>
                    <Select value={getValue("loanTerm") || "none"} onValueChange={v => setValue("loanTerm", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="15_year">15 Year</SelectItem>
                        <SelectItem value="20_year">20 Year</SelectItem>
                        <SelectItem value="25_year">25 Year</SelectItem>
                        <SelectItem value="30_year">30 Year</SelectItem>
                        <SelectItem value="arm_5_1">5/1 ARM</SelectItem>
                        <SelectItem value="arm_7_1">7/1 ARM</SelectItem>
                        <SelectItem value="arm_10_1">10/1 ARM</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={getValue("isPreApproved") === true} onCheckedChange={v => setValue("isPreApproved", v)} />
                    <Label>Pre-Approved</Label>
                  </div>
                  <div>
                    <Label>Pre-Approval Amount</Label>
                    <Input type="number" value={getValue("preApprovalAmount")} onChange={e => setValue("preApprovalAmount", e.target.value)} placeholder="$" disabled={!getValue("isPreApproved")} />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={getValue("isDpaEligible") === true} onCheckedChange={v => setValue("isDpaEligible", v)} />
                    <Label>DPA Eligible</Label>
                  </div>
                  <div>
                    <Label>DPA Program</Label>
                    <Input value={getValue("dpaProgram")} onChange={e => setValue("dpaProgram", e.target.value)} disabled={!getValue("isDpaEligible")} />
                  </div>
                </CardContent>
              </Card>

              {/* Current Mortgage (for refinance) */}
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-lg">Current Mortgage (Refinance)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Current Lender</Label>
                    <Input value={getValue("currentLender")} onChange={e => setValue("currentLender", e.target.value)} />
                  </div>
                  <div>
                    <Label>Current Loan Balance</Label>
                    <Input type="number" value={getValue("currentLoanBalance")} onChange={e => setValue("currentLoanBalance", e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Current Interest Rate</Label>
                    <Input type="number" step="0.001" value={getValue("currentInterestRate")} onChange={e => setValue("currentInterestRate", e.target.value)} placeholder="%" />
                  </div>
                  <div>
                    <Label>Current Monthly Payment</Label>
                    <Input type="number" value={getValue("currentMonthlyPayment")} onChange={e => setValue("currentMonthlyPayment", e.target.value)} placeholder="$" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PROPERTY TAB */}
            <TabsContent value="property">
              <Card>
                <CardHeader><CardTitle className="text-lg">Target Property</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Property Type</Label>
                    <Select value={getValue("propertyType") || "none"} onValueChange={v => setValue("propertyType", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="single_family">Single Family</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                        <SelectItem value="multi_unit_2_4">Multi-Unit (2-4)</SelectItem>
                        <SelectItem value="multi_unit_5_plus">Multi-Unit (5+)</SelectItem>
                        <SelectItem value="manufactured">Manufactured</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Property Use</Label>
                    <Select value={getValue("propertyUse") || "none"} onValueChange={v => setValue("propertyUse", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="primary_residence">Primary Residence</SelectItem>
                        <SelectItem value="second_home">Second Home</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Property Address</Label>
                    <Input value={getValue("targetPropertyAddress")} onChange={e => setValue("targetPropertyAddress", e.target.value)} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={getValue("targetCity")} onChange={e => setValue("targetCity", e.target.value)} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={getValue("targetState")} onChange={e => setValue("targetState", e.target.value)} />
                  </div>
                  <div>
                    <Label>Zip Code</Label>
                    <Input value={getValue("targetZipCode")} onChange={e => setValue("targetZipCode", e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PIPELINE TAB */}
            <TabsContent value="pipeline">
              <Card>
                <CardHeader><CardTitle className="text-lg">Pipeline & Source</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Pipeline Status</Label>
                    <Select value={getValue("pipelineStatus") || "new"} onValueChange={v => setValue("pipelineStatus", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="pre_qualified">Pre-Qualified</SelectItem>
                        <SelectItem value="pre_approved">Pre-Approved</SelectItem>
                        <SelectItem value="house_hunting">House Hunting</SelectItem>
                        <SelectItem value="under_contract">Under Contract</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="underwriting">Underwriting</SelectItem>
                        <SelectItem value="conditional_approval">Conditional Approval</SelectItem>
                        <SelectItem value="clear_to_close">Clear to Close</SelectItem>
                        <SelectItem value="closed_funded">Closed/Funded</SelectItem>
                        <SelectItem value="closed_lost">Closed/Lost</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="nurture">Nurture</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Urgency Level</Label>
                    <Select value={getValue("urgencyLevel") || "medium"} onValueChange={v => setValue("urgencyLevel", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Purchase Timeline</Label>
                    <Select value={getValue("purchaseTimeline") || "none"} onValueChange={v => setValue("purchaseTimeline", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="ready_now">Ready Now</SelectItem>
                        <SelectItem value="1_3_months">1-3 Months</SelectItem>
                        <SelectItem value="3_6_months">3-6 Months</SelectItem>
                        <SelectItem value="6_12_months">6-12 Months</SelectItem>
                        <SelectItem value="12_plus_months">12+ Months</SelectItem>
                        <SelectItem value="just_exploring">Just Exploring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Score Tier</Label>
                    <Select value={getValue("scoreTier") || "cold"} onValueChange={v => setValue("scoreTier", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hot">Hot</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cold">Cold</SelectItem>
                        <SelectItem value="dead">Dead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lead Source</Label>
                    <Select value={getValue("leadSource") || "none"} onValueChange={v => setValue("leadSource", v === "none" ? null : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="facebook_ad">Facebook Ad</SelectItem>
                        <SelectItem value="instagram_ad">Instagram Ad</SelectItem>
                        <SelectItem value="google_ad">Google Ad</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral_agent">Referral (Agent)</SelectItem>
                        <SelectItem value="referral_past_client">Referral (Past Client)</SelectItem>
                        <SelectItem value="datacrawl">Datacrawl</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="cold_call">Cold Call</SelectItem>
                        <SelectItem value="walk_in">Walk-In</SelectItem>
                        <SelectItem value="zillow">Zillow</SelectItem>
                        <SelectItem value="realtor_com">Realtor.com</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lead Source Detail</Label>
                    <Input value={getValue("leadSourceDetail")} onChange={e => setValue("leadSourceDetail", e.target.value)} placeholder="Campaign name, ad set, etc." />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Internal Notes</Label>
                    <Textarea value={getValue("internalNotes")} onChange={e => setValue("internalNotes", e.target.value)} rows={4} placeholder="Private notes about this borrower..." />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setLocation(isEditing ? `/borrowers/${borrowerId}` : "/borrowers")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-1" />
              {isSubmitting ? "Saving..." : isEditing ? "Update Borrower" : "Add Borrower"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
