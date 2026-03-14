import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  MessageSquare,
  Phone,
  Clock,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Target,
  Mic,
  CheckCircle2,
} from "lucide-react";
import type { CampaignTemplate, CampaignChannel } from "@/data/campaignTemplates";
import { CHANNEL_COLORS, BADGE_STYLES } from "@/data/campaignTemplates";

const CHANNEL_ICONS: Record<CampaignChannel, React.ElementType> = {
  email: Mail,
  sms: MessageSquare,
  "ai-calling": Phone,
};

interface TemplatePreviewDrawerProps {
  template: CampaignTemplate | null;
  open: boolean;
  onClose: () => void;
  onUse: (template: CampaignTemplate) => void;
}

function EmailStepPreview({ step }: { step: NonNullable<CampaignTemplate["emailSteps"]>[number] }) {
  const [expanded, setExpanded] = useState(step.stepNumber === 1);

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
            {step.stepNumber}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{step.subject}</p>
            {step.delayDays > 0 && (
              <p className="text-xs text-muted-foreground">
                Sent {step.delayDays} day{step.delayDays !== 1 ? "s" : ""} after previous
              </p>
            )}
            {step.delayDays === 0 && step.stepNumber === 1 && (
              <p className="text-xs text-muted-foreground">Sent immediately</p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border/60 p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground mb-2 italic">Preview: {step.previewText}</p>
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {step.body}
          </pre>
        </div>
      )}
    </div>
  );
}

function SmsStepPreview({ step }: { step: NonNullable<CampaignTemplate["smsSteps"]>[number] }) {
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold shrink-0 mt-0.5">
          {step.stepNumber}
        </div>
        <div className="min-w-0 flex-1">
          {step.delayDays > 0 && (
            <p className="text-xs text-muted-foreground mb-1.5">
              Sent {step.delayDays} day{step.delayDays !== 1 ? "s" : ""} after previous
            </p>
          )}
          {step.delayDays === 0 && step.stepNumber === 1 && (
            <p className="text-xs text-muted-foreground mb-1.5">Sent immediately</p>
          )}
          <div className="rounded-2xl rounded-tl-sm bg-green-50 border border-green-100 px-3 py-2">
            <p className="text-sm text-foreground leading-relaxed">{step.message}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-right">
            {step.message.length} chars · {Math.ceil(step.message.length / 160)} SMS segment{Math.ceil(step.message.length / 160) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function AiCallStepPreview({ step }: { step: NonNullable<CampaignTemplate["aiCallSteps"]>[number] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
            {step.stepNumber}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{step.objective}</p>
            {step.delayDays > 0 && (
              <p className="text-xs text-muted-foreground">
                Called {step.delayDays} day{step.delayDays !== 1 ? "s" : ""} after previous
              </p>
            )}
            {step.delayDays === 0 && (
              <p className="text-xs text-muted-foreground">Called immediately</p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border/60 p-3 space-y-3 bg-muted/20">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Opening Line</p>
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
              <p className="text-sm text-foreground italic">"{step.intro}"</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Qualifying Questions</p>
            <ul className="space-y-1">
              {step.qualifyingQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="text-blue-500 font-bold mt-0.5 shrink-0">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Booking Goal</p>
            <p className="text-xs text-foreground">{step.bookingGoal}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Expected Outcomes</p>
            <div className="flex flex-wrap gap-1">
              {step.expectedOutcomes.map((outcome) => (
                <span key={outcome} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {outcome}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TemplatePreviewDrawer({ template, open, onClose, onUse }: TemplatePreviewDrawerProps) {
  if (!template) return null;

  const colors = CHANNEL_COLORS[template.channel];
  const ChannelIcon = CHANNEL_ICONS[template.channel];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        {/* Header */}
        <div className={`p-5 border-b border-border/60 ${colors.bg}`}>
          <SheetHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
                <ChannelIcon className={`h-3.5 w-3.5 ${colors.icon}`} />
                {template.channel === "email" ? "Email" : template.channel === "sms" ? "SMS" : "AI Calling"}
              </div>
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
            </div>
            <SheetTitle className="text-lg leading-tight">{template.name}</SheetTitle>
            <SheetDescription className="text-sm leading-relaxed">
              {template.description}
            </SheetDescription>
          </SheetHeader>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {template.estimatedDuration}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {template.stepCount} {template.stepCount === 1 ? "message" : "messages"}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {template.recommendedAudience}
            </span>
          </div>

          {/* Badges */}
          {template.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.badges.map((badge) => (
                <span
                  key={badge}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    BADGE_STYLES[badge] ?? "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Calling specific meta */}
        {template.channel === "ai-calling" && template.callObjective && (
          <div className="px-5 py-3 border-b border-border/60 bg-blue-50/50 space-y-2">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-0.5">Call Objective</p>
                <p className="text-xs text-foreground">{template.callObjective}</p>
              </div>
            </div>
            {template.assistantType && (
              <div className="flex items-start gap-2">
                <Mic className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Assistant Type</p>
                  <p className="text-xs text-foreground">{template.assistantType}</p>
                </div>
              </div>
            )}
            {template.callFlowSummary && (
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-0.5">Call Flow</p>
                  <p className="text-xs text-foreground">{template.callFlowSummary}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Steps */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              {template.channel === "email"
                ? "Email Sequence"
                : template.channel === "sms"
                ? "SMS Sequence"
                : "Call Script"}
            </h4>
            {template.emailSteps?.map((step) => (
              <EmailStepPreview key={step.stepNumber} step={step} />
            ))}
            {template.smsSteps?.map((step) => (
              <SmsStepPreview key={step.stepNumber} step={step} />
            ))}
            {template.aiCallSteps?.map((step) => (
              <AiCallStepPreview key={step.stepNumber} step={step} />
            ))}
          </div>
        </ScrollArea>

        {/* Footer CTA */}
        <div className="p-4 border-t border-border/60 bg-background">
          <Button
            className="w-full gap-2"
            onClick={() => {
              onClose();
              onUse(template);
            }}
          >
            Use This Template
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
