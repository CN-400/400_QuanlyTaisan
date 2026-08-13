import { AppSettings, ProcurementRequest, RepairRequest, RequestStatus, UserAccount, UserRole } from '../types';
import { DEFAULT_APPS_SCRIPT_URL, isValidAppsScriptUrl } from '../constants/config';

export interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Helper to safely parse JSON response or detect empty/HTML/Vercel error pages
 */
function parseJsonResponse(text: string): { isJson: boolean; data?: any; errorMsg?: string } {
  if (!text || !text.trim()) {
    return {
      isJson: false,
      errorMsg: 'Google Apps Script không trả về dữ liệu (Phản hồi rỗng).',
    };
  }
  const trimmed = text.trim();
  if (
    trimmed.toLowerCase().startsWith('<!doctype') ||
    trimmed.startsWith('<') ||
    trimmed.toLowerCase().includes('the page cannot') ||
    trimmed.toLowerCase().includes('404: page_not_found')
  ) {
    return {
      isJson: false,
      errorMsg:
        'Trang web trả về giao diện HTML thay vì dữ liệu JSON. Nguyên nhân: Link Google Apps Script bị sai (phải là /exec), hoặc chưa cấp quyền "Bất kỳ ai (Anyone)", hoặc server proxy trên Vercel chưa khả dụng.',
    };
  }

  try {
    const data = JSON.parse(trimmed);
    return { isJson: true, data };
  } catch (err: any) {
    return {
      isJson: false,
      errorMsg: 'Dữ liệu không phải cấu trúc JSON hợp lệ: ' + (err.message || 'Lỗi đọc dữ liệu'),
    };
  }
}

/**
 * Direct client-side fetch to Google Apps Script as fallback
 */
async function fetchDirectFromAppsScript(webAppUrl: string, action: 'GET' | 'POST', payload?: any): Promise<any> {
  let url = (webAppUrl && isValidAppsScriptUrl(webAppUrl)) ? webAppUrl.trim() : DEFAULT_APPS_SCRIPT_URL;
  if (action === 'GET') {
    const targetUrl = new URL(url);
    targetUrl.searchParams.append('action', 'getAll');
    url = targetUrl.toString();
  }

  const options: RequestInit = {
    method: action,
    redirect: 'follow',
  };

  if (action === 'POST' && payload) {
    options.body = JSON.stringify(payload);
    options.headers = { 'Content-Type': 'text/plain' };
  }

  const response = await fetch(url, options);
  const text = await response.text();
  const parsed = parseJsonResponse(text);

  if (!parsed.isJson) {
    throw new Error(parsed.errorMsg);
  }

  return parsed.data;
}

/**
 * Execute request with server proxy, falling back to direct browser fetch if proxy is unavailable (e.g. static Vercel build)
 */
async function executeSheetsApiCall(webAppUrl: string, isPost: boolean, payload?: any): Promise<any> {
  let urlTrimmed = (webAppUrl && isValidAppsScriptUrl(webAppUrl)) ? webAppUrl.trim() : DEFAULT_APPS_SCRIPT_URL;

  if (urlTrimmed.includes('/macros/library/') || urlTrimmed.includes('/edit')) {
    urlTrimmed = DEFAULT_APPS_SCRIPT_URL;
  }

  // 1. Try server proxy endpoint first
  try {
    const actionParam = payload?.action || 'getAll';
    const tokenParam = payload?.token || '';
    const proxyUrl = isPost
      ? '/api/sheets/proxy'
      : `/api/sheets/proxy?webAppUrl=${encodeURIComponent(urlTrimmed)}&action=${encodeURIComponent(actionParam)}&token=${encodeURIComponent(tokenParam)}`;

    const proxyOptions: RequestInit = isPost
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webAppUrl: urlTrimmed, payload }),
        }
      : { method: 'GET' };

    const res = await fetch(proxyUrl, proxyOptions);
    const text = await res.text();
    const parsed = parseJsonResponse(text);

    if (parsed.isJson && res.ok) {
      return parsed.data;
    }
  } catch (err) {
    console.warn('Proxy fetch failed, falling back to direct Google Apps Script request:', err);
  }

  // 2. Direct fallback for Vercel static host or direct browser client
  return await fetchDirectFromAppsScript(urlTrimmed, isPost ? 'POST' : 'GET', payload);
}

