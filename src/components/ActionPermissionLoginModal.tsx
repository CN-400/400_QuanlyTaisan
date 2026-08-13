import React, { useState } from 'react';
import { Lock, ShieldAlert, X, Loader2, Edit, Trash2, Printer, KeyRound, UserCheck } from 'lucide-react';
import { AppSettings, UserAccount } from '../types';
import { authorizeActionApi } from '../services/sheetsApi';

interface ActionPermissionLoginModalProps {
  action: 'EDIT' | 'DELETE' | 'PRINT';
  targetId?: string;
  settings: AppSettings;
  onAuthorized: (authUser: { username: string; fullName: string; permission: string }) => void;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ActionPermissionLoginModal: React.FC<ActionPermissionLoginModalProps> = ({
  action,
  targetId,
  settings,
  onAuthorized,
  onClose,
  showToast,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  let title = 'XÁC THỰC QUYỀN MỞ MỎI';
  let headerBg = 'bg-gradient-to-r from-[#002060] to-[#003366]';
  let icon = <Lock className="w-6 h-6 text-amber-300" />;
  let actionLabel = 'thao tác này';

  if (action === 'EDIT') {
    title = 'XÁC THỰC QUYỀN CHỈNH SỬA';
    headerBg = 'bg-gradient-to-r from-blue-800 to-[#002060]';
    icon = <Edit className="w-6 h-6 text-amber-300" />;
    actionLabel = 'Chỉnh sửa';
  } else if (action === 'DELETE') {
    title = 'XÁC THỰC QUYỀN XÓA';
    headerBg = 'bg-gradient-to-r from-red-800 to-red-950';
    icon = <Trash2 className="w-6 h-6 text-amber-300" />;
    actionLabel = 'Xóa';
  } else if (action === 'PRINT') {
    title = 'XÁC THỰC QUYỀN IN';
    headerBg = 'bg-gradient-to-r from-amber-700 to-amber-900';
    icon = <Printer className="w-6 h-6 text-white" />;
    actionLabel = 'In';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!');
      return;
    }

    setLoading(true);
    const res = await authorizeActionApi(settings.webAppUrl, trimmedUser, trimmedPass, action, targetId);
    setLoading(false);

    if (res.success && res.data) {
      if (showToast) {
        showToast(`Xác thực quyền ${actionLabel} thành công!`, 'success');
      }
      onAuthorized({
        username: res.data.username || trimmedUser,
        fullName: res.data.fullName || trimmedUser,
        permission: action,
      });
    } else {
      const err = res.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.';
      setErrorMessage(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 transform transition-all">
        {/* Header */}
        <div className={`${headerBg} text-white p-5 flex items-center justify-between relative`}>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              {icon}
            </div>
            <div>
              <h3 className="font-extrabold text-lg uppercase tracking-wide text-white">{title}</h3>
              <p className="text-xs text-blue-100 font-medium">VIETINBANK CHI NHÁNH NINH BÌNH</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Để thực hiện thao tác <strong className="font-bold uppercase text-amber-900">{actionLabel}</strong>{targetId ? ` (Mã: ${targetId})` : ''}, vui lòng đăng nhập tài khoản được phân quyền.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3.5 flex items-start space-x-2 animate-shake">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập..."
                  required
                  autoFocus
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                />
                <UserCheck className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-600 outline-none"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`w-1/2 py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 ${
                  action === 'DELETE'
                    ? 'bg-red-600 hover:bg-red-700'
                    : action === 'PRINT'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#002060] hover:bg-blue-900'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <span>Đăng nhập & tiếp tục</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
