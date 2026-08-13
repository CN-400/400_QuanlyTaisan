import { AppSettings, ProcurementRequest, RepairRequest } from '../types';
import { SAMPLE_PROCUREMENT_REQUESTS, SAMPLE_REPAIR_REQUESTS } from '../constants/data';
import { fetchSettingsFromGoogleSheets, saveSettingsToGoogleSheets } from './sheetsApi';

const REPAIR_STORAGE_KEY = 'vtb_asset_repair_requests_v1';
const PROCUREMENT_STORAGE_KEY = 'vtb_asset_procurement_requests_v1';
const SETTINGS_STORAGE_KEY = 'vtb_asset_app_settings_v1';

/**
 * Get system bootstrap Apps Script Web App URL from environment or localStorage
 */
export const getBootstrapWebAppUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_APPS_SCRIPT_URL || '';
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.webAppUrl) return parsed.webAppUrl;
    }
  } catch (e) {}
  return '';
};

export const getAppSettings = (): AppSettings => {
  const defaultUrl = getBootstrapWebAppUrl();
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        adminPassword: 'admin123',
        bankBranchName: 'NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH',
        webAppUrl: defaultUrl || parsed.webAppUrl || '',
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to parse app settings from localStorage:', e);
  }
  return {
    webAppUrl: defaultUrl,
    autoSync: true,
    bankBranchName: 'NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH',
    managerEmail: '',
    adminPassword: 'admin123',
  };
};

/**
 * Synchronize business settings directly from Google Sheets (sheet CauHinh).
 * Google Sheets is the SINGLE SOURCE OF TRUTH for settings across all devices.
 */
export const syncSettingsFromGoogleSheets = async (currentSettings: AppSettings): Promise<AppSettings> => {
  const url = currentSettings.webAppUrl || getBootstrapWebAppUrl();
  if (!url) return currentSettings;

  try {
    const res = await fetchSettingsFromGoogleSheets(url);
    if (res.success && res.data && Object.keys(res.data).length > 0) {
      const merged: AppSettings = {
        ...currentSettings,
        webAppUrl: url,
        bankBranchName: res.data.bankBranchName || currentSettings.bankBranchName || 'NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH',
        managerEmail: res.data.managerEmail !== undefined ? res.data.managerEmail : currentSettings.managerEmail,
        adminPassword: res.data.adminPassword || currentSettings.adminPassword || 'admin123',
      };
      // Update local cache
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    }
  } catch (err) {
    console.warn('Could not sync settings from Google Sheets CauHinh sheet:', err);
  }

  return currentSettings;
};

export const saveAppSettings = async (settings: AppSettings): Promise<AppSettings> => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not write to localStorage:', e);
  }

  // Save directly to Google Sheets (sheet CauHinh)
  if (settings.webAppUrl) {
    try {
      await saveSettingsToGoogleSheets(settings);
    } catch (err) {
      console.warn('Failed to save settings to Google Sheets CauHinh sheet:', err);
    }
  }

  return settings;
};

/**
 * Check URL query string for pre-configured Apps Script URL (e.g., ?webAppUrl=... or ?scriptUrl=...)
 */
export const checkAndApplyUrlConfig = (): AppSettings => {
  const current = getAppSettings();
  if (typeof window === 'undefined') return current;

  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('webAppUrl') || urlParams.get('scriptUrl') || urlParams.get('url');
  const paramEmail = urlParams.get('managerEmail') || urlParams.get('email');

  if (paramUrl || paramEmail) {
    const updated: AppSettings = {
      ...current,
      webAppUrl: paramUrl ? paramUrl.trim() : current.webAppUrl,
      managerEmail: paramEmail ? paramEmail.trim() : current.managerEmail,
    };
    saveAppSettings(updated);
    return updated;
  }

  return current;
};

export const getRepairRequests = (): RepairRequest[] => {
  const saved = localStorage.getItem(REPAIR_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load repair requests', e);
    }
  }
  // Initialize with sample data if empty
  localStorage.setItem(REPAIR_STORAGE_KEY, JSON.stringify(SAMPLE_REPAIR_REQUESTS));
  return SAMPLE_REPAIR_REQUESTS;
};

export const saveRepairRequests = (requests: RepairRequest[]): void => {
  localStorage.setItem(REPAIR_STORAGE_KEY, JSON.stringify(requests));
};

export const getProcurementRequests = (): ProcurementRequest[] => {
  const saved = localStorage.getItem(PROCUREMENT_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load procurement requests', e);
    }
  }
  // Initialize with sample data if empty
  localStorage.setItem(PROCUREMENT_STORAGE_KEY, JSON.stringify(SAMPLE_PROCUREMENT_REQUESTS));
  return SAMPLE_PROCUREMENT_REQUESTS;
};

export const saveProcurementRequests = (requests: ProcurementRequest[]): void => {
  localStorage.setItem(PROCUREMENT_STORAGE_KEY, JSON.stringify(requests));
};

/**
 * Generate Next Proposal ID for Repair: SC-YYYY-0001
 */
export const generateNextRepairId = (requests: RepairRequest[]): string => {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;
  
  let maxNum = 0;
  requests.forEach(r => {
    if (r.id && r.id.startsWith(prefix)) {
      const numPart = parseInt(r.id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

/**
 * Generate Next Proposal ID for Procurement: MS-YYYY-0001
 */
export const generateNextProcurementId = (requests: ProcurementRequest[]): string => {
  const year = new Date().getFullYear();
  const prefix = `MS-${year}-`;
  
  let maxNum = 0;
  requests.forEach(r => {
    if (r.id && r.id.startsWith(prefix)) {
      const numPart = parseInt(r.id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  });

  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

export const resetDataToSample = (): void => {
  localStorage.setItem(REPAIR_STORAGE_KEY, JSON.stringify(SAMPLE_REPAIR_REQUESTS));
  localStorage.setItem(PROCUREMENT_STORAGE_KEY, JSON.stringify(SAMPLE_PROCUREMENT_REQUESTS));
};
