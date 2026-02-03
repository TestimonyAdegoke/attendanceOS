"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Upload, Download, Check, AlertCircle, 
  Loader2, ChevronRight, ChevronDown, Settings2,
  FileSpreadsheet, Users, CheckCircle2, XCircle,
  RefreshCw, ArrowRight, Sparkles, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  parseCSV,
  autoDetectMappings,
  processImportRows,
  calculateSummary,
  generateImportReport,
  TARGET_FIELDS,
  type FieldMapping,
  type ImportRow,
  type ImportSummary,
  type ExistingPerson,
} from "@/lib/import-engine";

type DuplicateAction = "skip" | "update" | "create";

const STEPS = [
  { id: 1, name: "Upload", description: "Select your file" },
  { id: 2, name: "Map Fields", description: "Match columns" },
  { id: 3, name: "Preview", description: "Review data" },
  { id: 4, name: "Import", description: "Confirm import" },
];

export default function PeopleImportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orgSlug = params.orgSlug as string;

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Parsed data
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [processedRows, setProcessedRows] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  
  // Options
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>("skip");
  const [existingPeople, setExistingPeople] = useState<ExistingPerson[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Load existing people for duplicate detection
  useEffect(() => {
    const loadExistingPeople = async () => {
      const supabase = createClient();
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", orgSlug)
        .single();

      if (org) {
        setOrgId((org as any).id);
        const { data: people } = await supabase
          .from("people")
          .select("id, email, phone, external_id, full_name")
          .eq("org_id", (org as any).id);
        
        if (people) {
          setExistingPeople(people as ExistingPerson[]);
        }
      }
    };
    loadExistingPeople();
  }, [orgSlug]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { headers: parsedHeaders, rows } = parseCSV(text);
      
      setHeaders(parsedHeaders);
      setRawRows(rows);
      
      // Auto-detect mappings
      const detectedMappings = autoDetectMappings(parsedHeaders, rows);
      setMappings(detectedMappings);
      
      setLoading(false);
      setStep(2);
    };
    reader.readAsText(selectedFile);
  }, []);

  // Update a single mapping
  const updateMapping = (index: number, targetField: string | null) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      targetField,
      autoDetected: false,
      confidence: targetField ? 100 : 0,
    };
    setMappings(newMappings);
  };

  // Process rows when moving to preview step
  const processData = useCallback(() => {
    const processed = processImportRows(
      rawRows,
      headers,
      mappings,
      existingPeople,
      duplicateAction
    );
    setProcessedRows(processed);
    setSummary(calculateSummary(processed));
    setStep(3);
  }, [rawRows, headers, mappings, existingPeople, duplicateAction]);

  // Execute import
  const executeImport = async () => {
    if (!orgId) return;
    setImporting(true);

    const supabase = createClient();
    const rowsToImport = processedRows.filter(r => r.status === "valid" || r.status === "update");
    
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of rowsToImport) {
        if (row.status === "update" && row.duplicateOf) {
          // Update existing record (cast client to any to work around Supabase typing)
          const { error } = await (supabase as any)
            .from("people")
            .update({
              full_name: row.mappedData.full_name,
              email: row.mappedData.email || null,
              phone: row.mappedData.phone || null,
              external_id: row.mappedData.external_id || null,
            })
            .eq("id", row.duplicateOf);
          
          if (error) errorCount++;
          else successCount++;
        } else {
          // Insert new record (cast client to any to work around Supabase typing)
          const { error } = await (supabase as any)
            .from("people")
            .insert({
              org_id: orgId,
              full_name: row.mappedData.full_name,
              email: row.mappedData.email || null,
              phone: row.mappedData.phone || null,
              external_id: row.mappedData.external_id || null,
              status: "active",
            });
          
          if (error) errorCount++;
          else successCount++;
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully processed ${successCount} records. ${errorCount > 0 ? `${errorCount} errors.` : ""}`,
      });
      
      setStep(4);
    } catch (err) {
      console.error(err);
      toast({
        title: "Import Failed",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Download import report
  const downloadReport = () => {
    const report = generateImportReport(processedRows, headers);
    const blob = new Blob([report], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Check if we can proceed to next step
  const canProceed = () => {
    if (step === 2) {
      // Must have at least name mapped
      return mappings.some(m => m.targetField === "full_name");
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import People</h1>
          <p className="text-muted-foreground mt-1">Smart data import with field detection</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
              step === s.id && "bg-primary text-primary-foreground",
              step > s.id && "bg-primary/20 text-primary",
              step < s.id && "bg-muted text-muted-foreground"
            )}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                step === s.id && "bg-primary-foreground text-primary",
                step > s.id && "bg-primary text-primary-foreground",
                step < s.id && "bg-muted-foreground/30"
              )}>
                {step > s.id ? <Check className="h-3 w-3" /> : s.id}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{s.name}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="max-w-2xl mx-auto border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-cyan-500/20 mb-6">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload your data file</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              We&apos;ll automatically detect your columns and help you map them to the right fields.
            </p>
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <Button asChild variant="default" className="h-12 text-base bg-gradient-to-r from-primary to-cyan-500">
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Select CSV File
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                </label>
              </Button>
              <Button variant="outline" onClick={() => {
                const csvContent = "Name,Email,Phone,External ID,Department\nJohn Doe,john@example.com,+1234567890,EMP001,Engineering\nJane Smith,jane@example.com,+0987654321,EMP002,Marketing";
                const blob = new Blob([csvContent], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "people_template.csv";
                a.click();
              }}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
            <div className="mt-8 p-4 rounded-xl bg-muted/50 text-left max-w-md">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Smart Detection</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Our import engine automatically detects common fields like names, emails, and phone numbers.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Field Mapping */}
      {step === 2 && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Map Your Columns
              </CardTitle>
              <CardDescription>
                We detected {headers.length} columns. Review and adjust the mappings below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium">{mapping.sourceColumn}</div>
                    <div className="text-xs text-muted-foreground">
                      Sample: {rawRows[0]?.[index] || "(empty)"}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <select
                      value={mapping.targetField || ""}
                      onChange={(e) => updateMapping(index, e.target.value || null)}
                      className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
                    >
                      <option value="">-- Ignore this column --</option>
                      {TARGET_FIELDS.map(field => (
                        <option key={field.key} value={field.key}>
                          {field.label} {field.required && "*"}
                        </option>
                      ))}
                    </select>
                  </div>
                  {mapping.autoDetected && mapping.confidence > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {mapping.confidence}% match
                    </Badge>
                  )}
                </div>
              ))}

              {!mappings.some(m => m.targetField === "full_name") && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">You must map at least one column to "Full Name"</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duplicate Handling Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Duplicate Handling</CardTitle>
              <CardDescription>What should we do when we find existing records?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { value: "skip", label: "Skip Duplicates", desc: "Keep existing records unchanged" },
                  { value: "update", label: "Update Existing", desc: "Overwrite with new data" },
                  { value: "create", label: "Create Anyway", desc: "Create new records regardless" },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setDuplicateAction(option.value as DuplicateAction)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      duplicateAction === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={processData} disabled={!canProceed()}>
              Preview Import
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && summary && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-emerald-600">{summary.valid}</div>
                <div className="text-sm text-muted-foreground">Ready to import</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-amber-600">{summary.updates}</div>
                <div className="text-sm text-muted-foreground">Will update</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600">{summary.duplicates}</div>
                <div className="text-sm text-muted-foreground">Duplicates (skip)</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-red-600">{summary.errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </CardContent>
            </Card>
          </div>

          {/* Data Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>Showing first 50 rows. Review before importing.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium w-12">#</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Phone</th>
                      <th className="px-4 py-3 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {processedRows.slice(0, 50).map((row) => (
                      <tr key={row.rowNumber} className={cn(
                        "hover:bg-muted/30",
                        row.status === "error" && "bg-red-500/5",
                        row.status === "duplicate" && "bg-amber-500/5"
                      )}>
                        <td className="px-4 py-3 text-muted-foreground">{row.rowNumber}</td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            row.status === "valid" ? "default" :
                            row.status === "update" ? "secondary" :
                            row.status === "error" ? "destructive" : "outline"
                          } className="capitalize">
                            {row.status === "valid" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {row.status === "error" && <XCircle className="mr-1 h-3 w-3" />}
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{row.mappedData.full_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.mappedData.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.mappedData.phone}</td>
                        <td className="px-4 py-3">
                          {row.errors.length > 0 && (
                            <span className="text-red-500 text-xs">{row.errors.join(", ")}</span>
                          )}
                          {row.warnings.length > 0 && (
                            <span className="text-amber-500 text-xs">{row.warnings.join(", ")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Mapping
            </Button>
            <Button 
              onClick={executeImport} 
              disabled={importing || (summary.valid + summary.updates) === 0}
              className="bg-gradient-to-r from-primary to-cyan-500"
            >
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Check className="mr-2 h-4 w-4" /> Import {summary.valid + summary.updates} Records</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 mb-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Import Complete!</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Your data has been successfully imported into AttendOS.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={downloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
              <Button onClick={() => router.push(`/${orgSlug}/dashboard/people`)}>
                <Users className="mr-2 h-4 w-4" />
                View People
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