/**
 * User Login authentication
 */
export async function loginUser(
  webAppUrl: string,
  username: string,
  password: string
): Promise<SyncResult> {
  if (!webAppUrl) {
    return { success: false, message: 'Chưa cấu hình URL Google Apps Script.' };
  }
  try {
    const result = await executeSheetsApiCall(webAppUrl, true, {
      action: 'login',
      username,
      password,
    });

    if (result && (result.success || result.status === 'success')) {
      const rawUser = result.user || result.data?.user || {};
      const userRole: UserRole = (rawUser.role || rawUser.Role || result.role || 'PROCESSOR') as UserRole;
      
      const parseBool = (val: any, defaultVal: boolean) => {
        if (val === undefined || val === null || val === '') return defaultVal;
        if (typeof val === 'boolean') return val;
        const str = String(val).toLowerCase().trim();
        return str === 'true' || str === '1' || str === 'yes';
      };

      const userObj: UserAccount = {
        username: String(rawUser.username || rawUser.Username || username).trim(),
        fullName: String(rawUser.fullName || rawUser.FullName || username).trim(),
        role: userRole,
        active: parseBool(rawUser.active ?? rawUser.Active, true),
        mustChangePassword: parseBool(rawUser.mustChangePassword ?? rawUser.MustChangePassword, false),
        canEdit: parseBool(rawUser.canEdit ?? rawUser.CanEdit, true),
        canDelete: parseBool(rawUser.canDelete ?? rawUser.CanDelete, userRole === 'ADMIN' || userRole === 'MANAGER'),
        canPrint: parseBool(rawUser.canPrint ?? rawUser.CanPrint, true),
      };

      const tokenVal = result.token || result.data?.token;
      return {
        success: true,
        message: 'Đăng nhập thành công!',
        data: {
          token: tokenVal,
          user: userObj,
        },
      };
    } else {
      return {
        success: false,
        message: result?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi đăng nhập: ' + (err.message || 'Không thể kết nối đến máy chủ.'),
    };
  }
}

/**
 * Validate Session Token
 */
export async function validateSessionApi(webAppUrl: string, token: string): Promise<SyncResult> {
  if (!webAppUrl || !token) {
    return { success: false, message: 'Chưa có token phiên đăng nhập.' };
  }
  try {
    const result = await executeSheetsApiCall(webAppUrl, true, {
      action: 'validateSession',
      token,
    });

    if (result && (result.success || result.status === 'success')) {
      const rawUser = result.user || result.data?.user || result.data || result;
      const userRole: UserRole = (rawUser.role || rawUser.Role || 'PROCESSOR') as UserRole;

      const parseBool = (val: any, defaultVal: boolean) => {
        if (val === undefined || val === null || val === '') return defaultVal;
        if (typeof val === 'boolean') return val;
        const str = String(val).toLowerCase().trim();
        return str === 'true' || str === '1' || str === 'yes';
      };

      const userObj: UserAccount = {
        username: String(rawUser.username || rawUser.Username || '').trim(),
        fullName: String(rawUser.fullName || rawUser.FullName || '').trim(),
        role: userRole,
        active: parseBool(rawUser.active ?? rawUser.Active, true),
        mustChangePassword: parseBool(rawUser.mustChangePassword ?? rawUser.MustChangePassword, false),
        canEdit: parseBool(rawUser.canEdit ?? rawUser.CanEdit, true),
        canDelete: parseBool(rawUser.canDelete ?? rawUser.CanDelete, userRole === 'ADMIN' || userRole === 'MANAGER'),
        canPrint: parseBool(rawUser.canPrint ?? rawUser.CanPrint, true),
      };

      return {
        success: true,
        message: 'Phiên đăng nhập hợp lệ!',
        data: {
          token,
          user: userObj,
        },
      };
    } else {
      return {
        success: false,
        message: result?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Không thể xác thực phiên: ' + (err.message || 'Lỗi kết nối'),
    };
  }
}

/**
 * Change Password (for user logging in with temp password or voluntary change)
 */
export async function changePasswordInGoogleSheets(
  currentPassword: string,
  newPassword: string,
  settings: AppSettings,
  token: string
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  if (!url) return { success: false, message: 'Chưa cấu hình URL Google Apps Script.' };
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'changePassword',
      token,
      currentPassword,
      newPassword,
    });

    if (result && (result.success || result.status === 'success')) {
      return { success: true, message: result.message || 'Đổi mật khẩu thành công!' };
    } else {
      return { success: false, message: result?.message || 'Không thể đổi mật khẩu.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi đổi mật khẩu: ' + (err.message || 'Lỗi kết nối') };
  }
}

