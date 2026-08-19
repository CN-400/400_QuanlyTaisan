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

/**
 * Extract sortable numeric value or timestamp to ensure newest records are on top
 */
export function getSortScore(item: { id?: string; reportDate?: string; requestDate?: string; createdAt?: string }): {
  dateStr: string;
  seqNumber: number;
  rawTime: number;
} {
  // 1. Date string in YYYY-MM-DD format
  let dateStr = '';
  const dateVal = item.reportDate || item.requestDate || '';
  if (dateVal) {
    const dmy = dateVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
      dateStr = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    } else {
      const ymd = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymd) {
        dateStr = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
      }
    }
  }

  // 2. Numerical Sequence in ID (e.g., SC-2026-0025 -> 20260025)
  let seqNumber = 0;
  if (item.id) {
    const digits = item.id.replace(/\D/g, '');
    if (digits) {
      seqNumber = parseInt(digits, 10) || 0;
    }
  }

  // 3. Raw timestamp if available
  let rawTime = 0;
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t) && t > 0) {
      rawTime = t;
    }
  }

  return { dateStr, seqNumber, rawTime };
}

/**
 * Comparator to sort requests so that the newest ones appear first
 */
export function compareRequestsNewestFirst<T extends { id?: string; reportDate?: string; requestDate?: string; createdAt?: string }>(
  a: T,
  b: T
): number {
  const scoreA = getSortScore(a);
  const scoreB = getSortScore(b);

  // 1. Compare by numerical sequence in ID descending (e.g. SC-2026-0010 before SC-2026-0001)
  if (scoreA.seqNumber !== scoreB.seqNumber && scoreA.seqNumber > 0 && scoreB.seqNumber > 0) {
    return scoreB.seqNumber - scoreA.seqNumber;
  }

  // 2. Compare by date (YYYY-MM-DD descending)
  if (scoreA.dateStr && scoreB.dateStr && scoreA.dateStr !== scoreB.dateStr) {
    return scoreB.dateStr.localeCompare(scoreA.dateStr);
  }

  // 3. Compare by raw timestamp
  if (scoreA.rawTime !== scoreB.rawTime && scoreA.rawTime > 0 && scoreB.rawTime > 0) {
    return scoreB.rawTime - scoreA.rawTime;
  }

  // 4. Fallback string ID comparison
  return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
}
