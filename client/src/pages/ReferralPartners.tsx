import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Mail, Phone, Plus, Search, Star, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PARTNER_TYPE_COLORS: Record<string, string> = {
  re_agent: "bg-blue-100 text-blue-700",
  attorney: "bg-purple-100 text-purple-700",
  title_co: "bg-teal-100 text-teal-700",
  builder: "bg-amber-100 text-amber-700",
  insurance: "bg-orange-100 text-orange-700",
  lender: "bg-indigo-100 text-indigo-700",
  accountant: "bg-pink-100 text-pink-700",
  financial_advisor: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-600",
};

function AddPartnerDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", partnerType: "re_agent", notes: "" });
  const createMutation = trpc.contacts.createPartner.useMutation({
    onSuccess: () => { toast.success("Partner added"); setOpen(false); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Partner</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Referral Partner</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ agencyId, ...form as any }); }} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div className="space-y-1">
            <Label>Partner Type</Label>
            <Select value={form.partnerType} onValueChange={v => setForm(f => ({ ...f, partnerType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(PARTNER_TYPE_COLORS).map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label>Company</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Add Partner"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReferralPartners() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: partners, refetch } = trpc.contacts.listPartners.useQuery({
    agencyId,
    search: search || undefined,
    partnerType: typeFilter !== "all" ? typeFilter : undefined,
  });

  const deleteMutation = trpc.contacts.deletePartner.useMutation({
    onSuccess: () => { toast.success("Partner removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-4 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Referral Partners</h1>
            <p className="text-muted-foreground text-sm">{partners?.length ?? 0} partners in your network</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners..." className="pl-8 h-8 w-48 text-sm" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.keys(PARTNER_TYPE_COLORS).map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddPartnerDialog agencyId={agencyId} onSuccess={refetch} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {partners?.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700">
                      {p.firstName[0]}{p.lastName?.[0] || ""}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.firstName} {p.lastName}</p>
                      {p.company && <p className="text-xs text-muted-foreground">{p.company}</p>}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PARTNER_TYPE_COLORS[p.partnerType] || ""}`}>
                    {p.partnerType.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  {p.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" /> <span className="truncate">{p.email}</span>
                    </div>
                  )}
                  {p.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" /> <span>{p.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{p.referralCount || 0} referrals</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${p.status === "active" ? "border-green-300 text-green-700" : "border-gray-300 text-gray-500"}`}>
                    {p.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {partners?.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No referral partners yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Add your first referral partner to start tracking relationships</p>
            </div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
