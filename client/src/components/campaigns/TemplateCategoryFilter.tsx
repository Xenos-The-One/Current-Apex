import { cn } from "@/lib/utils";
import type { CampaignCategory, CampaignChannel } from "@/data/campaignTemplates";
import { CAMPAIGN_CATEGORIES } from "@/data/campaignTemplates";
import { Mail, MessageSquare, Phone, LayoutGrid } from "lucide-react";

interface TemplateCategoryFilterProps {
  selectedChannel: CampaignChannel | "all";
  selectedCategory: CampaignCategory | "all";
  onChannelChange: (channel: CampaignChannel | "all") => void;
  onCategoryChange: (category: CampaignCategory | "all") => void;
  counts: {
    all: number;
    email: number;
    sms: number;
    "ai-calling": number;
    byCategory: Record<string, number>;
  };
}

const CHANNEL_OPTIONS: { value: CampaignChannel | "all"; label: string; icon: React.ElementType; color: string }[] = [
  { value: "all", label: "All Channels", icon: LayoutGrid, color: "text-foreground" },
  { value: "email", label: "Email", icon: Mail, color: "text-purple-600" },
  { value: "sms", label: "SMS", icon: MessageSquare, color: "text-green-600" },
  { value: "ai-calling", label: "AI Calling", icon: Phone, color: "text-blue-600" },
];

export function TemplateCategoryFilter({
  selectedChannel,
  selectedCategory,
  onChannelChange,
  onCategoryChange,
  counts,
}: TemplateCategoryFilterProps) {
  return (
    <div className="space-y-4">
      {/* Channel tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
        {CHANNEL_OPTIONS.map(({ value, label, icon: Icon, color }) => {
          const count = value === "all" ? counts.all : counts[value as CampaignChannel];
          const isActive = selectedChannel === value;
          return (
            <button
              key={value}
              onClick={() => onChannelChange(value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? color : "")} />
              <span className="hidden sm:inline">{label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onCategoryChange("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-all",
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          All ({counts.all})
        </button>
        {CAMPAIGN_CATEGORIES.map((cat) => {
          const count = counts.byCategory[cat] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
