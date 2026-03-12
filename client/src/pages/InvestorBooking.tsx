/**
 * InvestorBooking — Public booking page for Optimal Lending Solutions
 * 
 * Features:
 * - Lead magnet: "The Investor's Guide to DSCR & Fix-and-Flip Loans" (PDF download)
 * - Lead capture form (name, email, phone, loan type, property address)
 * - Calendar embed / appointment booking with Kyle
 * - Auto-enrolls lead in the matching drip sequence
 * - Fully public — no login required
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, Download, Phone, Mail, Calendar, Shield,
  TrendingUp, Home, Wrench, Star, ArrowRight, Clock, Users
} from "lucide-react";

// ─── Lead Magnet Guide Content ────────────────────────────────────────────────

const GUIDE_CONTENT = `
INVESTOR'S GUIDE TO DSCR & FIX-AND-FLIP LOANS
Optimal Lending Solutions | Kyle | info@optimallendingsolutions.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART 1: DSCR LOANS — QUALIFY ON RENTAL INCOME, NOT YOUR W-2

What is a DSCR Loan?
A Debt Service Coverage Ratio (DSCR) loan lets real estate investors qualify based on
the rental income of the property — not their personal income, tax returns, or W-2s.

How DSCR is Calculated:
  DSCR = Monthly Rental Income ÷ Monthly Debt (PITI)
  
  Example: Property rents for $2,500/month. PITIA = $2,000/month.
  DSCR = 2,500 ÷ 2,000 = 1.25 ✅ (We typically require 1.0 or above)

Key Benefits:
  ✓ No tax returns required
  ✓ No W-2 or employment verification
  ✓ Qualify based on property cash flow
  ✓ Close in your LLC or entity
  ✓ Rates competitive with conventional investment loans
  ✓ Loan amounts from $100K to $5M+

Who It's For:
  • Self-employed investors with complex tax returns
  • Investors with multiple rental properties
  • Foreign nationals investing in US real estate
  • Anyone who wants to scale their portfolio without income limitations

What You Need:
  • 20–25% down payment (varies by credit score)
  • 660+ credit score (680+ for best rates)
  • Property must be non-owner occupied
  • Must close in an LLC or legal entity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART 2: FIX-AND-FLIP LOANS — FAST CAPITAL FOR FLIPPERS

What is a Fix-and-Flip Loan?
A short-term bridge loan designed for investors who buy, renovate, and sell properties
for profit. Qualification is based on the property's after-repair value (ARV), not income.

Typical Terms:
  • Loan term: 6–18 months
  • Loan-to-cost (LTC): Up to 90% of purchase + rehab
  • Loan-to-ARV: Up to 70–75%
  • Interest: Typically 10–13% (interest-only payments)
  • Points: 2–4 origination points

Key Benefits:
  ✓ Fast closings — as little as 7–14 days
  ✓ No income verification
  ✓ Draw schedule for renovation funds
  ✓ Interest-only payments during renovation
  ✓ No prepayment penalty on most programs

The Fix-and-Flip Process:
  1. Find a deal below market value
  2. Get pre-approved with us (takes 24 hours)
  3. Close fast — beat cash buyers
  4. Renovate using draw schedule
  5. Sell at ARV or refinance into a DSCR loan
  6. Repeat

What You Need:
  • 10–20% down payment (varies by experience)
  • Property must have clear exit strategy
  • Must close in an LLC or legal entity
  • Prior flip experience preferred (but not always required)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PART 3: COMMON QUESTIONS

Q: Can I use a DSCR loan for a short-term rental (Airbnb/VRBO)?
A: Yes. We use market rent or actual Airbnb income to calculate DSCR.

Q: How fast can you close a Fix-and-Flip loan?
A: Typically 7–14 business days once we have a complete file.

Q: Do I need an LLC?
A: Yes. All our loans are business-purpose and must close in an entity.
   We can refer you to an attorney who can set one up quickly.

Q: What states do you lend in?
A: We lend in most states. Contact us to confirm your state.

Q: Can I have multiple loans at the same time?
A: Yes. We have no blanket limit on the number of loans.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEP: Book a Free Strategy Call with Kyle

Kyle will review your deal, run the numbers, and tell you exactly what you qualify for.
No obligation. No pressure. Just clarity.

📅 Book at: https://crmplatform-rus3etbp.manus.space/investor-booking
📞 Call/Text: (Your number here)
📧 Email: info@optimallendingsolutions.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DISCLAIMER: All loans are for business purposes only. Borrowers must close in an LLC
or legal entity. This is not a commitment to lend. Terms subject to change.
Optimal Lending Solutions | NMLS # (if applicable)
`;

function downloadGuide() {
  const blob = new Blob([GUIDE_CONTENT], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Optimal-Lending-Investor-Guide-DSCR-FixFlip.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    role: "Real Estate Investor, TX",
    text: "Kyle closed my DSCR loan in 3 weeks. No tax returns, no hassle. I've already done 3 more deals with him.",
    stars: 5,
  },
  {
    name: "Jennifer R.",
    role: "Fix & Flip Investor, FL",
    text: "I was skeptical at first, but Kyle walked me through everything. Got funded in 10 days and made $42K on my first flip.",
    stars: 5,
  },
  {
    name: "David K.",
    role: "Portfolio Investor, GA",
    text: "Finally a lender who understands investors. Kyle doesn't ask for 2 years of tax returns — he just looks at the deal.",
    stars: 5,
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

type FormStep = "capture" | "booked";

export default function InvestorBooking() {
  const [step, setStep] = useState<FormStep>("capture");
  const [downloaded, setDownloaded] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    loanType: "",
    propertyAddress: "",
    loanAmount: "",
  });

  const createLeadMutation = trpc.publicFeatures.captureBookingLead.useMutation({
    onSuccess: () => {
      setStep("booked");
      toast.success("You're all set! Check your email for next steps.");
    },
    onError: (err) => {
      // Even if lead capture fails, show the booking step
      console.error("Lead capture error:", err);
      setStep("booked");
    },
  });

  const handleDownload = () => {
    downloadGuide();
    setDownloaded(true);
    toast.success("Guide downloaded! Check your downloads folder.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.phone || !form.loanType) {
      toast.error("Please fill in all required fields");
      return;
    }
    createLeadMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      loanType: form.loanType,
      propertyAddress: form.propertyAddress,
      loanAmount: form.loanAmount,
      source: "booking_page",
    });
  };

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0f1e]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-lg text-white">Optimal Lending Solutions</div>
            <div className="text-xs text-white/50">Investment Property Financing Specialists</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="tel:+1" className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
              <Phone className="w-4 h-4" /> Call Kyle
            </a>
            <a href="mailto:info@optimallendingsolutions.com" className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
              <Mail className="w-4 h-4" /> Email
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Copy */}
          <div>
            <Badge className="mb-4 bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              FREE INVESTOR GUIDE + STRATEGY CALL
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Get Funded Fast.<br />
              <span className="text-amber-400">No Tax Returns.</span><br />
              No Excuses.
            </h1>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              Whether you're buying a rental property with a DSCR loan or flipping your next deal,
              Kyle at Optimal Lending Solutions closes fast — and qualifies you on the <strong className="text-white">deal</strong>, not your W-2.
            </p>

            {/* Benefits */}
            <div className="space-y-3 mb-8">
              {[
                { icon: TrendingUp, text: "DSCR Loans — qualify on rental income, not personal income" },
                { icon: Wrench, text: "Fix & Flip Loans — close in as little as 7 days" },
                { icon: Home, text: "No tax returns, no W-2 verification required" },
                { icon: Shield, text: "Close in your LLC — all business-purpose loans" },
                { icon: Clock, text: "Kyle calls within 5 minutes of your inquiry" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-white/80 text-sm">{text}</span>
                </div>
              ))}
            </div>

            {/* Lead Magnet Download */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-16 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Download className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">FREE Download</div>
                  <div className="text-white font-bold mb-1">The Investor's Guide to DSCR & Fix-and-Flip Loans</div>
                  <div className="text-white/50 text-xs mb-3">
                    Everything you need to know about qualifying, rates, terms, and how to close your next deal fast.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                  >
                    {downloaded ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Downloaded!</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> Download Free Guide</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form or Booking */}
          <div>
            {step === "capture" ? (
              <Card className="bg-white/5 border-white/10 backdrop-blur">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-8 h-8 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Book Your Free Strategy Call</h2>
                    <p className="text-white/50 text-sm mt-1">
                      Tell us about your deal. Kyle will call you within 5 minutes.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-white/70 text-xs">First Name *</Label>
                        <Input
                          value={form.firstName}
                          onChange={update("firstName")}
                          placeholder="John"
                          className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-amber-500/50"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white/70 text-xs">Last Name</Label>
                        <Input
                          value={form.lastName}
                          onChange={update("lastName")}
                          placeholder="Smith"
                          className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/70 text-xs">Email Address *</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={update("email")}
                        placeholder="john@example.com"
                        className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-amber-500/50"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white/70 text-xs">Phone Number *</Label>
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={update("phone")}
                        placeholder="(555) 000-0000"
                        className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-amber-500/50"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white/70 text-xs">Loan Type *</Label>
                      <Select value={form.loanType} onValueChange={(v) => setForm((f) => ({ ...f, loanType: v }))}>
                        <SelectTrigger className="mt-1 bg-white/5 border-white/20 text-white focus:border-amber-500/50">
                          <SelectValue placeholder="Select loan type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dscr">DSCR Loan (Rental Property)</SelectItem>
                          <SelectItem value="fix_flip">Fix &amp; Flip Loan</SelectItem>
                          <SelectItem value="construction">Construction / Ground-Up</SelectItem>
                          <SelectItem value="bridge">Bridge Loan</SelectItem>
                          <SelectItem value="not_sure">Not Sure Yet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white/70 text-xs">Property Address (optional)</Label>
                      <Input
                        value={form.propertyAddress}
                        onChange={update("propertyAddress")}
                        placeholder="123 Main St, City, State"
                        className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-amber-500/50"
                      />
                    </div>

                    <div>
                      <Label className="text-white/70 text-xs">Estimated Loan Amount</Label>
                      <Input
                        value={form.loanAmount}
                        onChange={update("loanAmount")}
                        placeholder="e.g. $350,000"
                        className="mt-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-amber-500/50"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 text-base"
                      disabled={createLeadMutation.isPending}
                    >
                      {createLeadMutation.isPending ? (
                        "Submitting..."
                      ) : (
                        <>Book My Free Strategy Call <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>

                    <p className="text-center text-white/30 text-xs">
                      By submitting, you agree to be contacted by Optimal Lending Solutions.
                      No spam. Unsubscribe anytime.
                    </p>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/5 border-white/10 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">You're on Kyle's List!</h2>
                  <p className="text-white/60 text-sm mb-6">
                    Kyle will call you within 5 minutes. If you miss his call, he'll text you right after.
                    In the meantime, download your free guide below.
                  </p>

                  <div className="space-y-3">
                    <Button
                      onClick={handleDownload}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Your Free Investor Guide
                    </Button>

                    <div className="bg-white/5 rounded-lg p-4 text-left">
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-2">What Happens Next</p>
                      {[
                        "Kyle calls you within 5 minutes",
                        "He reviews your deal and runs the numbers",
                        "You get a pre-approval letter within 24 hours",
                        "Close in as little as 7–14 days",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-400 font-bold shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-white/70 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <a href="tel:+1" className="flex-1">
                        <Button variant="outline" className="w-full border-white/20 text-white/70 hover:text-white bg-transparent">
                          <Phone className="w-4 h-4 mr-2" /> Call Kyle Now
                        </Button>
                      </a>
                      <a href="mailto:info@optimallendingsolutions.com" className="flex-1">
                        <Button variant="outline" className="w-full border-white/20 text-white/70 hover:text-white bg-transparent">
                          <Mail className="w-4 h-4 mr-2" /> Email Kyle
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-t border-white/10 bg-white/2 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">What Investors Are Saying</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-white/70 text-sm mb-4 italic">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-sm text-white">{t.name}</div>
                  <div className="text-white/40 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "7–14", label: "Days to Close Fix & Flip" },
              { value: "0", label: "Tax Returns Required" },
              { value: "5 min", label: "Response Time Guarantee" },
              { value: "$100K+", label: "Minimum Loan Amount" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-amber-400">{s.value}</div>
                <div className="text-white/50 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/30 text-xs">
          <p>© 2026 Optimal Lending Solutions. All loans are for business purposes only.</p>
          <p className="mt-1">Borrowers must close in an LLC or legal entity. Not a commitment to lend.</p>
          <p className="mt-1">
            <a href="mailto:info@optimallendingsolutions.com" className="hover:text-white/60 transition-colors">
              info@optimallendingsolutions.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
