import { useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Borrower fields that can be mapped from CSV
const MAPPABLE_FIELDS = [
  { key: "skip", label: "-- Skip Column --" },
  { key: "firstName", label: "First Name *" },
  { key: "lastName", label: "Last Name *" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "secondaryPhone", label: "Secondary Phone" },
  { key: "currentAddress", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zipCode", label: "Zip Code" },
  { key: "county", label: "County" },
  { key: "employer", label: "Employer" },
  { key: "jobTitle", label: "Job Title" },
  { key: "annualIncome", label: "Annual Income" },
  { key: "monthlyIncome", label: "Monthly Income" },
  { key: "creditScoreExact", label: "Credit Score (Exact)" },
  { key: "creditScoreRange", label: "Credit Score Range" },
  { key: "desiredLoanAmount", label: "Desired Loan Amount" },
  { key: "estimatedPropertyValue", label: "Estimated Property Value" },
  { key: "loanType", label: "Loan Type" },
  { key: "loanPurpose", label: "Loan Purpose" },
  { key: "propertyType", label: "Property Type" },
  { key: "propertyUse", label: "Property Use" },
  { key: "targetPropertyAddress", label: "Target Property Address" },
  { key: "targetCity", label: "Target City" },
  { key: "targetState", label: "Target State" },
  { key: "targetZipCode", label: "Target Zip Code" },
  { key: "leadSource", label: "Lead Source" },
  { key: "leadSourceDetail", label: "Lead Source Detail" },
  { key: "pipelineStatus", label: "Pipeline Status" },
  { key: "purchaseTimeline", label: "Purchase Timeline" },
  { key: "internalNotes", label: "Notes" },
  { key: "isFirstTimeBuyer", label: "First Time Buyer" },
  { key: "isVaEligible", label: "VA Eligible" },
  { key: "downPaymentAmount", label: "Down Payment Amount" },
  { key: "totalDebt", label: "Total Debt" },
  { key: "monthlyDebtPayments", label: "Monthly Debt Payments" },
  { key: "maritalStatus", label: "Marital Status" },
  { key: "dependents", label: "Dependents" },
];

// Auto-detect column mapping based on header names
function autoDetectMapping(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  const patterns: Record<string, RegExp> = {
    firstName: /^(first\s*name|fname|first)$/i,
    lastName: /^(last\s*name|lname|last|surname)$/i,
    email: /^(email|e-?mail|email\s*address)$/i,
    phone: /^(phone|phone\s*number|mobile|cell|tel)$/i,
    currentAddress: /^(address|street|street\s*address|address\s*1)$/i,
    city: /^(city|town)$/i,
    state: /^(state|province|st)$/i,
    zipCode: /^(zip|zip\s*code|postal|postal\s*code)$/i,
    employer: /^(employer|company|work)$/i,
    jobTitle: /^(title|job\s*title|position|occupation)$/i,
    annualIncome: /^(annual\s*income|yearly\s*income|income)$/i,
    monthlyIncome: /^(monthly\s*income)$/i,
    creditScoreExact: /^(credit\s*score|fico|score)$/i,
    desiredLoanAmount: /^(loan\s*amount|desired\s*loan|amount)$/i,
    estimatedPropertyValue: /^(property\s*value|home\s*value|value)$/i,
    loanType: /^(loan\s*type|type\s*of\s*loan)$/i,
    loanPurpose: /^(loan\s*purpose|purpose)$/i,
    propertyType: /^(property\s*type|type\s*of\s*property)$/i,
    leadSource: /^(lead\s*source|source|how\s*did)$/i,
    internalNotes: /^(notes|comments|remarks)$/i,
    downPaymentAmount: /^(down\s*payment|dp)$/i,
    maritalStatus: /^(marital\s*status|marital)$/i,
  };

  headers.forEach((header, idx) => {
    const trimmed = header.trim();
    for (const [field, regex] of Object.entries(patterns)) {
      if (regex.test(trimmed)) {
        mapping[idx] = field;
        break;
      }
    }
  });

  return mapping;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Simple CSV parser that handles quoted fields
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter(r => r.some(c => c.length > 0));
  return { headers, rows };
}

type ImportResult = {
  row: number;
  status: "success" | "error";
  name: string;
  error?: string;
};

export default function BorrowerImport() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Steps: upload -> map -> preview -> importing -> done
  const [step, setStep] = useState<"upload" | "map" | "preview" | "importing" | "done">("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importProgress, setImportProgress] = useState(0);

  const createMutation = trpc.borrowers.create.useMutation();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0) {
        toast.error("Could not parse CSV file");
        return;
      }
      setHeaders(h);
      setRows(r);
      const autoMap = autoDetectMapping(h);
      setColumnMapping(autoMap);
      setStep("map");
      toast.success(`Parsed ${r.length} rows from ${file.name}`);
    };
    reader.readAsText(file);
  }, []);

  const handleMappingChange = (colIdx: number, field: string) => {
    setColumnMapping(prev => ({ ...prev, [colIdx]: field }));
  };

  const mappedFields = Object.values(columnMapping).filter(v => v !== "skip");
  const hasFirstName = mappedFields.includes("firstName");
  const hasLastName = mappedFields.includes("lastName");
  const canProceed = hasFirstName && hasLastName;

  const previewRows = rows.slice(0, 5);

  const buildBorrowerFromRow = (row: string[]) => {
    const data: any = {};
    for (const [colIdxStr, field] of Object.entries(columnMapping)) {
      if (field === "skip") continue;
      const colIdx = parseInt(colIdxStr);
      let value = row[colIdx]?.trim() || "";
      if (!value) continue;

      // Type conversions
      if (field === "creditScoreExact" || field === "dependents") {
        const num = parseInt(value.replace(/[^0-9]/g, ""));
        if (!isNaN(num)) data[field] = num;
      } else if (field === "isFirstTimeBuyer" || field === "isVaEligible") {
        data[field] = ["yes", "true", "1", "y"].includes(value.toLowerCase());
      } else if (["annualIncome", "monthlyIncome", "desiredLoanAmount", "estimatedPropertyValue", "downPaymentAmount", "totalDebt", "monthlyDebtPayments"].includes(field)) {
        // Strip currency formatting
        data[field] = value.replace(/[$,]/g, "");
      } else {
        data[field] = value;
      }
    }
    return data;
  };

  const startImport = async () => {
    setStep("importing");
    setImportProgress(0);
    const results: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const data = buildBorrowerFromRow(row);
      const name = `${data.firstName || ""} ${data.lastName || ""}`.trim() || `Row ${i + 1}`;

      if (!data.firstName || !data.lastName) {
        results.push({ row: i + 1, status: "error", name, error: "Missing first or last name" });
        setImportProgress(Math.round(((i + 1) / rows.length) * 100));
        setImportResults([...results]);
        continue;
      }

      try {
        await createMutation.mutateAsync(data);
        results.push({ row: i + 1, status: "success", name });
      } catch (err: any) {
        results.push({ row: i + 1, status: "error", name, error: err.message || "Unknown error" });
      }

      setImportProgress(Math.round(((i + 1) / rows.length) * 100));
      setImportResults([...results]);
    }

    setStep("done");
    const successCount = results.filter(r => r.status === "success").length;
    toast.success(`Import complete: ${successCount}/${rows.length} borrowers imported`);
  };

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setImportResults([]);
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/borrowers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Import Borrowers
            </h1>
            <p className="text-muted-foreground mt-1">Upload a CSV file to bulk import borrowers</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {["Upload", "Map Columns", "Preview & Import", "Results"].map((label, i) => {
            const stepIdx = ["upload", "map", "preview", "done"].indexOf(step === "importing" ? "preview" : step);
            const isActive = i === stepIdx;
            const isDone = i < stepIdx || step === "done";
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone && !isActive ? <CheckCircle2 className="h-3 w-3" /> : null}
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8">
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop or click to select a CSV file with borrower data
                </p>
                <p className="text-xs text-muted-foreground">
                  Required columns: First Name, Last Name. All other fields are optional.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button className="mt-4">Select CSV File</Button>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">CSV Format Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>First row should contain column headers</li>
                  <li>At minimum, include "First Name" and "Last Name" columns</li>
                  <li>Phone numbers can be in any format (will be stored as-is)</li>
                  <li>Dollar amounts can include $ and commas (will be cleaned)</li>
                  <li>Credit scores should be numeric (e.g., 720)</li>
                  <li>Boolean fields accept: yes/no, true/false, 1/0</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Map Columns */}
        {step === "map" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Map CSV Columns → Borrower Fields
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {fileName} — {rows.length} rows detected. Map each CSV column to a borrower field.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {headers.map((header, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-[200px] text-sm font-medium truncate" title={header}>
                      {header}
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <Select
                      value={columnMapping[idx] || "skip"}
                      onValueChange={(val) => handleMappingChange(idx, val)}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAPPABLE_FIELDS.map(f => (
                          <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {rows[0] && rows[0][idx] && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={rows[0][idx]}>
                        e.g. "{rows[0][idx]}"
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {!canProceed && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  You must map both "First Name" and "Last Name" columns to proceed.
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={reset}>Start Over</Button>
                <Button onClick={() => setStep("preview")} disabled={!canProceed}>
                  Preview Import
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Preview & Import */}
        {(step === "preview" || step === "importing") && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Preview — {rows.length} borrowers to import
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Preview table */}
              <div className="overflow-x-auto mb-4 max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {Object.entries(columnMapping)
                        .filter(([_, f]) => f !== "skip")
                        .map(([idx, field]) => (
                          <TableHead key={idx} className="text-xs">
                            {MAPPABLE_FIELDS.find(f => f.key === field)?.label || field}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        {Object.entries(columnMapping)
                          .filter(([_, f]) => f !== "skip")
                          .map(([idx]) => (
                            <TableCell key={idx} className="text-xs truncate max-w-[150px]">
                              {row[parseInt(idx)] || "-"}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 5 && (
                <p className="text-xs text-muted-foreground mb-4">
                  Showing first 5 of {rows.length} rows
                </p>
              )}

              {step === "importing" && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Importing...</span>
                    <span className="text-sm text-muted-foreground">{importProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("map")} disabled={step === "importing"}>
                  Back to Mapping
                </Button>
                <Button onClick={startImport} disabled={step === "importing"}>
                  {step === "importing" ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Importing...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-1" /> Import {rows.length} Borrowers</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold">Import Complete</h3>
                    <p className="text-sm text-muted-foreground">
                      {importResults.filter(r => r.status === "success").length} of {importResults.length} borrowers imported successfully
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-700">
                      {importResults.filter(r => r.status === "success").length}
                    </p>
                    <p className="text-xs text-green-600">Successful</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-700">
                      {importResults.filter(r => r.status === "error").length}
                    </p>
                    <p className="text-xs text-red-600">Failed</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{importResults.length}</p>
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                  </div>
                </div>

                {/* Error details */}
                {importResults.filter(r => r.status === "error").length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2 text-red-700">Failed Rows</h4>
                    <div className="max-h-[200px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Row</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResults.filter(r => r.status === "error").map(r => (
                            <TableRow key={r.row}>
                              <TableCell className="text-sm">{r.row}</TableCell>
                              <TableCell className="text-sm">{r.name}</TableCell>
                              <TableCell className="text-xs text-red-600">{r.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <Button onClick={() => setLocation("/borrowers")}>
                    View Borrower Database
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Import Another File
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
