import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function LeadImport() {
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const createLead = trpc.crm.createLead.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
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

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
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

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          // Map CSV columns to lead fields — handles many formats including property/owner lists
          const firstName = row['first name'] || row['firstname'] || row['first_name'] ||
            row['owner 1 first name'] || row['owner1 first name'] || row['owner_1_first_name'] ||
            row['owner first name'] || row['contact first name'] || '';
          const lastName = row['last name'] || row['lastname'] || row['last_name'] ||
            row['owner 1 last name'] || row['owner1 last name'] || row['owner_1_last_name'] ||
            row['owner last name'] || row['contact last name'] ||
            // Handle LLC/company names stored in last name field
            row['owner 1'] || row['owner'] || row['company'] || row['business name'] || '';
          const email = (row['email'] || '').split(',')[0].trim(); // take first email if multiple
          const phone = (row['mobile'] || row['phone'] || row['phone number'] || row['phone_number'] ||
            row['cell'] || row['cell phone'] || row['landline'] || '').split(',')[0].trim(); // take first phone if multiple
          const source = row['source'] || row['lead source'] || row['lead_source'] || '';
          // Build notes from property data if present
          const propertyAddress = row['address'] || '';
          const propertyCity = row['city'] || '';
          const propertyState = row['state'] || '';
          const propertyZip = row['zip'] || row['zip code'] || '';
          const propertyType = row['property type'] || '';
          const estValue = row['est. value'] || row['estimated value'] || '';
          const estEquity = row['est. equity'] || row['estimated equity'] || '';
          const propertyNotes = [propertyAddress && `Address: ${propertyAddress}${propertyCity ? ', ' + propertyCity : ''}${propertyState ? ', ' + propertyState : ''}${propertyZip ? ' ' + propertyZip : ''}`, propertyType && `Type: ${propertyType}`, estValue && `Est. Value: ${estValue}`, estEquity && `Est. Equity: ${estEquity}`].filter(Boolean).join(' | ');
          const notes = row['notes'] || row['note'] || propertyNotes || '';

          // If no first name but we have a combined owner name, split it
          let resolvedFirst = firstName;
          let resolvedLast = lastName;
          if (!resolvedFirst && !resolvedLast) {
            const fullName = row['name'] || row['full name'] || row['owner name'] || row['contact'] || '';
            if (fullName) {
              const parts = fullName.trim().split(/\s+/);
              resolvedFirst = parts[0] || '';
              resolvedLast = parts.slice(1).join(' ') || parts[0] || '';
            }
          }

          if (!resolvedFirst && !resolvedLast) {
            failed++;
            errors.push(`Row ${success + failed}: Missing first or last name`);
            continue;
          }
          // Use company/LLC name as last name if only one name field found
          if (!resolvedFirst) resolvedFirst = resolvedLast;
          if (!resolvedLast) resolvedLast = resolvedFirst;

          if (!email && !phone) {
            failed++;
            errors.push(`Row ${success + failed}: Missing both email and phone for ${resolvedFirst} ${resolvedLast}`);
            continue;
          }

          await createLead.mutateAsync({
            firstName: resolvedFirst,
            lastName: resolvedLast,
            email: email || undefined,
            phone: phone || undefined,
            source: source || undefined,
            notes: notes || undefined,
          });

          success++;
        } catch (error: any) {
          failed++;
          errors.push(`Row ${success + failed}: ${error.message}`);
        }
      }

      setResults({ success, failed, errors });
      
      if (success > 0) {
        toast.success(`Successfully imported ${success} lead${success !== 1 ? 's' : ''}`);
      }
      if (failed > 0) {
        toast.error(`Failed to import ${failed} lead${failed !== 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      toast.error(`Failed to parse CSV: ${error.message}`);
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
                <strong>Required Columns:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>first name (or firstname, first_name)</li>
                  <li>last name (or lastname, last_name)</li>
                  <li>email OR phone (at least one required)</li>
                </ul>
              </div>
              <div>
                <strong>Optional Columns:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>phone (or phone number, phone_number)</li>
                  <li>source (or lead source, lead_source)</li>
                  <li>notes (or note)</li>
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
              disabled={!file || importing}
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
                      <strong>{results.failed} leads failed to import</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {results.errors.length > 0 && (
                <div>
                  <Label className="text-destructive">Errors:</Label>
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
