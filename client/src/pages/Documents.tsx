import { useAuth } from "@/_core/hooks/useAuth";
import CRMLayout from "@/components/CRMLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Download,
  ExternalLink,
  File,
  FileText,
  FolderOpen,
  Lock,
  Plus,
  Share2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const DOC_TYPE_ICONS: Record<string, any> = {
  application: FileText,
  pay_stub: FileText,
  tax_return: FileText,
  bank_statement: FileText,
  id_document: Lock,
  credit_report: FileText,
  property_appraisal: FileText,
  other: File,
};

const DOC_TYPE_COLORS: Record<string, string> = {
  application: "bg-blue-100 text-blue-700",
  pay_stub: "bg-green-100 text-green-700",
  tax_return: "bg-amber-100 text-amber-700",
  bank_statement: "bg-purple-100 text-purple-700",
  id_document: "bg-red-100 text-red-700",
  credit_report: "bg-teal-100 text-teal-700",
  property_appraisal: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};

function UploadDocumentDialog({ agencyId, onSuccess }: { agencyId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ borrowerId: "", documentType: "other", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => { toast.success("Document uploaded"); setOpen(false); setFile(null); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a file"); return; }
    // Convert file to base64 for upload
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        agencyId,
        borrowerId: form.borrowerId ? parseInt(form.borrowerId) : undefined,
        type: form.documentType as any,
        notes: form.description || undefined,
        name: file.name,
        fileSize: file.size,
        mimeType: file.type,
        base64Data: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Upload className="w-4 h-4 mr-1.5" /> Upload Document</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            {file ? (
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">Click to select file</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG up to 16MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Borrower ID</Label><Input type="number" value={form.borrowerId} onChange={e => setForm(f => ({ ...f, borrowerId: e.target.value }))} placeholder="Optional" /></div>
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={form.documentType} onValueChange={v => setForm(f => ({ ...f, documentType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(DOC_TYPE_ICONS).map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
          <Button type="submit" className="w-full" disabled={uploadMutation.isPending || !file}>{uploadMutation.isPending ? "Uploading..." : "Upload Document"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Documents() {
  const { user } = useAuth();
  const agencyId = (user as any)?.agencyId ?? 1;
  const [filterType, setFilterType] = useState("all");

  const { data: docs, refetch } = trpc.documents.list.useQuery({ agencyId, type: filterType === "all" ? undefined : filterType });

  const totalSize = docs?.reduce((s: number, d: any) => s + (d.fileSize || 0), 0) ?? 0;
  const formatSize = (bytes: number) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

  return (
    <CRMLayout agencyId={agencyId}>
      <div className="p-6 space-y-4 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Documents</h1>
            <p className="text-muted-foreground text-sm">{docs?.length ?? 0} documents · {formatSize(totalSize)} total</p>
          </div>
          <UploadDocumentDialog agencyId={agencyId} onSuccess={refetch} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(DOC_TYPE_ICONS).slice(0, 4).map(([type]) => {
            const count = docs?.filter((d: any) => d.documentType === type).length ?? 0;
            return (
              <div key={type} className="stat-card">
                <p className="text-sm text-muted-foreground capitalize">{type.replace(/_/g, " ")}</p>
                <p className="text-2xl font-bold font-display mt-0.5">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.keys(DOC_TYPE_ICONS).map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Document grid */}
        {docs?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {docs.map((doc: any) => {
              const Icon = DOC_TYPE_ICONS[doc.documentType] || File;
              const colorClass = DOC_TYPE_COLORS[doc.documentType] || "bg-gray-100 text-gray-600";
              return (
                <Card key={doc.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{doc.fileName || doc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.documentType?.replace(/_/g, " ")}</p>
                        {doc.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.description}</p>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {doc.fileSize && <span>{formatSize(doc.fileSize)} · </span>}
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.fileUrl && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toast.info("Share feature coming soon")}>
                          <Share2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No documents yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Upload borrower documents like applications, pay stubs, and tax returns</p>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
