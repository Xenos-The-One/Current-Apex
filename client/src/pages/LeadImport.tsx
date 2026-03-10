import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAgency } from "@/contexts/AgencyContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Users,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

// CRM field definitions for mapping
const CRM_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "source", label: "Lead Source", required: false },
  { key: "loanType", label: "Loan Type", required: false },
  { key: "propertyAddress", label: "Property Address", required: false },
  { key: "propertyCity", label: "Property City", required: false },
  { key: "propertyState", label: "Property State", required: false },
  { key: "propertyZip", label: "Property Zip", required: false },
  { key: "notes", label: "Notes", required: false },
  { key: "referringAgent", label: "Referring Agent", required: false },
  { key: "referringBrokerage", label: "Referring Brokerage", required: false },
  { key: "_skip", label: "— Skip this column —", required: false },
] as const;

type CrmFieldKey = (typeof CRM_FIELDS)[number]["key"];

// Auto-detect column mapping from header names
function autoDetectMapping(headers: string[]): Record<string, CrmFieldKey> {
  const mapping: Record<string, CrmFieldKey> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-\.]+/g, "");

  const patterns: Record<string, CrmFieldKey> = {
    firstname: "firstName",
    first: "firstName",
    fname: "firstName",
    lastname: "lastName",
    last: "lastName",
    lname: "lastName",
    email: "email",
    emailaddress: "email",
    phone: "phone",
    phonenumber: "phone",
    mobile: "phone",
    cell: "phone",
    cellphone: "phone",
    source: "source",
    leadsource: "source",
    loansource: "source",
    loantype: "loanType",
    type: "loanType",
    producttype: "loanType",
    address: "propertyAddress",
    propertyaddress: "propertyAddress",
    streetaddress: "propertyAddress",
    city: "propertyCity",
    propertycity: "propertyCity",
    state: "propertyState",
    propertystate: "propertyState",
    zip: "propertyZip",
    zipcode: "propertyZip",
    postalcode: "propertyZip",
    notes: "notes",
    note: "notes",
    comments: "notes",
    comment: "notes",
    referringagent: "referringAgent",
    agent: "referringAgent",
    referringbrokerage: "referringBrokerage",
    brokerage: "referringBrokerage",
  };

  for (const header of headers) {
    const key = normalize(header);
    mapping[header] = patterns[key] ?? "_skip";
  }
  return mapping;
}