/**
 * Reset Password (ADMIN function)
 */
export async function resetPasswordInGoogleSheets(
  targetUsername: string,
  settings: AppSettings,
  token: string
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  if (!url) return { success: false, message: 'Chưa cấu hình URL Google Apps Script.' };
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'resetPassword',
      token,
      data: { username: targetUsername },
    });

    if (result && (result.success || result.status === 'success')) {
      return {
        success: true,
        message: result.message || 'Reset mật khẩu thành công!',
        data: {
          username: targetUsername,
          temporaryPassword: result.temporaryPassword || result.data?.temporaryPassword,
        },
      };
    } else {
      return { success: false, message: result?.message || 'Không thể reset mật khẩu.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi reset mật khẩu: ' + (err.message || 'Lỗi kết nối') };
  }
}

/**
 * User Logout
 */
export async function logoutUser(webAppUrl: string, token: string): Promise<SyncResult> {
  if (!webAppUrl || !token) return { success: true, message: 'Đã đăng xuất' };
  try {
    await executeSheetsApiCall(webAppUrl, true, {
      action: 'logout',
      token,
    });
  } catch (e) {}
  return { success: true, message: 'Đã đăng xuất!' };
}

/**
 * Submit repair request to Google Sheets
 */
export async function syncRepairToGoogleSheets(
  request: RepairRequest,
  settings: AppSettings
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'createRepair',
      managerEmail: settings?.managerEmail || '',
      token: settings?.token || '',
      data: request,
    });

    if (result && (result.success || result.status === 'success')) {
      return { 
        success: true, 
        message: 'Đã lưu thành công vào Google Sheets!',
        data: result
      };
    } else {
      return { success: false, message: result?.message || 'Không thể ghi vào Google Sheets.' };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối: ' + (err.message || 'Không thể kết nối đến Google Sheets.'),
    };
  }
}

/**
 * Submit procurement request to Google Sheets
 */
export async function syncProcurementToGoogleSheets(
  request: ProcurementRequest,
  settings: AppSettings
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'createProcurement',
      managerEmail: settings?.managerEmail || '',
      token: settings?.token || '',
      data: request,
    });

    if (result && (result.success || result.status === 'success')) {
      return { 
        success: true, 
        message: 'Đã lưu thành công vào Google Sheets!',
        data: result
      };
    } else {
      return { success: false, message: result?.message || 'Không thể ghi vào Google Sheets.' };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối: ' + (err.message || 'Không thể kết nối đến Google Sheets.'),
    };
  }
}

/**
 * Update request status in Google Sheets
 */
