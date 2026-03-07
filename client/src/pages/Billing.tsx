import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  CheckCircle,
  CreditCard,
  DollarSign,
  ExternalLink,
  Package,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 97,
    description: "Perfect for individual loan officers",
    features: [
      "Up to 500 leads",
      "Email campaigns",
      "Basic pipeline",
      "Appointment scheduling",
      "1 user seat",
    ],
    color: "blue",
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: 297,
    description: "For growing mortgage teams",
    features: [
      "Unlimited leads",
      "Email + SMS campaigns",
      "Full pipeline & automation",
      "AI calling (Vapi)",
      "AI lead scoring",
      "5 user seats",
      "Analytics dashboard",
      "Document storage (10GB)",
    ],
    color: "purple",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 697,
    description: "For large agencies and teams",
    features: [
      "Everything in Professional",
      "Unlimited user seats",
      "White-label options",
      "Custom integrations",
      "Priority support",
      "Unlimited document storage",
      "Custom AI training",
      "Dedicated account manager",
    ],
    color: "teal",
    popular: false,
  },
];

export default function Billing() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;

  const { data: billingInfo } = trpc.billing.getAgencyBilling.useQuery({ agencyId });
  const { data: plans } = trpc.billing.listPlans.useQuery();
  const subscription = billingInfo?.plan;
  const invoices = billingInfo?.invoices ?? [];

  const currentPlan = subscription?.slug || "none";

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-6 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Billing & Subscription</h1>
            <p className="text-muted-foreground text-sm">Manage your agency's subscription and payment methods</p>
          </div>
          {subscription && (
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={() => toast.info("Stripe billing portal — configure STRIPE_SECRET_KEY to enable")}>
              <ExternalLink className="w-4 h-4" /> Manage Billing
            </Button>
          )}
        </div>

        {/* Current subscription */}
        {subscription && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Current Plan</span>
                  </div>
                  <p className="text-xl font-bold font-display capitalize">{subscription.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Status: <span className="font-medium text-green-600">Active</span>
                  </p>
                  {subscription.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{subscription.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-display">${subscription.monthlyPrice ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stripe notice */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Stripe Integration</p>
              <p className="text-sm text-amber-700 mt-0.5">
                To enable live payments, add your <code className="bg-amber-100 px-1 rounded text-xs">STRIPE_SECRET_KEY</code> and <code className="bg-amber-100 px-1 rounded text-xs">STRIPE_WEBHOOK_SECRET</code> in Settings → Secrets. Plans below will redirect to Stripe Checkout when configured.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing plans */}
        <div>
          <h2 className="text-lg font-bold font-display mb-3">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-5 transition-all ${plan.popular ? "border-primary shadow-lg" : "border-border hover:border-primary/40"}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <p className="font-bold text-lg font-display">{plan.name}</p>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-2">
                    <span className="text-3xl font-bold font-display">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={currentPlan === plan.id}
                  onClick={() => toast.info("Stripe checkout — configure STRIPE_SECRET_KEY to enable live payments")}
                >
                  {currentPlan === plan.id ? "Current Plan" : `Subscribe to ${plan.name}`}
                  {currentPlan !== plan.id && <ArrowUpRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice history */}
        {invoices && invoices.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Invoice History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{new Date(inv.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground capitalize">{inv.description || inv.plan}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">${(inv.amount / 100).toFixed(2)}</span>
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="capitalize">{inv.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CRMLayout>
  );
}
