import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PhoneCall, MessageSquare, Clock, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface SuggestedFollowUpsProps {
  className?: string;
}

export default function SuggestedFollowUpsPanel({ className }: SuggestedFollowUpsProps) {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.followUps.getSuggested.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const suggestions = data?.suggestions;
  const makeCall = trpc.vapi.makeCall.useMutation({
    onSuccess: () => toast.success("AI call initiated"),
    onError: (e) => toast.error(e.message),
  });

  const items = suggestions?.slice(0, 5) ?? [];

  const channelIcon = (action: string) => {
    if (action?.toLowerCase().includes("call")) return <PhoneCall className="h-3.5 w-3.5" />;
    if (action?.toLowerCase().includes("sms") || action?.toLowerCase().includes("text")) return <MessageSquare className="h-3.5 w-3.5" />;
    return <PhoneCall className="h-3.5 w-3.5" />;
  };

  const urgencyColor = (urgency: string) => {
    if (urgency === "high") return "destructive";
    if (urgency === "medium") return "secondary";
    return "outline";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Suggested Follow-Ups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading suggestions...
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No follow-ups needed right now. Great work!
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.leadId}
                  className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/leads/${item.leadId}`)}
                >
                  <div className="flex-shrink-0 mt-0.5 text-primary">
                    {channelIcon(item.suggestedAction)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.leadName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant={urgencyColor(item.urgency) as any} className="text-xs px-1.5 py-0">
                      {item.urgency}
                    </Badge>
                    {item.suggestedAction?.toLowerCase().includes("call") && item.phone && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          makeCall.mutate({ leadId: item.leadId, phoneNumber: item.phone! });
                        }}
                      >
                        <PhoneCall className="h-3 w-3" />
                      </Button>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </li>
              ))}
            </ul>
            {(suggestions?.length ?? 0) > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => navigate("/follow-up-actions")}
              >
                View all {suggestions?.length} follow-ups
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
            {data?.summary && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                {data.summary}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
