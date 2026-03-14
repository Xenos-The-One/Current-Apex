import { Mail, MessageSquare, Phone, Clock, Users, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CampaignTemplate, CampaignChannel } from "@/data/campaignTemplates";
import { CHANNEL_COLORS, BADGE_STYLES } from "@/data/campaignTemplates";

const CHANNEL_ICONS: Record<CampaignChannel, React.ElementType> = {
  email: Mail,
  sms: MessageSquare,
  "ai-calling": Phone,
};

interface CampaignTemplateCardProps {
  template: CampaignTemplate;
  onPreview: (template: CampaignTemplate) => void;
  onUse: (template: CampaignTemplate) => void;
}

export function CampaignTemplateCard({ template, onPreview, onUse }: CampaignTemplateCardProps) {
  const colors = CHANNEL_COLORS[template.channel];
  const ChannelIcon = CHANNEL_ICONS[template.channel];

  return (
    <Card className="group relative flex flex-col overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer bg-card">
      {/* Top accent bar */}
      <div
        className={`h-1 w-full ${
          template.channel === "email"
            ? "bg-purple-500"
            : template.channel === "sms"
            ? "bg-green-500"
            : "bg-blue-500"
        }`}
      />

      <CardContent className="flex flex-col gap-3 p-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
            <ChannelIcon className={`h-3.5 w-3.5 ${colors.icon}`} />
            {template.channel === "email" ? "Email" : template.channel === "sms" ? "SMS" : "AI Calling"}
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground border-border/50 shrink-0">
            {template.category}
          </Badge>
        </div>

        {/* Title & description */}
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {template.description}
          </p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {template.stepCount} {template.stepCount === 1 ? "message" : "messages"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.estimatedDuration}
          </span>
        </div>

        {/* Audience */}
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{template.recommendedAudience}</span>
        </div>

        {/* Badges */}
        {template.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.badges.slice(0, 3).map((badge) => (
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

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(template);
            }}
          >
            Preview
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs h-8 gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onUse(template);
            }}
          >
            Use Template
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
