import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

interface Agency {
  setupFeePaid: boolean | null;
  strategyCallBooked: boolean | null;
  avatarStatus: string | null;
  elevenLabsStatus: string | null;
  heygenStatus: string | null;
}

interface SetupStep {
  id: string;
  label: string;
  isComplete: boolean;
  status: "completed" | "in_progress" | "pending" | "not_started";
}

export function SetupProgressTracker({ agency }: { agency: Agency }) {
  const steps: SetupStep[] = [
    {
      id: "subscription",
      label: "Subscription Active",
      isComplete: !!agency.setupFeePaid, // Reusing the field - now means subscription is active
      status: agency.setupFeePaid ? "completed" : "pending",
    },
    {
      id: "onboarding",
      label: "Onboarding Complete",
      isComplete: !!agency.setupFeePaid,
      status: agency.setupFeePaid ? "completed" : "pending",
    },
    {
      id: "strategy_call",
      label: "Strategy Call",
      isComplete: !!agency.strategyCallBooked,
      status: agency.strategyCallBooked ? "completed" : "pending",
    },
    {
      id: "avatar",
      label: "AI Avatar Recording",
      isComplete: agency.avatarStatus === "completed",
      status: 
        agency.avatarStatus === "completed" ? "completed" :
        agency.avatarStatus === "in_progress" || agency.avatarStatus === "recording_scheduled" ? "in_progress" :
        "not_started",
    },
    {
      id: "elevenlabs",
      label: "ElevenLabs Account",
      isComplete: agency.elevenLabsStatus === "credentials_shared",
      status:
        agency.elevenLabsStatus === "credentials_shared" ? "completed" :
        agency.elevenLabsStatus === "active" || agency.elevenLabsStatus === "pending" ? "in_progress" :
        "not_started",
    },
    {
      id: "heygen",
      label: "HeyGen Account",
      isComplete: agency.heygenStatus === "credentials_shared",
      status:
        agency.heygenStatus === "credentials_shared" ? "completed" :
        agency.heygenStatus === "active" || agency.heygenStatus === "pending" ? "in_progress" :
        "not_started",
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const totalSteps = steps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const getStatusIcon = (status: SetupStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "pending":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "not_started":
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: SetupStep["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Complete</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-600">In Progress</Badge>;
      case "pending":
        return <Badge className="bg-orange-600">Pending</Badge>;
      case "not_started":
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Setup Progress</CardTitle>
            <CardDescription>
              {completedSteps} of {totalSteps} steps completed
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{progressPercentage}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(step.status)}
                <span className="font-medium">{step.label}</span>
              </div>
              {getStatusBadge(step.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
