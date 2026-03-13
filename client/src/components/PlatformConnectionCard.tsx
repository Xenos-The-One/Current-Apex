import { CheckCircle2, XCircle, RefreshCw, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PlatformKey =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "google_business"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "threads";

export interface PlatformConnectionStatus {
  platform: PlatformKey;
  connected: boolean;
  username?: string;
  pageName?: string;
  lastSync?: string;
}

const PLATFORM_META: Record<
  PlatformKey,
  { label: string; color: string; icon: string }
> = {
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    icon: "f",
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    icon: "ig",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    icon: "in",
  },
  twitter: {
    label: "X / Twitter",
    color: "#000000",
    icon: "𝕏",
  },
  google_business: {
    label: "Google Business",
    color: "#4285F4",
    icon: "G",
  },
  tiktok: {
    label: "TikTok",
    color: "#fe2c55",
    icon: "tt",
  },
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    icon: "▶",
  },
  pinterest: {
    label: "Pinterest",
    color: "#E60023",
    icon: "P",
  },
  threads: {
    label: "Threads",
    color: "#000000",
    icon: "@",
  },
};

interface PlatformConnectionCardProps {
  status: PlatformConnectionStatus;
  onConnect?: (platform: PlatformKey) => void;
  onDisconnect?: (platform: PlatformKey) => void;
  onReconnect?: (platform: PlatformKey) => void;
  isLoading?: boolean;
  compact?: boolean;
}

export function PlatformConnectionCard({
  status,
  onConnect,
  onDisconnect,
  onReconnect,
  isLoading,
  compact = false,
}: PlatformConnectionCardProps) {
  const meta = PLATFORM_META[status.platform];

  if (compact) {
    return (
      <div
        className="flex items-center gap-2.5 p-2.5 rounded-lg border transition-all"
        style={
          status.connected
            ? {
                background: `${meta.color}10`,
                borderColor: `${meta.color}30`,
              }
            : {
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
              }
        }
      >
        {/* Icon */}
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ background: meta.color }}
        >
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/90 truncate">{meta.label}</p>
          {status.connected && status.username && (
            <p className="text-[10px] text-white/40 truncate">@{status.username}</p>
          )}
        </div>
        {status.connected ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#22c55e" }} />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-white/25" />
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={
        status.connected
          ? {
              background: `${meta.color}08`,
              borderColor: `${meta.color}25`,
            }
          : {
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.07)",
            }
      }
    >
      <div className="flex items-start gap-3">
        {/* Platform icon */}
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: meta.color }}
        >
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-sm text-white/90">{meta.label}</p>
            {status.connected ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-1.5 py-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/35 bg-white/5 border border-white/10 rounded-full px-1.5 py-0.5">
                <XCircle className="h-2.5 w-2.5" />
                Not connected
              </span>
            )}
          </div>

          {status.connected ? (
            <div className="space-y-0.5">
              {status.pageName && (
                <p className="text-xs text-white/50">{status.pageName}</p>
              )}
              {status.username && (
                <p className="text-xs text-white/40">@{status.username}</p>
              )}
              {status.lastSync && (
                <p className="text-[10px] text-white/30">
                  Last synced: {status.lastSync}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/35">
              Connect your {meta.label} account to schedule posts
            </p>
          )}
        </div>

        {/* Action button */}
        <div className="shrink-0">
          {status.connected ? (
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReconnect?.(status.platform)}
                disabled={isLoading}
                className="h-7 px-2 text-xs border-white/10 text-white/50 hover:text-white/80"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnect?.(status.platform)}
                disabled={isLoading}
                className="h-7 px-2 text-xs border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40"
              >
                <Unlink className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => onConnect?.(status.platform)}
              disabled={isLoading}
              className="h-7 px-3 text-xs"
              style={{ background: meta.color, color: "#fff" }}
            >
              <Link2 className="h-3 w-3 mr-1" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PlatformConnectionGrid ───────────────────────────────────────────────────
interface PlatformConnectionGridProps {
  statuses: PlatformConnectionStatus[];
  onConnect?: (platform: PlatformKey) => void;
  onDisconnect?: (platform: PlatformKey) => void;
  onReconnect?: (platform: PlatformKey) => void;
  isLoading?: boolean;
}

export function PlatformConnectionGrid({
  statuses,
  onConnect,
  onDisconnect,
  onReconnect,
  isLoading,
}: PlatformConnectionGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {statuses.map((s) => (
        <PlatformConnectionCard
          key={s.platform}
          status={s}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onReconnect={onReconnect}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
