/**
 * Date Formatting Utility for VietinBank Ninh Binh Management App
 * Ensures all dates are formatted consistently as "dd-MM-yyyy" (e.g., "19-08-2026")
 * respecting Vietnam Timezone (GMT+7, Asia/Ho_Chi_Minh) to avoid 1-day lag from UTC strings.
 */

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Get today's date formatted as YYYY-MM-DD in Vietnam timezone (GMT+7).
 * Used for <input type="date"> default values.
 */
export function getLocalTodayYmd(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: VIETNAM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Returns "YYYY-MM-DD" e.g., "2026-08-19"
  } catch (e) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Convert any date, ISO timestamp, or date string into "YYYY-MM-DD" strictly in Vietnam timezone
 */
export function getDateYmdInVnTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '';

    // 1. Pure YYYY-MM-DD (e.g., 2026-08-19)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // 2. Pure DD-MM-YYYY or DD/MM/YYYY (e.g., 19-08-2026 or 19/08/2026)
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 3. ISO string or Date string with time (e.g. 2026-08-18T17:00:00.000Z)
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: VIETNAM_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        return formatter.format(parsed); // Returns YYYY-MM-DD in Vietnam Time
      } catch (e) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    return '';
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: VIETNAM_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(dateInput);
    } catch (e) {
      const y = dateInput.getFullYear();
      const m = String(dateInput.getMonth() + 1).padStart(2, '0');
      const d = String(dateInput.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return '';
}

/**
 * Format any date, ISO string, or timestamp strictly into "dd-MM-yyyy"
 */
export function formatVnDateTime(dateInput?: string | Date | null, _fallbackTimeInput?: string): string {
  return formatVnDateOnly(dateInput);
}

/**
 * Format strictly as Date Only: "dd-MM-yyyy" in Vietnam Timezone (GMT+7)
 */
export function formatVnDateOnly(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '-';

    // 1. If already in dd-MM-yyyy format (e.g. "19-08-2026")
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }

    // 2. If in dd/MM/yyyy format (e.g. "19/08/2026")
    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }

    // 3. If pure YYYY-MM-DD date without time (e.g. "2026-08-19")
    const ymdPureMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdPureMatch) {
      const [, y, m, d] = ymdPureMatch;
      return `${d}-${m}-${y}`;
    }

    // 4. If it's an ISO timestamp with time/timezone (e.g. "2026-08-18T17:00:00.000Z")
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: VIETNAM_TIMEZONE,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        // en-GB outputs DD/MM/YYYY in Vietnam timezone
        return formatter.format(parsedDate).replace(/\//g, '-');
      } catch (e) {
        const d = String(parsedDate.getDate()).padStart(2, '0');
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const y = parsedDate.getFullYear();
        return `${d}-${m}-${y}`;
      }
    }

    return trimmed;
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: VIETNAM_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      return formatter.format(dateInput).replace(/\//g, '-');
    } catch (e) {
      const d = String(dateInput.getDate()).padStart(2, '0');
      const m = String(dateInput.getMonth() + 1).padStart(2, '0');
      const y = dateInput.getFullYear();
      return `${d}-${m}-${y}`;
    }
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
  // 1. Date string in YYYY-MM-DD format (converted to Vietnam timezone)
  const dateVal = item.reportDate || item.requestDate || '';
  const dateStr = getDateYmdInVnTime(dateVal) || getDateYmdInVnTime(item.createdAt);

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
