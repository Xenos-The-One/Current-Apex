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

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
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
          // Map CSV columns to lead fields
          const firstName = row['first name'] || row['firstname'] || row['first_name'] || '';
          const lastName = row['last name'] || row['lastname'] || row['last_name'] || '';
          const email = row['email'] || '';
          const phone = row['phone'] || row['phone number'] || row['phone_number'] || '';
          const source = row['source'] || row['lead source'] || row['lead_source'] || '';
          const notes = row['notes'] || row['note'] || '';

          if (!firstName || !lastName) {
            failed++;
            errors.push(`Row ${success + failed}: Missing first or last name`);
            continue;
          }

          if (!email && !phone) {
            failed++;
            errors.push(`Row ${success + failed}: Missing both email and phone for ${firstName} ${lastName}`);
            continue;
          }

          await createLead.mutateAsync({
            firstName,
            lastName,
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