export async function updateStatusInGoogleSheets(
  type: 'repair' | 'procurement',
  id: string,
  status: RequestStatus,
  handler?: string,
  completionDate?: string,
  note?: string,
  settings?: AppSettings,
  token?: string
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'updateStatus',
      type,
      token: token || settings?.token || '',
      data: { id, status, handler, completionDate, note },
    });

    if (result && (result.success || result.status === 'success')) {
      return { success: true, message: 'Đã cập nhật trạng thái trên Google Sheets!' };
    } else {
      return { success: false, message: result?.message || 'Cập nhật thất bại.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi cập nhật API: ' + (err.message || 'Lỗi không xác định') };
  }
}

/**
 * Fetch configuration directly from Google Sheets (sheet CauHinh)
 */
export async function fetchSettingsFromGoogleSheets(webAppUrl: string): Promise<SyncResult> {
  const url = (webAppUrl && isValidAppsScriptUrl(webAppUrl)) ? webAppUrl.trim() : DEFAULT_APPS_SCRIPT_URL;
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'getSettings',
    });

    if (result && (result.success || result.status === 'success')) {
      const cauHinh = result.cauHinh || result.data?.cauHinh || [];
      if (Array.isArray(cauHinh) && cauHinh.length > 0) {
        const row = cauHinh[0];
        const bankBranchName = row['Tên đơn vị'] || row.bankBranchName || '';
        const managerEmail = row['Email Quản lý'] || row.managerEmail || '';
        return {
          success: true,
          message: 'Tải cấu hình thành công từ Google Sheets (CauHinh)!',
          data: {
            bankBranchName,
            managerEmail,
          },
        };
      }
      return {
        success: true,
        message: 'Sheet CauHinh trống.',
        data: {},
      };
    } else {
      return { success: false, message: result?.message || 'Không thể lấy cấu hình từ Google Sheets.' };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối Google Sheets: ' + (err.message || 'Không thể kết nối'),
    };
  }
}

/**
 * Parse raw rows from sheet SuaChua to RepairRequest objects
 */
export function parseRepairRows(rows: any[]): RepairRequest[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    id: r['Mã đề nghị'] || r.id || '',
    fullName: r['Họ và tên'] || r.fullName || '',
    department: r['Phòng ban'] || r.department || '',
    assetName: r['Tên tài sản'] || r.assetName || '',
    condition: r['Tình trạng'] || r.condition || '',
    reportDate: r['Ngày báo hỏng'] || r.reportDate || '',
    proposal: r['Đề xuất'] || r.proposal || '',
    urgency: r['Mức độ khẩn cấp'] || r.urgency || 'Trung Bình',
    status: r['Trạng thái'] || r.status || 'Đề xuất',
    handler: r['Cán bộ xử lý'] || r.handler || '',
    completionDate: r['Ngày hoàn thành'] || r.completionDate || '',
    note: r['Ghi chú'] || r.note || '',
    createdAt: r['Thời gian khởi tạo'] || r.createdAt || new Date().toISOString(),
  }));
}

/**
 * Parse raw rows from sheet MuaSam to ProcurementRequest objects
 */
export function parseProcurementRows(rows: any[]): ProcurementRequest[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    id: r['Mã đề nghị'] || r.id || '',
    fullName: r['Họ và tên'] || r.fullName || '',
    department: r['Phòng ban'] || r.department || '',
    equipmentName: r['Tên thiết bị'] || r.equipmentName || '',
    quantity: Number(r['Số lượng'] || r.quantity || 1),
    category: r['Chủng loại'] || r.category || '',
    reason: r['Lý do đề xuất'] || r.reason || '',
    description: r['Mô tả yêu cầu'] || r.description || '',
    requestDate: r['Ngày đề nghị'] || r.requestDate || '',
    proposedDate: r['Đề xuất thời gian mua'] || r.proposedDate || '',
    handler: r['Cán bộ xử lý'] || r.handler || '',
    status: r['Trạng thái'] || r.status || 'Đề xuất',
    completionDate: r['Ngày hoàn thành'] || r.completionDate || '',
    note: r['Ghi chú'] || r.note || '',
    createdAt: r['Thời gian khởi tạo'] || r.createdAt || new Date().toISOString(),
  }));
}

