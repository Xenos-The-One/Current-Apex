import CRMLayout from "@/components/CRMLayout";
import { useAgency } from "@/contexts/AgencyContext";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Download,
  Filter,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  Tag,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// ─── Pipeline Tab ──────────────────────────────────────────────────────────
const LEAD_TYPE_TABS = [
  { value: "all", label: "All Leads" },
  { value: "borrower", label: "Borrowers" },
  { value: "re_agent", label: "RE Agents" },
  { value: "attorney", label: "Attorneys" },
  { value: "insurance", label: "Insurance" },
  { value: "title_co", label: "Title Co." },
  { value: "builder", label: "Builders" },
  { value: "lender", label: "Lenders" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-green-100 text-green-700",
  appointment_set: "bg-purple-100 text-purple-700",
  converted: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  nurturing: "bg-orange-100 text-orange-700",
};

function PipelineTab({ agencyId }: { agencyId: number }) {
  const [contactType, setContactType] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    contactType: "borrower" as const,
    source: "manual" as const,
  });

  const { data: leadsData, refetch } = trpc.leads.list.useQuery({
    agencyId,
    contactType: contactType !== "all" ? (contactType as any) : undefined,
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    limit: 50,
    offset: 0,
  });

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead added successfully");
      setShowAddLead(false);
      setNewLead({ firstName: "", lastName: "", email: "", phone: "", contactType: "borrower", source: "manual" });
      refetch();
    },
    onError: () => toast.error("Failed to add lead"),
  });

  const leads = leadsData?.leads ?? [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="appointment_set">Appt Set</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label>First Name *</Label>
                <Input value={newLead.firstName} onChange={e => setNewLead(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={newLead.lastName} onChange={e => setNewLead(p => ({ ...p, lastName: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Contact Type</Label>
                <Select value={newLead.contactType} onValueChange={v => setNewLead(p => ({ ...p, contactType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrower">Borrower</SelectItem>
                    <SelectItem value="re_agent">RE Agent</SelectItem>
                    <SelectItem value="attorney">Attorney</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="title_co">Title Co.</SelectItem>
                    <SelectItem value="builder">Builder</SelectItem>
                    <SelectItem value="lender">Lender</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select value={newLead.source} onValueChange={v => setNewLead(p => ({ ...p, source: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddLead(false)}>Cancel</Button>
              <Button
                onClick={() => createLead.mutate({ ...newLead, agencyId })}
                disabled={!newLead.firstName || createLead.isPending}
              >
                {createLead.isPending ? "Adding..." : "Add Lead"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lead type sub-tabs */}
      <Tabs value={contactType} onValueChange={setContactType}>
        <TabsList className="h-8 gap-0.5 bg-muted/50 flex-wrap">
          {LEAD_TYPE_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs h-7 px-3">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Leads table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Score</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Added</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No leads found. Add your first lead to get started.
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => (
                    <tr key={lead.id} className="border-b hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                            {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {lead.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</p>}
                          {lead.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs capitalize">{lead.contactType.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {lead.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{lead.source.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs font-medium">{lead.score ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Borrowers Tab ─────────────────────────────────────────────────────────
const MILESTONE_STEPS = [
  "inquiry", "pre_approval", "application", "processing",
  "underwriting", "conditional_approval", "clear_to_close", "closing", "funded",
];

function BorrowersTab({ agencyId }: { agencyId: number }) {
  const [search, setSearch] = useState("");
  const { data: borrowers = [] } = trpc.borrowers.list.useQuery({ agencyId, limit: 50, offset: 0 });
  type Borrower = (typeof borrowers)[number];

  const filtered = borrowers.filter((b: Borrower) =>
    !search || `${b.firstName} ${b.lastName} ${b.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search borrowers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" variant="outline"><Download className="w-4 h-4 mr-1.5" /> Export</Button>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No borrowers yet. Convert a qualified lead to get started.
            </CardContent>
          </Card>
        ) : (
          filtered.map((borrower: Borrower) => {
            const milestoneIdx = MILESTONE_STEPS.indexOf(borrower.currentMilestone ?? "inquiry");
            const progress = Math.round(((milestoneIdx + 1) / MILESTONE_STEPS.length) * 100);
            return (
              <Card key={borrower.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{borrower.firstName} {borrower.lastName}</p>
                        <p className="text-xs text-muted-foreground">{borrower.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${Number(borrower.loanAmount ?? 0).toLocaleString()}</p>
                      <Badge variant="outline" className="text-xs capitalize mt-0.5">
                        {(borrower.currentMilestone ?? "inquiry").replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Loan Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Referral Partners Tab ─────────────────────────────────────────────────
const PARTNER_TYPE_COLORS: Record<string, string> = {
  attorney: "bg-purple-100 text-purple-700",
  title_co: "bg-blue-100 text-blue-700",
  builder: "bg-orange-100 text-orange-700",
  re_agent: "bg-green-100 text-green-700",
  insurance: "bg-cyan-100 text-cyan-700",
  lender: "bg-yellow-100 text-yellow-700",
  accountant: "bg-pink-100 text-pink-700",
  financial_advisor: "bg-indigo-100 text-indigo-700",
  other: "bg-gray-100 text-gray-700",
};

function ReferralPartnersTab({ agencyId }: { agencyId: number }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: partners = [] } = trpc.contacts.listPartners.useQuery({ agencyId, limit: 50, offset: 0 });

  type Partner = (typeof partners)[number];
  const filtered = partners.filter((p: Partner) => {
    const matchSearch = !search || `${p.firstName} ${p.lastName} ${p.company} ${p.email}`.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.partnerType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search partners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="attorney">Attorney</SelectItem>
            <SelectItem value="title_co">Title Co.</SelectItem>
            <SelectItem value="builder">Builder</SelectItem>
            <SelectItem value="re_agent">RE Agent</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="lender">Lender</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No referral partners yet.
            </CardContent>
          </Card>
        ) : (
          filtered.map((partner: Partner) => (
            <Card key={partner.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{partner.firstName} {partner.lastName}</p>
                    {partner.company && <p className="text-xs text-muted-foreground truncate">{partner.company}</p>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${PARTNER_TYPE_COLORS[partner.partnerType] ?? "bg-gray-100 text-gray-700"}`}>
                      {partner.partnerType.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {partner.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />{partner.email}
                    </p>
                  )}
                  {partner.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />{partner.phone}
                    </p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{partner.referralCount ?? 0} referrals</span>
                  <Badge variant={partner.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                    {partner.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Contacts Hub ─────────────────────────────────────────────────────
export default function ContactsHub() {
  const { agencyId } = useAgency();

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your leads, borrowers, and referral partner network</p>
        </div>

        <Tabs defaultValue="pipeline">
          <TabsList className="h-9">
            <TabsTrigger value="pipeline" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="borrowers" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Borrowers
            </TabsTrigger>
            <TabsTrigger value="referral-partners" className="gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Referral Partners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            <PipelineTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="borrowers" className="mt-4">
            <BorrowersTab agencyId={agencyId} />
          </TabsContent>
          <TabsContent value="referral-partners" className="mt-4">
            <ReferralPartnersTab agencyId={agencyId} />
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}
