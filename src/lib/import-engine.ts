"use client";

// Import Engine - Smart field detection, duplicate handling, and validation

export interface FieldMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: number; // 0-100
  autoDetected: boolean;
}

export interface ImportRow {
  rowNumber: number;
  data: Record<string, string>;
  mappedData: {
    full_name?: string;
    email?: string;
    phone?: string;
    external_id?: string;
    group?: string;
    department?: string;
    status?: string;
  };
  status: "pending" | "valid" | "error" | "duplicate" | "update";
  errors: string[];
  warnings: string[];
  duplicateOf?: string; // ID of existing record if duplicate
}

export interface ImportSummary {
  total: number;
  valid: number;
  errors: number;
  duplicates: number;
  updates: number;
  skipped: number;
}

export interface ExistingPerson {
  id: string;
  email: string | null;
  phone: string | null;
  external_id: string | null;
  full_name: string;
}

// Target fields that can be mapped
export const TARGET_FIELDS = [
  { key: "full_name", label: "Full Name", required: true },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "external_id", label: "External ID", required: false },
  { key: "group", label: "Group / Department", required: false },
  { key: "status", label: "Status", required: false },
] as const;

// Common column name patterns for auto-detection
const FIELD_PATTERNS: Record<string, RegExp[]> = {
  full_name: [
    /^name$/i,
    /^full[_\s-]?name$/i,
    /^person[_\s-]?name$/i,
    /^attendee$/i,
    /^member$/i,
    /^student$/i,
    /^employee$/i,
  ],
  email: [
    /^email$/i,
    /^e[_\s-]?mail$/i,
    /^email[_\s-]?address$/i,
    /^mail$/i,
  ],
  phone: [
    /^phone$/i,
    /^phone[_\s-]?number$/i,
    /^mobile$/i,
    /^cell$/i,
    /^tel$/i,
    /^telephone$/i,
    /^contact$/i,
  ],
  external_id: [
    /^external[_\s-]?id$/i,
    /^ext[_\s-]?id$/i,
    /^id$/i,
    /^employee[_\s-]?id$/i,
    /^student[_\s-]?id$/i,
    /^member[_\s-]?id$/i,
    /^reg[_\s-]?no$/i,
    /^registration$/i,
    /^badge$/i,
  ],
  group: [
    /^group$/i,
    /^department$/i,
    /^dept$/i,
    /^class$/i,
    /^grade$/i,
    /^team$/i,
    /^unit$/i,
    /^ministry$/i,
  ],
  status: [
    /^status$/i,
    /^active$/i,
    /^state$/i,
  ],
};

// Data pattern detection (for when column names don't match)
const DATA_PATTERNS: Record<string, RegExp> = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-+()]{7,20}$/,
};

/**
 * Parse CSV content into rows and columns
 */
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows = lines.slice(1).map(line => parseCSVLine(line));
  
  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Auto-detect field mappings based on column names and data patterns
 */
export function autoDetectMappings(
  headers: string[],
  sampleRows: string[][]
): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const usedTargets = new Set<string>();

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    let bestMatch: { field: string; confidence: number } | null = null;

    // First, try to match by column name
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
      if (usedTargets.has(field)) continue;
      
      for (const pattern of patterns) {
        if (pattern.test(header)) {
          const confidence = header.toLowerCase() === field.toLowerCase() ? 100 : 85;
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { field, confidence };
          }
          break;
        }
      }
    }

    // If no name match, try data pattern detection
    if (!bestMatch && sampleRows.length > 0) {
      const sampleValues = sampleRows.slice(0, 5).map(row => row[i] || "");
      
      for (const [field, pattern] of Object.entries(DATA_PATTERNS)) {
        if (usedTargets.has(field)) continue;
        
        const matchCount = sampleValues.filter(v => pattern.test(v)).length;
        const matchRatio = matchCount / sampleValues.length;
        
        if (matchRatio >= 0.6) {
          const confidence = Math.round(matchRatio * 70); // Max 70% for data-based detection
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { field, confidence };
          }
        }
      }
    }

    if (bestMatch) {
      usedTargets.add(bestMatch.field);
      mappings.push({
        sourceColumn: header,
        targetField: bestMatch.field,
        confidence: bestMatch.confidence,
        autoDetected: true,
      });
    } else {
      mappings.push({
        sourceColumn: header,
        targetField: null,
        confidence: 0,
        autoDetected: false,
      });
    }
  }

  return mappings;
}