/**
 * Save configuration to Google Sheets (sheet CauHinh)
 */
export async function saveSettingsToGoogleSheets(settings: AppSettings, token?: string): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'saveSettings',
      token: token || settings?.token || '',
      managerEmail: settings.managerEmail || '',
      data: {
        bankBranchName: settings.bankBranchName,
        managerEmail: settings.managerEmail,
        adminPassword: settings.adminPassword,
      },
    });

    if (result && (result.success || result.status === 'success')) {
      return { success: true, message: 'Đã lưu cấu hình lên Google Sheets (sheet CauHinh)!' };
    } else {
      return { success: false, message: result?.message || 'Không thể lưu cấu hình vào Google Sheets.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi lưu cấu hình: ' + (err.message || 'Lỗi kết nối') };
  }
}

/**
 * Fetch all sheets data
 */
export async function fetchAllFromGoogleSheets(settings: AppSettings, token?: string): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'getAll',
      token: token || settings?.token || '',
    });

    if (result && (result.success || result.status === 'success')) {
      return {
        success: true,
        message: 'Tải dữ liệu từ Google Sheets thành công!',
        data: result,
      };
    } else {
      return { success: false, message: result?.message || 'Không tải được dữ liệu.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi tải dữ liệu: ' + (err.message || 'Lỗi không xác định') };
  }
}

/**
 * User Management APIs for Admin
 */
export async function fetchUsersFromGoogleSheets(settings: AppSettings, token: string): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'getUsers',
      token,
    });
    if (result && (result.success || result.status === 'success')) {
      const rawUsers = result.users || [];
      const parsedUsers = rawUsers.map((u: any) => ({
        username: String(u.Username || u.username || ''),
        fullName: String(u.FullName || u.fullName || ''),
        role: (u.Role || u.role || 'PROCESSOR') as any,
        active: String(u.Active || u.active).toLowerCase() !== 'false',
        mustChangePassword: String(u.MustChangePassword || u.mustChangePassword).toLowerCase() === 'true',
        canEdit: String(u.CanEdit !== undefined ? u.CanEdit : u.canEdit).toLowerCase() === 'true' || String(u.CanEdit) === '1' || (u.role || u.Role) === 'ADMIN',
        canDelete: String(u.CanDelete !== undefined ? u.CanDelete : u.canDelete).toLowerCase() === 'true' || String(u.CanDelete) === '1' || (u.role || u.Role) === 'ADMIN',
        canPrint: String(u.CanPrint !== undefined ? u.CanPrint : u.canPrint).toLowerCase() === 'true' || String(u.CanPrint) === '1' || (u.role || u.Role) === 'ADMIN',
        createdAt: u.CreatedAt || u.createdAt || '',
        lastLogin: u.LastLogin || u.lastLogin || '',
        passwordChangedAt: u.PasswordChangedAt || u.passwordChangedAt || '',
      }));
      return { success: true, message: 'Tải danh sách người dùng thành công', data: parsedUsers };
    }
    return { success: false, message: result?.message || 'Không thể lấy danh sách người dùng.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Authorize sensitive action (EDIT, DELETE, PRINT)
 */
export async function authorizeActionApi(
  webAppUrl: string,
  username: string,
  password: string,
  permission: 'EDIT' | 'DELETE' | 'PRINT',
  targetId?: string
): Promise<SyncResult> {
  if (!webAppUrl) {
    return { success: false, message: 'Chưa cấu hình URL Google Apps Script.' };
  }
  try {
    const result = await executeSheetsApiCall(webAppUrl, true, {
      action: 'authorizeAction',
      username,
      password,
      permission,
      targetId,
    });

    if (result && (result.success || result.status === 'success')) {
      return {
        success: true,
        message: 'Xác thực quyền ' + permission + ' thành công!',
        data: result.data || result,
      };
    } else {
      return {
        success: false,
        message: result?.message || 'Không có quyền thực hiện thao tác này.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi xác thực quyền: ' + (err.message || 'Không thể kết nối.'),
    };
  }
}

/**
 * Delete Record from Google Sheets with Authorization
 */
export async function deleteRecordInGoogleSheets(
  type: 'repair' | 'procurement',
  recordId: string,
  settings: AppSettings,
  username?: string,
  password?: string
): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  if (!url) return { success: false, message: 'Chưa cấu hình URL Google Apps Script.' };
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'deleteRecord',
      type,
      recordId,
      username,
      password,
      token: settings.token || '',
    });

    if (result && (result.success || result.status === 'success')) {
      return { success: true, message: result.message || 'Đã xóa hồ sơ khỏi Google Sheets!' };
    } else {
      return { success: false, message: result?.message || 'Không thể xóa hồ sơ.' };
    }
  } catch (err: any) {
    return { success: false, message: 'Lỗi xóa hồ sơ: ' + (err.message || 'Lỗi kết nối') };
  }
}