type ImportStep = "upload" | "map" | "preview" | "done";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function LeadImport() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { agencyId } = useAgency();
  const { impersonatingClientId } = useImpersonation();

  const isAdmin = (user as any)?.role === "admin" || (user as any)?.role === "super_admin";

  // Step state
  const [step, setStep] = useState<ImportStep>("upload");

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, CrmFieldKey>>({});

  // Client selection (admin only)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    impersonatingClientId ?? null
  );

  // Import state
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Fetch clients for admin selector
  const { data: clientsData } = trpc.admin.listClients.useQuery(
    { agencyId },
    { enabled: isAdmin && agencyId > 0 }
  );

  const bulkImport = trpc.leads.bulkImport.useMutation();

  // Parse file (CSV or Excel)
  const parseFile = useCallback(async (f: File) => {
    const arrayBuffer = await f.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
      raw: false,
      defval: "",
    });

    if (jsonData.length === 0) {
      toast.error("No data found in file");
      return;
    }

    const hdrs = Object.keys(jsonData[0]);
    setHeaders(hdrs);
    setRows(jsonData);
    setMapping(autoDetectMapping(hdrs));
    setStep("map");
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const name = f.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast.error("Please select a CSV or Excel (.xlsx/.xls) file");
      return;
    }

    setFile(f);
    setResult(null);
    parseFile(f);
  };

  const handleImport = async () => {
    if (!file || rows.length === 0) return;

    const clientId = selectedClientId ?? impersonatingClientId;
    if (!clientId && isAdmin) {
      toast.error("Please select a client to import leads for");
      return;
    }
    if (!clientId) {
      toast.error("Unable to determine client account");
      return;
    }

    setImporting(true);

    try {
      // Map rows to lead objects
      const leadsToImport = rows.map((row) => {
        const lead: Record<string, string | number | undefined> = {};
        for (const [header, crmKey] of Object.entries(mapping)) {
          if (crmKey === "_skip") continue;
          const value = row[header]?.trim();
          if (value) lead[crmKey] = value;
        }
        return lead;
      });

      // Filter out rows missing required fields
      const errors: string[] = [];
      const validLeads: typeof leadsToImport = [];

      for (let i = 0; i < leadsToImport.length; i++) {
        const lead = leadsToImport[i];
        if (!lead.firstName || !lead.lastName) {
          errors.push(`Row ${i + 2}: Missing first or last name`);
          continue;
        }
        if (!lead.email && !lead.phone) {
          errors.push(`Row ${i + 2}: Missing both email and phone for ${lead.firstName} ${lead.lastName}`);
          continue;
        }
        // Ensure phone is string
        if (lead.phone) {
          const digits = String(lead.phone).replace(/\D/g, "");
          if (digits.length === 10) lead.phone = `+1${digits}`;
          else if (digits.length === 11 && digits.startsWith("1")) lead.phone = `+${digits}`;
          else lead.phone = String(lead.phone);
        }
        validLeads.push(lead);
      }

      if (validLeads.length === 0) {
        setResult({ success: 0, failed: errors.length, errors });
        setStep("done");
        setImporting(false);
        return;
      }

      const res = await bulkImport.mutateAsync({
        agencyId,
        clientId,
        leads: validLeads as any,
      });

      setResult({
        success: res.imported,
        failed: errors.length,
        errors,
      });
      setStep("done");
      toast.success(`Successfully imported ${res.imported} lead${res.imported !== 1 ? "s" : ""}`);
      if (errors.length > 0) {
        toast.warning(`${errors.length} row${errors.length !== 1 ? "s" : ""} skipped due to missing data`);
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["first name", "last name", "email", "phone", "source", "loan type", "notes"],
      ["John", "Doe", "john@example.com", "5551234567", "Facebook Ad", "DSCR", "Interested in rental property"],
      ["Jane", "Smith", "jane@example.com", "5559876543", "Referral", "Fix & Flip", "Looking for 90-day bridge"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "lead_import_template.xlsx");
  };

  const resetImport = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setStep("upload");
  };

  // Determine which client name to show
  const selectedClientName = clientsData?.find((c: any) => c.id === selectedClientId)?.name;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Import Leads</h1>
            <p className="text-muted-foreground text-sm">
              Upload a CSV or Excel file to bulk-import leads into the pipeline
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm">
          {(["upload", "map", "preview", "done"] as ImportStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["map", "preview", "done"].indexOf(step) > ["upload", "map", "preview", "done"].indexOf(s)
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["map", "preview", "done"].indexOf(step) > ["upload", "map", "preview", "done"].indexOf(s) ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={step === s ? "font-medium" : "text-muted-foreground"}
              >
                {s === "upload" ? "Upload File" : s === "map" ? "Map Fields" : s === "preview" ? "Review" : "Done"}
              </span>
              {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Client selector (admin only) */}
            {isAdmin && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Select Client Account
                  </CardTitle>
                  <CardDescription>Choose which client these leads belong to</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedClientId?.toString() ?? ""}
                    onValueChange={(v) => setSelectedClientId(Number(v))}
                  >
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder="Select a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsData?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedClientName && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Leads will be imported into <strong>{selectedClientName}</strong>'s pipeline
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
                <CardDescription>Supports CSV and Excel (.xlsx, .xls) files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, or XLS — up to 10,000 rows</p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button variant="outline" onClick={downloadTemplate} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel Template
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Field Mapping */}
        {step === "map" && (
          <Card>
            <CardHeader>
              <CardTitle>Map Your Columns</CardTitle>
              <CardDescription>
                We auto-detected {headers.length} columns from <strong>{file?.name}</strong> ({rows.length} rows).
                Adjust the mapping below if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Your Column</TableHead>
                      <TableHead>Sample Data</TableHead>
                      <TableHead>Maps To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headers.map((header) => (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {rows[0]?.[header] || <span className="italic">empty</span>}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping[header] ?? "_skip"}
                            onValueChange={(v) =>
                              setMapping((prev) => ({ ...prev, [header]: v as CrmFieldKey }))
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CRM_FIELDS.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                  {f.required && (
                                    <span className="text-red-500 ml-1">*</span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={resetImport}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep("preview")}>
                  Preview Import
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Review Before Import</CardTitle>
              <CardDescription>
                {rows.length} rows ready to import
                {selectedClientName && (
                  <> into <strong>{selectedClientName}</strong>'s pipeline</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">{rows.length}</p>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">
                    {Object.values(mapping).filter((v) => v !== "_skip").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Fields Mapped</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">
                    {Object.values(mapping).filter((v) => v === "_skip").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Columns Skipped</p>
                </div>
              </div>

              {/* Preview table (first 5 rows) */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Preview (first 5 rows)</Label>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.entries(mapping)
                          .filter(([, v]) => v !== "_skip")
                          .map(([header, crmKey]) => (
                            <TableHead key={header}>
                              {CRM_FIELDS.find((f) => f.key === crmKey)?.label ?? crmKey}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {Object.entries(mapping)
                            .filter(([, v]) => v !== "_skip")
                            .map(([header]) => (
                              <TableCell key={header} className="text-sm">
                                {row[header] || <span className="text-muted-foreground italic">—</span>}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {rows.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    + {rows.length - 5} more rows not shown
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("map")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Importing {rows.length} leads...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {rows.length} Leads
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Done */}
        {step === "done" && result && (
          <Card>
            <CardHeader>
              <CardTitle>Import Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    <strong className="text-green-600">{result.success} leads imported successfully</strong>
                    {selectedClientName && (
                      <span className="text-muted-foreground"> into {selectedClientName}'s pipeline</span>
                    )}
                  </AlertDescription>
                </Alert>

                {result.failed > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{result.failed} rows skipped</strong> — missing required fields
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {result.errors.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-destructive">Skipped rows:</Label>
                  <div className="mt-2 p-3 bg-destructive/10 rounded-lg max-h-48 overflow-y-auto">
                    <ul className="text-sm space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index} className="text-destructive">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Link href="/leads">
                  <Button>
                    <Users className="w-4 h-4 mr-2" />
                    View Leads
                  </Button>
                </Link>
                <Button variant="outline" onClick={resetImport}>
                  Import Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
