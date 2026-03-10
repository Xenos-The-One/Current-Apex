import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function LeadImport() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "agency_owner";

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Fetch client list for admin selector
  const { data: clientsData } = trpc.admin.listClients.useQuery(
    { agencyId: 1 },
    { enabled: isAdmin }
  );

  // For non-admin users, get their own client info
  const { data: myInfo } = trpc.crm.getMyInfo.useQuery(undefined, { enabled: !isAdmin });
  const myClient = myInfo?.client;

  // Bulk import mutation
  const bulkImport = trpc.leads.bulkImport.useMutation();

  useEffect(() => {
    // Auto-select client for non-admin users
    if (!isAdmin && myClient?.id) {
      setSelectedClientId(myClient.id);
    }
  }, [isAdmin, myInfo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error("Please select a CSV file");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    return rows;
  };

  const mapRowToLead = (row: any): { lead: any; error: string | null } => {
    // Support both exact-case and lowercase header variants
    const get = (key: string) => row[key] || row[key.toLowerCase()] || '';

    const firstName = get('Owner 1 First Name') || get('first name') || get('firstname') || get('first_name') || get('owner first name') || get('contact first name');
    const lastName = get('Owner 1 Last Name') || get('last name') || get('lastname') || get('last_name') || get('owner last name') || get('contact last name') || get('owner 1') || get('owner') || get('company') || get('business name');
    const email = (get('Email') || get('email')).split(',')[0].trim();
    // Mobile first, then Landline as fallback
    const rawPhone = get('Mobile') || get('mobile') || get('phone') || get('phone number') || get('phone_number') || get('cell') || get('cell phone');
    const rawLandline = get('Landline') || get('landline');
    const phone = (rawPhone || rawLandline).split(',')[0].trim();
    const source = get('source') || get('lead source') || get('lead_source') || 'CSV Import';

    // Build notes from property data if present
    const propertyAddress = get('Address') || get('address');
    const propertyCity = get('City') || get('city');
    const propertyState = get('State') || get('state');
    const propertyZip = get('Zip') || get('zip') || get('zip code');
    const propertyType = get('Property Type') || get('property type');
    const estValue = get('Est. Value') || get('est. value') || get('estimated value');
    const estEquity = get('Est. Equity') || get('est. equity') || get('estimated equity');
    const propertyNotes = [
      propertyAddress && `Address: ${propertyAddress}${propertyCity ? ', ' + propertyCity : ''}${propertyState ? ', ' + propertyState : ''}${propertyZip ? ' ' + propertyZip : ''}`,
      propertyType && `Type: ${propertyType}`,
      estValue && `Est. Value: ${estValue}`,
      estEquity && `Est. Equity: ${estEquity}`
    ].filter(Boolean).join(' | ');
    const notes = get('notes') || get('note') || propertyNotes;

    // Resolve name — handle LLCs / companies where first name is blank
    let resolvedFirst = firstName.trim();
    let resolvedLast = lastName.trim();

    if (!resolvedFirst && !resolvedLast) {
      // Try generic name columns
      const fullName = (get('name') || get('full name') || get('owner name') || get('contact')).trim();
      if (fullName) {
        const parts = fullName.split(/\s+/);
        resolvedFirst = parts[0];
        resolvedLast = parts.slice(1).join(' ') || parts[0];
      }
    }

    if (!resolvedFirst && !resolvedLast) {
      return { lead: null, error: 'Missing name' };
    }

    // If only last name (e.g. LLC name), use it as both first and last
    if (!resolvedFirst) resolvedFirst = resolvedLast;
    if (!resolvedLast) resolvedLast = resolvedFirst;

    if (!email && !phone) {
      return { lead: null, error: `No contact info for ${resolvedFirst} ${resolvedLast}` };
    }

    // Format phone to E.164
    let formattedPhone = phone;
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) formattedPhone = `+1${digits}`;
      else if (digits.length === 11 && digits.startsWith('1')) formattedPhone = `+${digits}`;
      else if (digits.length > 0 && !phone.startsWith('+')) formattedPhone = `+1${digits}`;
    }

    return {
      lead: {
        firstName: resolvedFirst,
        lastName: resolvedLast,
        email: email || undefined,
        phone: formattedPhone || undefined,
        source,
        notes: notes || undefined,
      },
      error: null,
    };
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (!selectedClientId) {
      toast.error("Please select a client to import leads for");
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error("No data found in CSV file");
        setImporting(false);
        return;
      }

      // Map all rows to leads, collecting errors for skipped rows
      const validLeads: any[] = [];
      const errors: string[] = [];
      let rowNum = 1;

      for (const row of rows) {
        const { lead, error } = mapRowToLead(row);
        if (error) {
          errors.push(`Row ${rowNum}: ${error}`);
        } else {
          validLeads.push(lead);
        }
        rowNum++;
      }

      if (validLeads.length === 0) {
        toast.error("No valid leads found in CSV");
        setResults({ success: 0, failed: errors.length, errors });
        setImporting(false);
        return;
      }

      // Send leads in batches of 500 to avoid timeouts
      const BATCH_SIZE = 500;
      let totalImported = 0;
      const batchCount = Math.ceil(validLeads.length / BATCH_SIZE);

      for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
        const batch = validLeads.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        toast.info(`Importing batch ${batchNum} of ${batchCount}...`);
        const result = await bulkImport.mutateAsync({
          agencyId: 1,
          clientId: selectedClientId,
          leads: batch,
        });
        totalImported += result.imported;
      }

      const success = totalImported;
      const failed = errors.length;

      setResults({ success, failed, errors });

      if (success > 0) {
        toast.success(`Successfully imported ${success} lead${success !== 1 ? 's' : ''}`);
      }
      if (failed > 0) {
        toast.error(`${failed} row${failed !== 1 ? 's' : ''} skipped due to missing data`);
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
      setResults({ success: 0, failed: 0, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = "first name,last name,email,phone,source,notes\nJohn,Doe,john@example.com,+1-555-123-4567,Facebook Ad,Interested in refinancing\nJane,Smith,jane@example.com,+1-555-987-6543,Website,First-time homebuyer";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Import Leads</h1>
            <p className="text-muted-foreground">Upload a CSV file to import multiple leads at once</p>
          </div>
        </div>

        {/* Admin: Client Selector */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
              <CardDescription>Choose which client account to import leads into</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedClientId ? String(selectedClientId) : ""}
                onValueChange={(val) => setSelectedClientId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientsData?.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Format Requirements</CardTitle>
            <CardDescription>
              Your CSV file should include the following columns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Required Columns (at least one name + contact):</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>first name / Owner 1 First Name</li>
                  <li>last name / Owner 1 Last Name</li>
                  <li>email OR mobile/phone (at least one)</li>
                </ul>
              </div>
              <div>
                <strong>Optional Columns:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>mobile, phone, landline</li>
                  <li>source / lead source</li>
                  <li>address, city, state, zip</li>
                  <li>property type, est. value, est. equity</li>
                  <li>notes</li>
                </ul>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="w-full md:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file from your computer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">CSV File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={importing}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleImport}
              disabled={!file || importing || (isAdmin && !selectedClientId)}
              className="w-full"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Leads
                </>
              )}
            </Button>

            {isAdmin && !selectedClientId && (
              <p className="text-sm text-muted-foreground text-center">
                Select a client above before importing
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <AlertDescription>
                    <strong className="text-success">{results.success} leads imported successfully</strong>
                  </AlertDescription>
                </Alert>

                {results.failed > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{results.failed} rows skipped</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {results.errors.length > 0 && (
                <div>
                  <Label className="text-destructive">Skipped Rows:</Label>
                  <div className="mt-2 p-3 bg-destructive/10 rounded-lg max-h-48 overflow-y-auto">
                    <ul className="text-sm space-y-1">
                      {results.errors.map((error, index) => (
                        <li key={index} className="text-destructive">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Link href="/leads">
                  <Button>View All Leads</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setResults(null);
                  }}
                >
                  Import More
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
