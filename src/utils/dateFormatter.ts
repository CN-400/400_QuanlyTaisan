/**
 * Date Formatting Utility for VietinBank Ninh Binh Management App
 * Ensures all dates are formatted consistently as "dd-MM-yyyy" (e.g., "18-08-2026")
 * without displaying time (hh:mm).
 */

/**
 * Format any date, ISO string, or timestamp strictly into "dd-MM-yyyy"
 */
export function formatVnDateTime(dateInput?: string | Date | null, _fallbackTimeInput?: string): string {
  return formatVnDateOnly(dateInput);
}

/**
 * Format strictly as Date Only: "dd-MM-yyyy"
 */
export function formatVnDateOnly(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '-';

    // If matches ISO format with Time: YYYY-MM-DDTHH:mm:ss... or YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d}-${m}-${y}`;
    }

    // If matches DD/MM/YYYY or DD-MM-YYYY (with or without trailing time)
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }

    // Try parsing as JavaScript Date
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      const d = String(parsedDate.getDate()).padStart(2, '0');
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const y = parsedDate.getFullYear();
      return `${d}-${m}-${y}`;
    }

    // If already in dd-mm-yyyy format
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    return trimmed;
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const d = String(dateInput.getDate()).padStart(2, '0');
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const y = dateInput.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return String(dateInput);
}

/**
 * Clean up raw date input from Google Sheets into "dd-MM-yyyy"
 */
export function cleanGoogleSheetsDate(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  return formatVnDateOnly(str);
}
