import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PhoneCall, MessageSquare, Mail, Clock, ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface SuggestedFollowUpsProps {
  className?: string;
}

export default function SuggestedFollowUpsPanel({ className }: SuggestedFollowUpsProps) {
  const [, navigate] = useLocation();
  const { data, isLoading, refetch } = trpc.followUps.getSuggested.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const suggestions = data?.suggestions ?? [];

  const makeCall = trpc.vapi.makeCall.useMutation({
    onSuccess: () => {
      toast.success("AI call initiated");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const sendSms = trpc.followUps.sendFollowUpSMS.useMutation({
    onSuccess: (result) => {
      toast.success(result.demo ? "SMS logged (demo mode)" : "SMS sent successfully");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const sendEmail = trpc.followUps.sendFollowUpEmail.useMutation({
    onSuccess: () => {
      toast.success("Follow-up email sent");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const urgencyColor = (urgency: string) => {
    if (urgency === "high") return "destructive";
    if (urgency === "medium") return "secondary";
    return "outline";
  };

  const urgencyDot = (urgency: string) => {
    if (urgency === "high") return "bg-red-500";
    if (urgency === "medium") return "bg-amber-500";
    return "bg-blue-400";
  };

  const displayItems = suggestions.slice(0, 3);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Suggested Follow-Ups
          {suggestions.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs font-normal">
              {suggestions.length} lead{suggestions.length > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading suggestions...
          </div>
        ) : displayItems.length === 0 ? (
          <div className="py-3 text-center">
            <p className="text-sm text-muted-foreground">All leads are on track.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Great work staying on top of follow-ups!</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {displayItems.map((item) => (
                <li
                  key={item.leadId}
                  className="rounded-lg border border-border/60 bg-muted/30 p-2.5 hover:bg-muted/50 transition-colors"
                >
                  {/* Lead name + urgency */}
                  <div
                    className="flex items-center gap-2 mb-2 cursor-pointer"
                    onClick={() => navigate(`/leads/${item.leadId}`)}
                  >
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${urgencyDot(item.urgency)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {item.leadName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.reason}</p>
                    </div>
                    <Badge
                      variant={urgencyColor(item.urgency) as any}
                      className="text-[10px] px-1.5 py-0 flex-shrink-0"
                    >
                      {item.urgency}
                    </Badge>
                  </div>

                  {/* 3 action buttons: Call, SMS, Email */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 bg-background hover:bg-green-50 hover:border-green-400 hover:text-green-700 dark:hover:bg-green-950/30 dark:hover:text-green-400 transition-colors"
                      disabled={!item.phone || makeCall.isPending}
                      onClick={() => {
                        if (!item.phone) {
                          toast.error("No phone number for this lead");
                          return;
                        }
                        makeCall.mutate({ leadId: item.leadId, phoneNumber: item.phone });
                      }}
                      title={item.phone ? `Call ${item.phone}` : "No phone number"}
                    >
                      <PhoneCall className="h-3 w-3" />
                      Call
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 bg-background hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-colors"
                      disabled={!item.phone || sendSms.isPending}
                      onClick={() => {
                        if (!item.phone) {
                          toast.error("No phone number for this lead");
                          return;
                        }
                        sendSms.mutate({
                          leadId: item.leadId,
                          message: `Hi ${item.leadName.split(" ")[0]}, this is a follow-up from our team. Are you still interested in learning more? Reply YES to schedule a quick call.`,
                        });
                      }}
                      title={item.phone ? `SMS ${item.phone}` : "No phone number"}
                    >
                      <MessageSquare className="h-3 w-3" />
                      SMS
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 bg-background hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700 dark:hover:bg-purple-950/30 dark:hover:text-purple-400 transition-colors"
                      disabled={!item.email || sendEmail.isPending}
                      onClick={() => {
                        if (!item.email) {
                          toast.error("No email address for this lead");
                          return;
                        }
                        sendEmail.mutate({
                          leadId: item.leadId,
                          subject: `Following up — ${item.leadName.split(" ")[0]}, are you still interested?`,
                          body: `Hi ${item.leadName.split(" ")[0]},\n\nI wanted to follow up and see if you had any questions or if you're ready to take the next step.\n\nFeel free to reply to this email or book a call at your convenience.\n\nLooking forward to connecting!`,
                        });
                      }}
                      title={item.email ? `Email ${item.email}` : "No email address"}
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {suggestions.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground mt-1"
                onClick={() => navigate("/follow-up-actions")}
              >
                View all {suggestions.length} follow-ups
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}

            {data?.summary && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-1 leading-relaxed">
                {data.summary}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
