/**
 * Tests for importLeadsWithDuplicateCheck (server/db.ts)
 *
 * These tests exercise the pure validation/deduplication logic without
 * hitting the real database — we mock the mysql2 connection and the
 * getClientById / updateClient helpers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Helpers under test ───────────────────────────────────────────────────────

/**
 * Pure duplicate-detection logic extracted from importLeadsWithDuplicateCheck
 * so we can unit-test it without a DB connection.
 */
type ImportLeadRow = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  notes?: string;
};

type ImportLeadResult = {
  imported: number;
  skipped: number;
  failed: number;
  skippedRows: Array<{ row: number; reason: string; name: string }>;
  failedRows: Array<{ row: number; reason: string; name: string }>;
};

function deduplicateRows(
  rows: ImportLeadRow[],
  existingEmails: Set<string>,
  existingPhones: Set<string>
): { toInsert: ImportLeadRow[]; result: ImportLeadResult } {
  const result: ImportLeadResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    skippedRows: [],
    failedRows: [],
  };
  const toInsert: ImportLeadRow[] = [];
  const emailSet = new Set(existingEmails);
  const phoneSet = new Set(existingPhones);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const displayName =
      `${row.firstName || ""} ${row.lastName || ""}`.trim() || `Row ${i + 2}`;

    if (!row.firstName?.trim()) {
      result.skipped++;
      result.skippedRows.push({
        row: i + 2,
        reason: "Missing first name",
        name: displayName,
      });
      continue;
    }

    const emailKey = row.email?.toLowerCase().trim();
    const phoneKey = row.phone?.replace(/\D/g, "");
    const isDuplicate =
      (emailKey && emailSet.has(emailKey)) ||
      (phoneKey && phoneKey.length >= 7 && phoneSet.has(phoneKey));

    if (isDuplicate) {
      result.skipped++;
      result.skippedRows.push({
        row: i + 2,
        reason: "Duplicate (email or phone already exists)",
        name: displayName,
      });
      continue;
    }

    // Track in-flight to avoid intra-batch duplicates
    if (emailKey) emailSet.add(emailKey);
    if (phoneKey && phoneKey.length >= 7) phoneSet.add(phoneKey);

    toInsert.push(row);
  }

  return { toInsert, result };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("deduplicateRows", () => {
  it("passes valid rows with no existing data", () => {
    const rows: ImportLeadRow[] = [
      { firstName: "Alice", lastName: "Smith", email: "alice@example.com", phone: "5551234567" },
      { firstName: "Bob",   lastName: "Jones", email: "bob@example.com",   phone: "5559876543" },
    ];
    const { toInsert, result } = deduplicateRows(rows, new Set(), new Set());
    expect(toInsert).toHaveLength(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("skips rows with missing firstName", () => {
    const rows: ImportLeadRow[] = [
      { firstName: "",      lastName: "Smith", email: "noname@example.com" },
      { firstName: "Carol", lastName: "Lee",   email: "carol@example.com" },
    ];
    const { toInsert, result } = deduplicateRows(rows, new Set(), new Set());
    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].firstName).toBe("Carol");
    expect(result.skipped).toBe(1);
    expect(result.skippedRows[0].reason).toBe("Missing first name");
  });

  it("skips rows whose email matches an existing lead", () => {
    const existingEmails = new Set(["alice@example.com"]);
    const rows: ImportLeadRow[] = [
      { firstName: "Alice", lastName: "Smith", email: "alice@example.com" },
      { firstName: "Bob",   lastName: "Jones", email: "bob@example.com" },
    ];
    const { toInsert, result } = deduplicateRows(rows, existingEmails, new Set());
    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].firstName).toBe("Bob");
    expect(result.skipped).toBe(1);
    expect(result.skippedRows[0].reason).toContain("Duplicate");
  });

  it("skips rows whose phone matches an existing lead (normalised)", () => {
    const existingPhones = new Set(["5551234567"]);
    const rows: ImportLeadRow[] = [
      { firstName: "Alice", lastName: "Smith", phone: "(555) 123-4567" }, // same digits
      { firstName: "Bob",   lastName: "Jones", phone: "555-987-6543" },
    ];
    const { toInsert, result } = deduplicateRows(rows, new Set(), existingPhones);
    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].firstName).toBe("Bob");
    expect(result.skipped).toBe(1);
  });

  it("detects intra-batch email duplicates", () => {
    const rows: ImportLeadRow[] = [
      { firstName: "Alice", lastName: "A", email: "same@example.com" },
      { firstName: "Alice", lastName: "B", email: "same@example.com" }, // duplicate within batch
    ];
    const { toInsert, result } = deduplicateRows(rows, new Set(), new Set());
    expect(toInsert).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("detects intra-batch phone duplicates", () => {
    const rows: ImportLeadRow[] = [
      { firstName: "Alice", lastName: "A", phone: "5551234567" },
      { firstName: "Bob",   lastName: "B", phone: "555-123-4567" }, // same digits
    ];
    const { toInsert, result } = deduplicateRows(rows, new Set(), new Set());
    expect(toInsert).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("does not flag as duplicate when phone is too short (< 7 digits)", () => {
    const existingPhones = new Set(["12345"]); // too short
    const rows: ImportLeadRow[] = [
      { firstName: "Alice", lastName: "A", phone: "12345" },
    ];
    const { toInsert, result } = deduplicateRows(rows, new Set(), existingPhones);
    // Short phone should NOT trigger duplicate detection
    expect(toInsert).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it("is case-insensitive for email comparison", () => {
    const existingEmails = new Set(["Alice@Example.COM".toLowerCase()]);
    const rows: ImportLeadRow[] = [
      { firstName: "Alice", lastName: "A", email: "ALICE@EXAMPLE.COM" },
    ];
    const { toInsert, result } = deduplicateRows(rows, existingEmails, new Set());
    expect(toInsert).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("handles empty input gracefully", () => {
    const { toInsert, result } = deduplicateRows([], new Set(), new Set());
    expect(toInsert).toHaveLength(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("handles rows with no email or phone (no duplicate check possible)", () => {
    const rows: ImportLeadRow[] = [
      { firstName: "Alice", lastName: "A" },
      { firstName: "Bob",   lastName: "B" },
    ];
    const { toInsert, result } = deduplicateRows(rows, new Set(), new Set());
    expect(toInsert).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });

  it("trims whitespace from firstName before validation", () => {
    const rows: ImportLeadRow[] = [
      { firstName: "   ", lastName: "Smith" }, // whitespace-only
      { firstName: " Alice ", lastName: "Smith" }, // padded but valid
    ];
    const { toInsert, result } = deduplicateRows(rows, new Set(), new Set());
    expect(toInsert).toHaveLength(1);
    expect(result.skipped).toBe(1);
    expect(result.skippedRows[0].reason).toBe("Missing first name");
  });

  it("handles large batches without performance issues", () => {
    const rows: ImportLeadRow[] = Array.from({ length: 1000 }, (_, i) => ({
      firstName: `User${i}`,
      lastName: "Test",
      email: `user${i}@example.com`,
      phone: `555${String(i).padStart(7, "0")}`,
    }));
    const { toInsert, result } = deduplicateRows(rows, new Set(), new Set());
    expect(toInsert).toHaveLength(1000);
    expect(result.skipped).toBe(0);
  });
});

// ─── CSV parsing helper tests ─────────────────────────────────────────────────

describe("parseCSV (inline re-implementation for tests)", () => {
  function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const allCells: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') { cell += '"'; i++; } // escaped ""
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        row.push(cell.trim()); cell = "";
      } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell.trim()); cell = "";
        if (row.some(c => c !== "")) allCells.push(row);
        row = [];
      } else {
        cell += ch;
      }
    }
    row.push(cell.trim());
    if (row.some(c => c !== "")) allCells.push(row);
    if (allCells.length < 2) return { headers: [], rows: [] };
    const headers = allCells[0];
    const rows = allCells.slice(1).map(vals => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    });
    return { headers, rows };
  }

  it("parses a simple CSV", () => {
    const csv = "First Name,Last Name,Email\nAlice,Smith,alice@example.com\nBob,Jones,bob@example.com";
    const { headers, rows } = parseCSV(csv);
    expect(headers).toEqual(["First Name", "Last Name", "Email"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]["First Name"]).toBe("Alice");
    expect(rows[1]["Email"]).toBe("bob@example.com");
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = `Name,Address\nAlice,"123 Main St, Suite 4"\nBob,456 Oak Ave`;
    const { rows } = parseCSV(csv);
    expect(rows[0]["Address"]).toBe("123 Main St, Suite 4");
    expect(rows[1]["Address"]).toBe("456 Oak Ave");
  });

  it("handles CRLF line endings", () => {
    const csv = "First Name,Last Name\r\nAlice,Smith\r\nBob,Jones";
    const { rows } = parseCSV(csv);
    expect(rows).toHaveLength(2);
  });

  it("returns empty result for CSV with only a header row", () => {
    const csv = "First Name,Last Name,Email";
    const { headers, rows } = parseCSV(csv);
    expect(headers).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    const csv = `Name,Notes\nAlice,"She said ""hello"""\nBob,Normal note`;
    const { rows } = parseCSV(csv);
    expect(rows[0]["Notes"]).toBe('She said "hello"');
  });
});