export async function createUserInGoogleSheets(user: any, settings: AppSettings, token: string): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'createUser',
      token,
      data: user,
    });
    if (result && (result.success || result.status === 'success')) {
      return { success: true, message: result.message || 'Đã tạo người dùng thành công!' };
    }
    return { success: false, message: result?.message || 'Không thể tạo người dùng.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateUserInGoogleSheets(user: any, settings: AppSettings, token: string): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'updateUser',
      token,
      data: user,
    });
    if (result && (result.success || result.status === 'success')) {
      return { success: true, message: result.message || 'Đã cập nhật người dùng thành công!' };
    }
    return { success: false, message: result?.message || 'Không thể cập nhật người dùng.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteUserInGoogleSheets(username: string, settings: AppSettings, token: string): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'deleteUser',
      token,
      data: { username },
    });
    if (result && (result.success || result.status === 'success')) {
      return { success: true, message: result.message || 'Đã xóa người dùng thành công!' };
    }
    return { success: false, message: result?.message || 'Không thể xóa người dùng.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchLogsFromGoogleSheets(settings: AppSettings, token: string): Promise<SyncResult> {
  const url = settings?.webAppUrl || '';
  try {
    const result = await executeSheetsApiCall(url, true, {
      action: 'getLogs',
      token,
    });
    if (result && (result.success || result.status === 'success')) {
      return { success: true, message: 'Tải nhật ký thành công', data: result.logs || [] };
    }
    return { success: false, message: result?.message || 'Không thể tải nhật ký.' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}


/**
 * Test Web App URL connection
 */
export async function testGoogleAppsScriptConnection(webAppUrl: string): Promise<SyncResult> {
  const urlTrimmed = webAppUrl ? webAppUrl.trim() : '';

  if (!urlTrimmed || !urlTrimmed.startsWith('http')) {
    return {
      success: false,
      message: 'URL không hợp lệ. Vui lòng nhập link Google Apps Script Web App đầy đủ (https://script.google.com/macros/s/.../exec).',
    };
  }

  if (urlTrimmed.includes('/macros/library/') || urlTrimmed.includes('/edit')) {
    return {
      success: false,
      message: 'Lỗi URL: Link bạn vừa nhập là link Thư viện (Library) hoặc Trình biên tập script, không phải Web App! Vui lòng nhấn "Triển khai (Deploy)" -> "Ứng dụng Web (Web App)" và copy link dạng /exec.',
    };
  }

  try {
    const result = await executeSheetsApiCall(urlTrimmed, false);
    if (result && (result.status === 'success' || result.status === 'ok')) {
      return { success: true, message: 'Kết nối thành công tới Google Apps Script Web App!' };
    } else {
      return { success: false, message: result?.message || 'Kết nối thất bại. Vui lòng kiểm tra lại quyền truy cập (Anyone).' };
    }
  } catch (err: any) {
    return { success: false, message: 'Không thể kết nối URL: ' + (err.message || 'Không thể truy cập Google Sheets') };
  }
}

