import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Calendar, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function OnboardingSuccess() {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (sid) {
      setSessionId(sid);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl">Subscription Active!</CardTitle>
          <CardDescription className="text-lg">
            Welcome to Indigo Labs. Your CRM is ready to go.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/5 p-6 rounded-lg space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Next Step: Book Your Strategy Call
            </h3>
            <p className="text-muted-foreground">
              Schedule a 30-minute strategy session with the Indigo Labs team. We'll walk you through
              your CRM, customize your setup, and create a game plan for your first 30 days.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">What You Now Have Access To:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>Full CRM dashboard with lead management</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>Email & SMS campaign tools</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>Social media content scheduler</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>AI script generator for video content</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>Lead scoring and analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span>30-day money-back guarantee</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 space-y-3">
            <Button size="lg" className="w-full text-lg" asChild>
              <Link href="/book">
                <Calendar className="mr-2 w-5 h-5" />
                Book Strategy Call Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              You'll receive a confirmation email with your booking details
            </p>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to jump straight in? You can start using your CRM right away.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
