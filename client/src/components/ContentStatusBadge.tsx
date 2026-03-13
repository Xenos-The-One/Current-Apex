import { Badge } from "@/components/ui/badge";
import {
  Clock, CheckCircle2, XCircle, AlertCircle, Eye, Send, FileText, RefreshCw,
} from "lucide-react";

export type ContentStatus =
  | "draft"
  | "in_progress"
  | "pending_approval"
  | "in_review"
  | "revision_requested"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "archived";

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  draft: {
    label: "Draft",
    icon: FileText,
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  },
  in_progress: {
    label: "In Progress",
    icon: RefreshCw,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  pending_approval: {
    label: "Pending Approval",
    icon: Clock,
    className: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  },
  in_review: {
    label: "In Review",
    icon: Eye,
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  },
  revision_requested: {
    label: "Revision Requested",
    icon: AlertCircle,
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-green-500/15 text-green-400 border-green-500/20",
  },
  scheduled: {
    label: "Scheduled",
    icon: Send,
    className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  },
  published: {
    label: "Published",
    icon: Eye,
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/15 text-red-400 border-red-500/20",
  },
  archived: {
    label: "Archived",
    icon: FileText,
    className: "bg-zinc-700/30 text-zinc-500 border-zinc-700/30",
  },
};

interface ContentStatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function ContentStatusBadge({
  status,
  showIcon = true,
  size = "md",
}: ContentStatusBadgeProps) {
  const config = STATUS_CONFIG[status as ContentStatus] ?? STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.className} ${
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      }`}
    >
      {showIcon && <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      {config.label}
    </span>
  );
}
