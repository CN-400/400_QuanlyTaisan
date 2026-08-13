import React, { useState } from 'react';
import { X, Settings, RotateCcw, Building2, Link2, Mail, Lock, LogOut, ShieldCheck, Eye, EyeOff, Smartphone, Share2, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types';
import { resetDataToSample } from '../services/storage';
import { saveSettingsToGoogleSheets } from '../services/sheetsApi';

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
  const [webAppUrl, setWebAppUrl] = useState<string>(settings.webAppUrl || '');
  const [managerEmail, setManagerEmail] = useState<string>(settings.managerEmail || '');
  const [adminPassword, setAdminPassword] = useState<string>(settings.adminPassword || 'admin123');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleCopyMobileLink = () => {
    if (!webAppUrl.trim()) {
      showToast('Vui lòng nhập Google Apps Script Web App URL trước!', 'error');
      return;
    }
    const origin = window.location.origin;
    const shareUrl = `${origin}/?webAppUrl=${encodeURIComponent(webAppUrl.trim())}&email=${encodeURIComponent(managerEmail.trim())}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast('Đã sao chép Link tự động cấu hình cho Điện thoại!', 'success');
    } else {
      showToast('Vui lòng copy thủ công link trên thanh địa chỉ', 'info');
    }
  };

  const [saving, setSaving] = useState<boolean>(false);

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
      webAppUrl: webAppUrl.trim(),
      managerEmail: managerEmail.trim(),
      adminPassword: adminPassword.trim(),
    };

    // Tự động lưu lên Google Sheets (sheet CauHinh)
    if (updatedSettings.webAppUrl) {
      const result = await saveSettingsToGoogleSheets(updatedSettings);
      if (result.success) {
        await onSaveSettings(updatedSettings);
        setSaving(false);
        showToast('Đã lưu & đồng bộ cấu hình thành công lên Google Sheets (sheet CauHinh)!', 'success');
        onClose();
      } else {
        setSaving(false);
        showToast('Không thể lưu cấu hình vào Google Sheets: ' + (result.message || 'Lỗi kết nối'), 'error');
      }
    } else {
      await onSaveSettings(updatedSettings);
      setSaving(false);
      showToast('Đã lưu cấu hình tạm thời cục bộ. Vui lòng nhập Web App URL để đồng bộ Google Sheets!', 'info');
      onClose();
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
        <div className="bg-[#002060] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-amber-300" />
            <div>
              <h3 className="text-lg font-bold">Cài Đặt Hệ Thống</h3>
              <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Quyền Quản Trị Viên (Admin)</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-900 rounded-lg transition-colors"
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
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Apps Script Web App URL</span>
            </label>
            <input
              type="text"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none font-mono text-xs"
            />
            {(webAppUrl.includes('/macros/library/') || webAppUrl.includes('/edit')) && (
              <p className="mt-1.5 text-xs text-amber-700 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200">
                ⚠️ Bạn đang nhập link Thư viện (Library) hoặc Editor. Vui lòng bấm "Triển khai" &gt; "Ứng dụng Web" trong Apps Script và copy link đuôi <code>/exec</code>!
              </p>
            )}

            {/* Mobile Connectivity Sync Box */}
            <div className="mt-2 p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-950 space-y-2">
              <div className="flex items-start space-x-2">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold text-blue-900">Kết nối Tự động trên Điện thoại & Tất cả thiết bị:</p>
                  <p className="text-blue-700 mt-0.5">
                    Khi Admin bấm <strong>"Lưu Thay Đổi"</strong>, máy chủ sẽ tự lưu cấu hình kết nối. Điện thoại chỉ cần truy cập web ứng dụng là sẽ tự kết nối thành công!
                  </p>
                </div>
              </div>

              {webAppUrl && (
                <button
                  type="button"
                  onClick={handleCopyMobileLink}
                  className="w-full py-1.5 px-3 bg-white hover:bg-blue-100 text-blue-800 font-bold rounded-lg text-xs border border-blue-300 transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sao chép Link chia sẻ kèm cấu hình sẵn cho Điện thoại</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Email Cán bộ Quản lý nhận thông báo</span>
            </label>
            <input
              type="text"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="qlts.ninhbinh@vietinbank.vn (Nhiều email cách nhau bằng dấu phẩy)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-xs"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Tự động gửi mail thông báo kèm toàn bộ chi tiết phiếu cho Cán bộ Quản lý khi có đề nghị mới.
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