/**
 * Validate and process import rows
 */
export function processImportRows(
  rows: string[][],
  headers: string[],
  mappings: FieldMapping[],
  existingPeople: ExistingPerson[],
  duplicateAction: "skip" | "update" | "create"
): ImportRow[] {
  const emailIndex = new Map<string, ExistingPerson>();
  const phoneIndex = new Map<string, ExistingPerson>();
  const externalIdIndex = new Map<string, ExistingPerson>();

  // Build indexes for duplicate detection
  for (const person of existingPeople) {
    if (person.email) emailIndex.set(person.email.toLowerCase(), person);
    if (person.phone) phoneIndex.set(normalizePhone(person.phone), person);
    if (person.external_id) externalIdIndex.set(person.external_id.toLowerCase(), person);
  }

  return rows.map((row, index) => {
    const importRow: ImportRow = {
      rowNumber: index + 2, // +2 for 1-indexed and header row
      data: {},
      mappedData: {},
      status: "pending",
      errors: [],
      warnings: [],
    };

    // Map source data to target fields
    for (let i = 0; i < headers.length; i++) {
      importRow.data[headers[i]] = row[i] || "";
      
      const mapping = mappings[i];
      if (mapping?.targetField) {
        (importRow.mappedData as any)[mapping.targetField] = row[i]?.trim() || "";
      }
    }

    // Validate required fields
    if (!importRow.mappedData.full_name?.trim()) {
      importRow.errors.push("Name is required");
      importRow.status = "error";
    }

    // Validate email format
    if (importRow.mappedData.email && !DATA_PATTERNS.email.test(importRow.mappedData.email)) {
      importRow.warnings.push("Invalid email format");
    }

    // Check for duplicates
    if (importRow.status !== "error") {
      let duplicate: ExistingPerson | undefined;
      
      if (importRow.mappedData.email) {
        duplicate = emailIndex.get(importRow.mappedData.email.toLowerCase());
      }
      if (!duplicate && importRow.mappedData.phone) {
        duplicate = phoneIndex.get(normalizePhone(importRow.mappedData.phone));
      }
      if (!duplicate && importRow.mappedData.external_id) {
        duplicate = externalIdIndex.get(importRow.mappedData.external_id.toLowerCase());
      }

      if (duplicate) {
        importRow.duplicateOf = duplicate.id;
        if (duplicateAction === "skip") {
          importRow.status = "duplicate";
          importRow.warnings.push(`Duplicate of existing record: ${duplicate.full_name}`);
        } else if (duplicateAction === "update") {
          importRow.status = "update";
          importRow.warnings.push(`Will update existing record: ${duplicate.full_name}`);
        } else {
          importRow.status = "valid";
          importRow.warnings.push(`Creating new record despite duplicate: ${duplicate.full_name}`);
        }
      } else {
        importRow.status = "valid";
      }
    }

    return importRow;
  });
}

/**
 * Calculate import summary
 */
export function calculateSummary(rows: ImportRow[]): ImportSummary {
  return {
    total: rows.length,
    valid: rows.filter(r => r.status === "valid").length,
    errors: rows.filter(r => r.status === "error").length,
    duplicates: rows.filter(r => r.status === "duplicate").length,
    updates: rows.filter(r => r.status === "update").length,
    skipped: rows.filter(r => r.status === "duplicate").length,
  };
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-+()]/g, "");
}

/**
 * Generate CSV report of import results
 */
export function generateImportReport(rows: ImportRow[], headers: string[]): string {
  const reportHeaders = [...headers, "Import Status", "Errors", "Warnings"];
  const reportRows = rows.map(row => {
    const values = headers.map(h => row.data[h] || "");
    values.push(row.status);
    values.push(row.errors.join("; "));
    values.push(row.warnings.join("; "));
    return values.map(v => `"${v.replace(/"/g, '""')}"`).join(",");
  });
  
  return [reportHeaders.join(","), ...reportRows].join("\n");
}
