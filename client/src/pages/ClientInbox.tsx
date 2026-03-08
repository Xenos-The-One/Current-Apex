import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Inbox, Mail, MailOpen, Reply, Trash2, RefreshCw, Circle } from "lucide-react";

type InboundEmail = {
  id: number;
  fromEmail: string;
  fromName?: string | null;
  toEmail?: string | null;
  subject: string;
  body: string;
  htmlBody?: string | null;
  isRead: boolean;
  isReplied: boolean;
  repliedAt?: Date | null;
  replyBody?: string | null;
  createdAt: Date;
};

function EmailRow({
  email,
  onClick,
  onDelete,
}: {
  email: InboundEmail;
  onClick: () => void;
  onDelete: () => void;
}) {
  const timeStr = new Date(email.createdAt).toLocaleString();
  return (
    <div
      className={`flex items-start gap-3 p-4 border-b cursor-pointer hover:bg-muted/30 transition-colors ${!email.isRead ? "bg-blue-50/40" : ""}`}
      onClick={onClick}
    >
      <div className="mt-1 shrink-0">
        {!email.isRead ? (
          <Circle className="h-2.5 w-2.5 fill-blue-500 text-blue-500" />
        ) : (
          <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm ${!email.isRead ? "font-semibold" : "font-medium"}`}>
            {email.fromName || email.fromEmail}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{timeStr}</span>
        </div>
        <p className={`text-sm truncate ${!email.isRead ? "font-medium" : "text-muted-foreground"}`}>
          {email.subject}
        </p>
        <p className="text-xs text-muted-foreground truncate">{email.body.slice(0, 120)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {email.isReplied && (
          <Badge variant="outline" className="text-xs text-green-700 border-green-300">Replied</Badge>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmailDetail({
  email,
  onClose,
  onReplySuccess,
}: {
  email: InboundEmail;
  onClose: () => void;
  onReplySuccess: () => void;
}) {
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const replyMutation = trpc.notificationCenter.replyToEmail.useMutation();

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await replyMutation.mutateAsync({ id: email.id, replyBody });
      toast.success("Reply sent!", { description: `Sent to ${email.fromEmail}` });
      onReplySuccess();
      onClose();
    } catch (e: any) {
      toast.error("Reply failed", { description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1 border-b pb-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{email.fromName || email.fromEmail}</span>
          <span className="text-xs text-muted-foreground">{new Date(email.createdAt).toLocaleString()}</span>
        </div>
        <p className="text-xs text-muted-foreground">From: {email.fromEmail}</p>
        {email.toEmail && <p className="text-xs text-muted-foreground">To: {email.toEmail}</p>}
        <p className="font-medium">{email.subject}</p>
      </div>

      {email.htmlBody ? (
        <iframe
          srcDoc={email.htmlBody}
          className="w-full border rounded-lg bg-white"
          style={{ height: 300 }}
          sandbox="allow-same-origin"
          title="Email Body"
        />
      ) : (
        <div className="bg-muted/20 rounded-lg p-4 text-sm whitespace-pre-wrap">{email.body}</div>
      )}

      {email.isReplied && email.replyBody && (
        <div className="border-l-4 border-green-400 pl-3 bg-green-50/40 rounded-r-lg p-3">
          <p className="text-xs text-green-700 font-medium mb-1">Your previous reply:</p>
          <p className="text-sm whitespace-pre-wrap">{email.replyBody}</p>
        </div>
      )}

      <div className="border rounded-lg p-3 space-y-2 bg-muted/10">
        <p className="text-xs font-medium text-muted-foreground">Reply to {email.fromEmail}</p>
        <Textarea
          placeholder="Type your reply..."
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          Your signature (Tim Haskins | Lock In Loans | NMLS #1116876) will be added automatically.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={handleReply} disabled={!replyBody.trim() || sending}>
          <Reply className="h-4 w-4 mr-2" />
          {sending ? "Sending..." : "Send Reply"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ClientInbox() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<"all" | "unread" | "unreplied">("all");
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);

  const queryInput = {
    page: 1,
    limit: 100,
    isRead: filter === "unread" ? false : undefined,
    isReplied: filter === "unreplied" ? false : undefined,
  };
  const { data, isLoading, refetch } = trpc.notificationCenter.getInboundEmails.useQuery(queryInput, {
    refetchInterval: 30000,
  });
  const { data: stats } = trpc.notificationCenter.getInboundEmailStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const markRead = trpc.notificationCenter.markEmailRead.useMutation({
    onSuccess: () => utils.notificationCenter.getInboundEmails.invalidate(),
  });
  const deleteEmail = trpc.notificationCenter.deleteInboundEmail.useMutation({
    onSuccess: () => {
      utils.notificationCenter.getInboundEmails.invalidate();
      utils.notificationCenter.getInboundEmailStats.invalidate();
      toast.success("Email deleted");
    },
  });

  const handleOpen = (email: InboundEmail) => {
    setSelectedEmail(email);
    if (!email.isRead) markRead.mutate({ id: email.id });
  };

  const emails = data?.emails ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Inbox className="h-6 w-6 text-primary" />
              Client Inbox
              {(stats?.unread ?? 0) > 0 && (
                <Badge className="bg-blue-500 text-white text-xs ml-1">{stats?.unread} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Client replies to your campaign emails appear here. Reply directly from this inbox.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: stats?.total ?? 0, icon: Mail },
            { label: "Unread", value: stats?.unread ?? 0, icon: MailOpen, highlight: (stats?.unread ?? 0) > 0 },
            { label: "Awaiting Reply", value: stats?.unreplied ?? 0, icon: Reply, highlight: (stats?.unreplied ?? 0) > 0 },
          ].map(s => (
            <Card key={s.label} className={s.highlight ? "border-blue-300 bg-blue-50/40" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.highlight ? "text-blue-500" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          {(["all", "unread", "unreplied"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f === "all" ? "All" : f === "unread" ? "Unread" : "Awaiting Reply"}
            </Button>
          ))}
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading emails...
            </div>
          ) : emails.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No emails yet</p>
              <p className="text-sm mt-1">
                When clients reply to your campaign emails, they'll appear here.
              </p>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left text-xs text-amber-800 max-w-md mx-auto">
                <strong>Setup required:</strong> To receive client replies automatically, configure SendGrid Inbound Parse to forward emails sent to <code>reply@lockinloans.com</code> to <code>/api/webhooks/inbound-email</code>. Contact your admin to complete this one-time setup.
              </div>
            </div>
          ) : (
            <div>
              {emails.map(email => (
                <EmailRow
                  key={email.id}
                  email={email as InboundEmail}
                  onClick={() => handleOpen(email as InboundEmail)}
                  onDelete={() => deleteEmail.mutate({ id: email.id })}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {selectedEmail && (
        <Dialog open onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Reply className="h-4 w-4" />
                {selectedEmail.subject}
              </DialogTitle>
            </DialogHeader>
            <EmailDetail
              email={selectedEmail}
              onClose={() => setSelectedEmail(null)}
              onReplySuccess={() => {
                utils.notificationCenter.getInboundEmails.invalidate();
                utils.notificationCenter.getInboundEmailStats.invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
