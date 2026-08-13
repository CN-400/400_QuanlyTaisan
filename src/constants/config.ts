export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzYcjvYr6gHHyWfOfapc7Y9p-pvA4Aj6sRX9-h-VrO0MEIZJSsWVGEIp7Mc62RaYguW/exec';

/**
 * Validates if a string is a valid Google Apps Script Web App URL ending with /exec
 */
export const isValidAppsScriptUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://script.google.com/macros/s/')) return false;
  const urlWithoutParams = trimmed.split('?')[0];
  return urlWithoutParams.endsWith('/exec');
};
