/**
 * Date and Time Formatting Utility for VietinBank Ninh Binh Management App
 * Ensures all dates and timestamps are formatted nicely as:
 * - Date with time: "dd-MM-yyyy - HH:mm" (e.g., "18-08-2026 - 17:00")
 * - Date only: "dd-MM-yyyy" (e.g., "18-08-2026")
 */

/**
 * Format any date or ISO string into "dd-MM-yyyy - HH:mm" or "dd-MM-yyyy"
 */
export function formatVnDateTime(dateInput?: string | Date | null, fallbackTimeInput?: string): string {
  if (!dateInput) return '-';

  // If already formatted as dd-mm-yyyy - HH:mm
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '-';

    // If it's already in dd-mm-yyyy - HH:mm or dd/mm/yyyy - HH:mm format
    if (/^\d{2}[-/]\d{2}[-/]\d{4}\s*-\s*\d{2}:\d{2}/.test(trimmed)) {
      return trimmed.replace(/\//g, '-');
    }

    // If it matches ISO format with Time: YYYY-MM-DDTHH:mm:ss...
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (isoMatch) {
      const [, y, m, d, hh, mm] = isoMatch;
      return `${d}-${m}-${y} - ${hh}:${mm}`;
    }

    // If matches YYYY-MM-DD HH:mm:ss
    const ymdhmsMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (ymdhmsMatch) {
      const [, y, m, d, hh, mm] = ymdhmsMatch;
      return `${d}-${m}-${y} - ${hh}:${mm}`;
    }

    // If matches YYYY-MM-DD only
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      // Check if fallback time is provided (e.g., from createdAt)
      if (fallbackTimeInput && typeof fallbackTimeInput === 'string') {
        const timeMatch = fallbackTimeInput.match(/T(\d{2}):(\d{2})/);
        if (timeMatch) {
          return `${d}-${m}-${y} - ${timeMatch[1]}:${timeMatch[2]}`;
        }
      }
      return `${d}-${m}-${y}`;
    }

    // If matches DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s*,?\s*(\d{1,2}):(\d{2}))?/);
    if (dmyMatch) {
      const [, d, m, y, hh, mm] = dmyMatch;
      const dStr = d.padStart(2, '0');
      const mStr = m.padStart(2, '0');
      if (hh && mm) {
        return `${dStr}-${mStr}-${y} - ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
      }
      if (fallbackTimeInput && typeof fallbackTimeInput === 'string') {
        const timeMatch = fallbackTimeInput.match(/T(\d{2}):(\d{2})/);
        if (timeMatch) {
          return `${dStr}-${mStr}-${y} - ${timeMatch[1]}:${timeMatch[2]}`;
        }
      }
      return `${dStr}-${mStr}-${y}`;
    }

    // Try parsing as JavaScript Date
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      const d = String(parsedDate.getDate()).padStart(2, '0');
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const y = parsedDate.getFullYear();
      const hh = String(parsedDate.getHours()).padStart(2, '0');
      const mm = String(parsedDate.getMinutes()).padStart(2, '0');

      if (hh === '00' && mm === '00' && !trimmed.includes(':')) {
        return `${d}-${m}-${y}`;
      }
      return `${d}-${m}-${y} - ${hh}:${mm}`;
    }

    return trimmed;
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const d = String(dateInput.getDate()).padStart(2, '0');
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const y = dateInput.getFullYear();
    const hh = String(dateInput.getHours()).padStart(2, '0');
    const mm = String(dateInput.getMinutes()).padStart(2, '0');

    if (hh === '00' && mm === '00') {
      return `${d}-${m}-${y}`;
    }
    return `${d}-${m}-${y} - ${hh}:${mm}`;
  }

  return String(dateInput);
}

/**
 * Format strictly as Date Only: "dd-MM-yyyy"
 */
export function formatVnDateOnly(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '-';

    // Matches YYYY-MM-DD or starts with YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
    }

    // Matches DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[1].padStart(2, '0')}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[3]}`;
    }

    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      const d = String(parsedDate.getDate()).padStart(2, '0');
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const y = parsedDate.getFullYear();
      return `${d}-${m}-${y}`;
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
 * Clean up raw date input from Google Sheets into dd-MM-yyyy or dd-MM-yyyy - HH:mm
 */
export function cleanGoogleSheetsDate(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // If it's an ISO format with T
  if (str.includes('T') && str.endsWith('Z')) {
    return formatVnDateTime(str);
  }

  // If it's standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return formatVnDateOnly(str);
  }

  return str;
}
