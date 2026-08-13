import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, X, RefreshCw, Key, Trash2, CheckCircle2, AlertCircle, FileText, Loader2, Copy, Check } from 'lucide-react';
import { AppSettings, UserAccount, UserRole, SystemLogEntry } from '../types';
import { fetchUsersFromGoogleSheets, createUserInGoogleSheets, updateUserInGoogleSheets, deleteUserInGoogleSheets, fetchLogsFromGoogleSheets, resetPasswordInGoogleSheets } from '../services/sheetsApi';

interface UserManagementModalProps {
  settings: AppSettings;
  currentUserRole?: UserRole;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  settings,
  currentUserRole = 'ADMIN',
  onClose,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Form state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('PROCESSOR');
  const [active, setActive] = useState(true);
  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [canDelete, setCanDelete] = useState<boolean>(true);
  const [canPrint, setCanPrint] = useState<boolean>(true);

  // Temp password modal after reset
  const [resetModalData, setResetModalData] = useState<{
    username: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const token = settings.token || 'ST-LOCAL-ADMIN';

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetchUsersFromGoogleSheets(settings, token);
    setLoading(false);
    if (res.success && Array.isArray(res.data)) {
      setUsers(res.data);
    } else {
      showToast(res.message || 'Không thể tải danh sách tài khoản', 'error');
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    const res = await fetchLogsFromGoogleSheets(settings, token);
    setLoading(false);
    if (res.success && Array.isArray(res.data)) {
      setLogs(res.data);
    } else {
      showToast(res.message || 'Không thể tải nhật ký hệ thống', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadLogs();
    }
  }, [activeTab]);

  const handleOpenCreate = () => {
    setEditingUsername(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('PROCESSOR');
    setActive(true);
    setCanEdit(true);
    setCanDelete(true);
    setCanPrint(true);
    setShowForm(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUsername(u.username);
    setUsername(u.username);
    setPassword(''); // leave blank if unchanged
    setFullName(u.fullName || '');
    setRole(u.role || 'PROCESSOR');
    setActive(u.active !== false);
    setCanEdit(u.canEdit !== false);
    setCanDelete(u.canDelete !== false);
    setCanPrint(u.canPrint !== false);
    setShowForm(true);
  };

  const handleResetPassword = async (u: UserAccount) => {
    if (!window.confirm(`Bạn có chắc chắn muốn RESET MẬT KHẨU cho tài khoản "${u.username}" không?\nMột mật khẩu tạm thời ngẫu nhiên sẽ được tạo và các phiên đăng nhập hiện tại của người dùng này sẽ bị hủy.`)) {
      return;
    }

    setLoading(true);
    const res = await resetPasswordInGoogleSheets(u.username, settings, token);
    setLoading(false);

    if (res.success && res.data?.temporaryPassword) {
      showToast('Reset mật khẩu thành công!', 'success');
      setResetModalData({
        username: u.username,
        tempPassword: res.data.temporaryPassword,
      });
      loadUsers();
    } else {
      showToast(res.message || 'Reset mật khẩu thất bại', 'error');
    }
  };

  const handleCopyTempPassword = () => {
    if (resetModalData?.tempPassword) {
      navigator.clipboard.writeText(resetModalData.tempPassword);
      setCopied(true);
      showToast('Đã chép mật khẩu tạm thời vào khay nhớ tạm!', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) {
      showToast('Vui lòng điền đầy đủ tên đăng nhập và họ tên!', 'error');
      return;
    }

    setLoading(true);
    if (editingUsername) {
      // Update
      const res = await updateUserInGoogleSheets(
        {
          username: username.trim(),
          password: password ? password.trim() : undefined,
          fullName: fullName.trim(),
          role,
          active,
          canEdit,
          canDelete,
          canPrint,
        },
        settings,
        token
      );
      setLoading(false);
      if (res.success) {
        showToast(res.message, 'success');
        setShowForm(false);
        loadUsers();
      } else {
        showToast(res.message, 'error');
      }
    } else {
      // Create
      if (!password.trim()) {
        showToast('Vui lòng nhập mật khẩu cho tài khoản mới!', 'error');
        setLoading(false);
        return;
      }
      const res = await createUserInGoogleSheets(
        {
          username: username.trim(),
          password: password.trim(),
          fullName: fullName.trim(),
          role,
          active,
          canEdit,
          canDelete,
          canPrint,
        },
        settings,
        token
      );
      setLoading(false);
      if (res.success) {
        showToast(res.message, 'success');
        setShowForm(false);
        loadUsers();
      } else {
        showToast(res.message, 'error');
      }
    }
  };

  const handleDeleteUser = async (u: UserAccount) => {
    if (u.username.toLowerCase() === 'admin') {
      showToast('Không thể xóa tài khoản Admin gốc!', 'error');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.username}" không?`)) {
      setLoading(true);
      const res = await deleteUserInGoogleSheets(u.username, settings, token);
      setLoading(false);
      if (res.success) {
        showToast(res.message, 'success');
        loadUsers();
      } else {
        showToast(res.message, 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="bg-[#002060] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-400/30">
              <Users className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold uppercase tracking-wide">
                Quản Lý Tài Khoản & Phân Quyền V6.3
              </h3>
              <p className="text-xs text-blue-200">
                Thêm mới, phân quyền Cán bộ Xử lý & Quản lý, xem Nhật ký hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher bar */}
        <div className="bg-gray-100 p-2 flex items-center justify-between border-b border-gray-200 shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveTab('users');
                setShowForm(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'users'
                  ? 'bg-white text-blue-900 shadow border border-gray-200'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Danh Sách Tài Khoản ({users.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('logs');
                setShowForm(false);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'logs'
                  ? 'bg-white text-blue-900 shadow border border-gray-200'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Nhật Ký Hệ Thống (Sheet: SystemLog)</span>
            </button>
          </div>

          {activeTab === 'users' && currentUserRole === 'ADMIN' && (
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs shadow transition-all flex items-center space-x-1"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tạo Tài Khoản Mới</span>
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TEMP PASSWORD POPUP MODAL */}
          {resetModalData && (
            <div className="bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-400 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-900 font-extrabold text-sm uppercase">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>RESET MẬT KHẨU THÀNH CÔNG!</span>
                </div>
                <button
                  onClick={() => setResetModalData(null)}
                  className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-emerald-900 space-y-2">
                <p>Tài khoản: <b className="font-mono text-sm text-blue-900">{resetModalData.username}</b></p>
                <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-500 block">Mật khẩu tạm thời:</span>
                    <span className="font-mono text-base font-extrabold text-emerald-700 select-all tracking-wider">
                      {resetModalData.tempPassword}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyTempPassword}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép MK'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-emerald-800 italic">
                  * Vui lòng bàn giao mật khẩu tạm thời này cho người dùng. Người dùng sẽ bắt buộc phải đổi mật khẩu ngay trong lần đăng nhập tiếp theo.
                </p>
              </div>
            </div>
          )}

          {/* USER FORM MODAL SUB-VIEW */}
          {showForm ? (
            <form onSubmit={handleSubmitForm} className="bg-slate-50 p-5 rounded-2xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-gray-200">
                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                  {editingUsername ? `Chỉnh sửa tài khoản: ${editingUsername}` : 'Thêm tài khoản mới'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                >
                  Đóng Form
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Tên đăng nhập (Username) *
                  </label>
                  <input
                    type="text"
                    disabled={!!editingUsername}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ví dụ: nvhieu, nguyenvana..."
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none font-semibold text-gray-900 disabled:bg-gray-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Mật khẩu {editingUsername ? '(Bỏ trống nếu không đổi)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUsername ? 'Để trống nếu giữ nguyên...' : 'Nhập mật khẩu...'}
                    required={!editingUsername}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ví dụ: Nguyễn Văn A..."
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Vai trò (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none font-bold text-gray-900"
                  >
                    <option value="PROCESSOR">PROCESSOR (Cán bộ Xử lý trực tiếp)</option>
                    <option value="MANAGER">MANAGER (Lãnh đạo Phòng / Chi nhánh)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên Hệ thống)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="userActive"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <label htmlFor="userActive" className="font-bold text-gray-800">
                    Trạng thái hoạt động (Active)
                  </label>
                </div>
              </div>

              {/* SECTION: Quyền Thao tác Nhạy cảm */}
              <div className="pt-3 border-t border-gray-200">
                <label className="block font-bold text-blue-900 mb-2 uppercase text-[11px] tracking-wider">
                  Quyền thao tác nhạy cảm (Cán bộ Xử lý & Quản lý)
                </label>
                <div className="grid grid-cols-3 gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canEdit}
                      onChange={(e) => setCanEdit(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="font-bold text-gray-800">Cho phép CHỈNH SỬA</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canDelete}
                      onChange={(e) => setCanDelete(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded border-gray-300"
                    />
                    <span className="font-bold text-red-800">Cho phép XÓA</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canPrint}
                      onChange={(e) => setCanPrint(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300"
                    />
                    <span className="font-bold text-amber-900">Cho phép IN PHIẾU</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#002060] hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow flex items-center space-x-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  <span>Lưu Tài Khoản</span>
                </button>
              </div>
            </form>
          ) : null}

          {/* TAB 1: USERS LIST */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Danh sách tài khoản trong sheet <b>Users</b>:</span>
                <button
                  onClick={loadUsers}
                  disabled={loading}
                  className="text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#002060] text-white uppercase text-[11px]">
                      <th className="py-3 px-4 font-bold">Username</th>
                      <th className="py-3 px-4 font-bold">Họ và Tên</th>
                      <th className="py-3 px-4 font-bold">Vai trò (Role)</th>
                      <th className="py-3 px-4 font-bold">Quyền Nhạy Cảm</th>
                      <th className="py-3 px-4 font-bold">Trạng thái</th>
                      <th className="py-3 px-4 font-bold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          {loading ? 'Đang tải danh sách tài khoản...' : 'Chưa có tài khoản nào được tạo.'}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        let roleBadge = 'bg-gray-100 text-gray-800';
                        if (u.role === 'ADMIN') roleBadge = 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold';
                        if (u.role === 'MANAGER') roleBadge = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
                        if (u.role === 'PROCESSOR') roleBadge = 'bg-blue-100 text-blue-900 border border-blue-300 font-semibold';

                        return (
                          <tr key={u.username} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-blue-900">{u.username}</td>
                            <td className="py-3 px-4 font-medium text-gray-900">{u.fullName}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] ${roleBadge}`}>
                                {u.role || 'PROCESSOR'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1 text-[10px]">
                                <span className={`px-1.5 py-0.5 rounded font-bold ${u.canEdit !== false ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400 line-through'}`}>Sửa</span>
                                <span className={`px-1.5 py-0.5 rounded font-bold ${u.canDelete !== false ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-400 line-through'}`}>Xóa</span>
                                <span className={`px-1.5 py-0.5 rounded font-bold ${u.canPrint !== false ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-400 line-through'}`}>In</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {u.active !== false ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Hoạt động</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                  <span>Khóa</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold transition-colors"
                                >
                                  Sửa / Mật khẩu
                                </button>
                                {u.username.toLowerCase() !== 'admin' && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Xóa tài khoản"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Nhật ký thao tác hệ thống trong sheet <b>SystemLog</b>:</span>
                <button
                  onClick={loadLogs}
                  disabled={loading}
                  className="text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Tải lại log</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white uppercase text-[11px]">
                      <th className="py-3 px-4 font-bold">Thời gian</th>
                      <th className="py-3 px-4 font-bold">Tài khoản</th>
                      <th className="py-3 px-4 font-bold">Hành động (Action)</th>
                      <th className="py-3 px-4 font-bold">Chi tiết thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500 font-sans">
                          {loading ? 'Đang tải nhật ký...' : 'Chưa có nhật ký nào được ghi lại.'}
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">{log.timestamp}</td>
                          <td className="py-2.5 px-4 font-bold text-blue-900 whitespace-nowrap">{log.username}</td>
                          <td className="py-2.5 px-4 font-semibold text-purple-800 whitespace-nowrap">{log.action}</td>
                          <td className="py-2.5 px-4 text-gray-800">{log.details}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
