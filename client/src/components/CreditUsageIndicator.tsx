import { Zap } from "lucide-react";

// Credit costs per content type (UI layer — not connected to billing yet)
export const CONTENT_CREDIT_COSTS: Record<string, number> = {
  // Social Media (cheap)
  "social-post": 1,
  // Short-form
  "press-release": 2,
  "product-description": 2,
  "newsletter": 2,
  // Mid-range
  "blog-post": 3,
  "how-to": 3,
  "listicle": 3,
  "news": 2,
  "landing-page": 3,
  "video-script": 3,
  // Long-form (expensive)
  "case-study": 5,
  "guide": 5,
  "email-sequence": 4,
  "whitepaper": 6,
};

interface CreditUsageIndicatorProps {
  contentType: string;
  className?: string;
  variant?: "inline" | "badge" | "card";
}

export function CreditUsageIndicator({
  contentType,
  className = "",
  variant = "inline",
}: CreditUsageIndicatorProps) {
  const credits = CONTENT_CREDIT_COSTS[contentType] ?? 2;

  if (variant === "badge") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${className}`}
        style={{
          background: "rgba(0,255,255,0.08)",
          borderColor: "rgba(0,255,255,0.2)",
          color: "rgba(0,255,255,0.85)",
        }}
      >
        <Zap className="h-3 w-3" />
        {credits} {credits === 1 ? "credit" : "credits"}
      </span>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-lg p-3 flex items-center gap-3 ${className}`}
        style={{
          background: "rgba(0,255,255,0.06)",
          border: "1px solid rgba(0,255,255,0.15)",
        }}
      >
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(0,255,255,0.12)" }}
        >
          <Zap className="h-4 w-4" style={{ color: "#00FFFF" }} />
        </div>
        <div>
          <p className="text-xs font-semibold text-white/90">
            Estimated cost: {credits} AI {credits === 1 ? "credit" : "credits"}
          </p>
          <p className="text-[11px] text-white/45 mt-0.5">
            {credits <= 2
              ? "Quick generation"
              : credits <= 3
              ? "Standard generation"
              : "Long-form — may take 30–60 seconds"}
          </p>
        </div>
      </div>
    );
  }

  // inline
  return (
    <span className={`inline-flex items-center gap-1 text-xs text-white/50 ${className}`}>
      <Zap className="h-3 w-3 text-cyan-400/70" />
      {credits} {credits === 1 ? "credit" : "credits"}
    </span>
  );
}
