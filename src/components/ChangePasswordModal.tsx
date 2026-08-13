import React, { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, X, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types';
import { changePasswordInGoogleSheets } from '../services/sheetsApi';

interface ChangePasswordModalProps {
  settings: AppSettings;
  username: string;
  token?: string;
  isMandatory?: boolean;
  onSuccess: () => void;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  settings,
  username,
  token,
  isMandatory = false,
  onSuccess,
  onClose,
  showToast,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password complexity checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[@$!%*?&#^()_\-+=\[\]{}|\\:;"'<>,./~`]/.test(newPassword);
  const matchesConfirm = newPassword && newPassword === confirmPassword;

  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!oldPassword.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại (hoặc mật khẩu tạm thời)!');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Mật khẩu mới chưa đáp ứng đủ các tiêu chuẩn bảo mật (độ dài, chữ hoa, chữ thường, số, ký tự đặc biệt)!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu mới và Nhập lại mật khẩu không trùng khớp!');
      return;
    }

    if (oldPassword === newPassword) {
      setErrorMsg('Mật khẩu mới phải khác mật khẩu hiện tại!');
      return;
    }

    setLoading(true);
    const effectiveToken = token || settings.token || 'ST-LOCAL-ADMIN';
    const res = await changePasswordInGoogleSheets(
      oldPassword,
      newPassword,
      settings,
      effectiveToken
    );
    setLoading(false);

    if (res.success) {
      showToast(res.message || 'Đổi mật khẩu thành công!', 'success');
      onSuccess();
    } else {
      setErrorMsg(res.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
      showToast(res.message || 'Đổi mật khẩu thất bại!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#002060] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-400/30">
              <KeyRound className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-extrabold uppercase tracking-wide">
                {isMandatory ? 'Đổi Mật Khẩu Bắt Buộc' : 'Thay Đổi Mật Khẩu'}
              </h3>
              <p className="text-xs text-blue-200">Tài khoản: <span className="font-mono font-bold text-amber-300">{username}</span></p>
            </div>
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-900 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isMandatory && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Yêu cầu đổi mật khẩu lần đầu / tạm thời</p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Bạn đang sử dụng mật khẩu tạm thời. Vui lòng thiết lập mật khẩu mới trước khi tiếp tục sử dụng hệ thống V6.3.2.
                </p>
              </div>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Mật khẩu hiện tại (hoặc mật khẩu tạm) *</span>
            </label>
            <div className="relative">
              <input
                type={showOldPass ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nhập mật khẩu hiện tại..."
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-semibold text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mật khẩu mới *</span>
            </label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nhập mật khẩu mới..."
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-semibold text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xác nhận mật khẩu mới *</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Nhập lại mật khẩu mới..."
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm font-semibold text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Complexity checklist */}
          <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 text-[11px] space-y-1.5">
            <p className="font-bold text-gray-700 uppercase">Tiêu chuẩn mật khẩu an toàn (V6.3.2):</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <div className={`flex items-center space-x-1 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-gray-300'}`} />
                <span>Ít nhất 8 ký tự</span>
              </div>
              <div className={`flex items-center space-x-1 ${hasUpper ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpper ? 'text-emerald-600' : 'text-gray-300'}`} />
                <span>Chữ hoa (A-Z)</span>
              </div>
              <div className={`flex items-center space-x-1 ${hasLower ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasLower ? 'text-emerald-600' : 'text-gray-300'}`} />
                <span>Chữ thường (a-z)</span>
              </div>
              <div className={`flex items-center space-x-1 ${hasDigit ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasDigit ? 'text-emerald-600' : 'text-gray-300'}`} />
                <span>Số (0-9)</span>
              </div>
              <div className={`flex items-center space-x-1 ${hasSpecial ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-600' : 'text-gray-300'}`} />
                <span>Ký tự đặc biệt (@,#,$...)</span>
              </div>
              <div className={`flex items-center space-x-1 ${matchesConfirm ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${matchesConfirm ? 'text-emerald-600' : 'text-gray-300'}`} />
                <span>Khớp mật khẩu xác nhận</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
            {!isMandatory && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !matchesConfirm}
              className="px-6 py-2.5 bg-[#002060] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cập Nhật Mật Khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
