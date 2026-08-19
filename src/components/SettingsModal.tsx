import React, { useState } from 'react';
import { X, Settings, RotateCcw, Building2, Link2, Mail, Lock, LogOut, ShieldCheck, Eye, EyeOff, Smartphone, Share2, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types';
import { resetDataToSample } from '../services/storage';
import { saveSettingsToGoogleSheets, testEmailNotification } from '../services/sheetsApi';
import { DEFAULT_APPS_SCRIPT_URL } from '../constants/config';
import { Loader2, Send } from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onResetData: () => void;
  onClose: () => void;
  onLogoutAdmin?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onResetData,
  onClose,
  onLogoutAdmin,
  showToast,
}) => {
  const [bankBranchName, setBankBranchName] = useState<string>(
    settings.bankBranchName || 'NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH'
  );
  const [webAppUrl] = useState<string>(settings.webAppUrl || DEFAULT_APPS_SCRIPT_URL);
  const [managerEmail, setManagerEmail] = useState<string>(settings.managerEmail || '');
  const [adminPassword, setAdminPassword] = useState<string>(settings.adminPassword || 'admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleCopyMobileLink = () => {
    const activeUrl = webAppUrl || DEFAULT_APPS_SCRIPT_URL;
    const origin = window.location.origin;
    const shareUrl = `${origin}/?webAppUrl=${encodeURIComponent(activeUrl)}&email=${encodeURIComponent(managerEmail.trim())}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast('Đã sao chép Link tự động cấu hình cho Điện thoại!', 'success');
    } else {
      showToast('Vui lòng copy thủ công link trên thanh địa chỉ', 'info');
    }
  };

  const [saving, setSaving] = useState<boolean>(false);
  const [testingEmail, setTestingEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestEmail = async () => {
    if (!managerEmail.trim()) {
      showToast('Vui lòng nhập ít nhất 1 địa chỉ email để thử nghiệm!', 'error');
      return;
    }
    setTestingEmail(true);
    setTestEmailResult(null);
    const activeUrl = webAppUrl || DEFAULT_APPS_SCRIPT_URL;
    const res = await testEmailNotification(activeUrl, managerEmail.trim(), settings.token);
    setTestingEmail(false);
    setTestEmailResult({ success: res.success, message: res.message });
    if (res.success) {
      showToast('Đã gửi email thử nghiệm thành công!', 'success');
    } else {
      showToast('Gửi thử nghiệm thất bại: ' + res.message, 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      showToast('Mật khẩu Admin không được để trống!', 'error');
      return;
    }

    setSaving(true);
    const updatedSettings: AppSettings = {
      ...settings,
      bankBranchName: bankBranchName.trim(),
      webAppUrl: (webAppUrl || DEFAULT_APPS_SCRIPT_URL).trim(),
      managerEmail: managerEmail.trim(),
      adminPassword: adminPassword.trim(),
    };

    // Tự động lưu lên Google Sheets (sheet CauHinh)
    const result = await saveSettingsToGoogleSheets(updatedSettings);
    if (result.success) {
      await onSaveSettings(updatedSettings);
      setSaving(false);
      showToast('Đã lưu & đồng bộ cấu hình nghiệp vụ thành công lên Google Sheets (sheet CauHinh)!', 'success');
      onClose();
    } else {
      setSaving(false);
      showToast('Không thể lưu cấu hình vào Google Sheets: ' + (result.message || 'Lỗi kết nối'), 'error');
    }
  };

  const handleResetSampleData = () => {
    if (window.confirm('Khôi phục dữ liệu mẫu sẽ tạo lại danh sách đề nghị ban đầu. Bạn có đồng ý?')) {
      resetDataToSample();
      onResetData();
      showToast('Đã khôi phục dữ liệu mẫu thành công!', 'info');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="bg-[#00529C] text-white p-5 flex items-center justify-between border-b-4 border-[#ED1C24]">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1.5 rounded-xl shadow-sm flex items-center justify-center shrink-0">
              <img
                src="https://raw.githubusercontent.com/giadinhbanker/anh-super-app-bac-phu-tho/main/Logo%20VietinBank.png"
                alt="VietinBank"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-white">Cài Đặt Hệ Thống</h3>
              <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Quyền Quản Trị Viên (Admin)</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs sm:text-sm max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Tên Ngân hàng / Chi nhánh</span>
            </label>
            <input
              type="text"
              value={bankBranchName}
              onChange={(e) => setBankBranchName(e.target.value)}
              placeholder="Ví dụ: VietinBank - Chi Nhánh Ninh Bình"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-semibold"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1">
                <Link2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Apps Script Backend URL</span>
              </label>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Hệ Thống Mặc Định</span>
              </span>
            </div>
            <input
              type="text"
              value={webAppUrl || DEFAULT_APPS_SCRIPT_URL}
              readOnly
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-100 text-gray-600 font-mono text-xs cursor-not-allowed select-all"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              URL Backend đã được thiết lập cố định toàn hệ thống. Tất cả thiết bị (PC, Phone, Tablet) truy cập WebApp sẽ tự động kết nối trung tâm.
            </p>

            {/* Mobile Connectivity Sync Box */}
            <div className="mt-2 p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-950 space-y-2">
              <div className="flex items-start space-x-2">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-blue-900">Kết nối Tự động trên Mọi Thiết Bị:</p>
                  <p className="text-blue-700 mt-0.5">
                    Hệ thống tự động đồng bộ tất cả cấu hình nghiệp vụ từ Google Sheets (CauHinh). Điện thoại và máy tính mới không cần thiết lập lại!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyMobileLink}
                className="w-full py-1.5 px-3 bg-white hover:bg-blue-100 text-blue-800 font-bold rounded-lg text-xs border border-blue-300 transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Sao chép Link chia sẻ WebApp cho Cán bộ</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Danh sách Email nhận thông báo tự động</span>
              </span>
              <span className="text-[11px] text-blue-600 font-semibold normal-case">
                Phân cách bằng dấu phẩy (,) hoặc chấm phẩy (;)
              </span>
            </label>
            <input
              type="text"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="trongduc.ict@gmail.com, ha.dinhthanh@vietinbank.vn, thuctq@vietinbank.vn"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-xs font-medium text-gray-900"
            />
            {/* Email chips preview */}
            {managerEmail && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-gray-500 font-semibold">Đang cấu hình nhận mail:</span>
                {managerEmail
                  .split(/[;,]+/)
                  .map((em) => em.trim())
                  .filter(Boolean)
                  .map((em, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                    >
                      📧 {em}
                    </span>
                  ))}
              </div>
            )}
            {/* Test Email Button & Result */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail || !managerEmail.trim()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors disabled:opacity-50"
              >
                {testingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Đang gửi thử nghiệm tới các email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>Gửi thử nghiệm Email tới các địa chỉ trên</span>
                  </>
                )}
              </button>
            </div>

            {testEmailResult && (
              <div
                className={`mt-2 p-2.5 rounded-xl text-xs border ${
                  testEmailResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <div className="font-semibold flex items-center space-x-1.5">
                  {testEmailResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testEmailResult.message}</span>
                </div>
              </div>
            )}

            <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
              💡 Mỗi khi cán bộ gửi phiếu Đề nghị Sửa chữa hoặc Mua sắm mới, hệ thống sẽ tự động gửi email thông báo chi tiết đến từng địa chỉ trong danh sách trên một cách độc lập.
            </p>
          </div>

          {/* Admin Password Configuration */}
          <div className="pt-2 border-t border-gray-200">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Đổi Mật khẩu Admin Quản trị</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Nhập mật khẩu quản trị mới..."
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 outline-none text-xs font-bold bg-amber-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Mật khẩu này dùng để ngăn cán bộ thông thường tự ý thay đổi cấu hình hệ thống.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-200 space-y-2">
            <button
              type="button"
              onClick={handleResetSampleData}
              className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 border border-red-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Khôi phục Dữ liệu Mẫu Ban đầu</span>
            </button>

            {onLogoutAdmin && (
              <button
                type="button"
                onClick={() => {
                  onLogoutAdmin();
                  showToast('Đã đăng xuất quyền Admin!', 'info');
                  onClose();
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 border border-slate-300"
              >
                <LogOut className="w-4 h-4 text-slate-600" />
                <span>Đăng Xuất Quyền Admin</span>
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#002060] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow transition-all"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

