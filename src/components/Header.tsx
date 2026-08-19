import React, { useEffect, useState } from 'react';
import {
  Wrench,
  ShoppingBag,
  Home,
  LayoutDashboard,
  FileCode,
  Settings,
  Database,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  Lock,
  LogOut,
  KeyRound,
  User,
} from 'lucide-react';
import { ActiveTab, AppSettings } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenGuide?: () => void;
  onOpenLogin?: () => void;
  repairCount: number;
  procurementCount: number;
  isAdminLoggedIn?: boolean;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onOpenSettings,
  onOpenGuide,
  onOpenLogin,
  repairCount,
  procurementCount,
  isAdminLoggedIn = false,
  onOpenChangePassword,
  onLogout,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDate(
        now.toLocaleDateString('vi-VN', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalPending = repairCount + procurementCount;

  return (
    <header className="bg-[#00529C] text-white shadow-xl border-b-4 border-[#ED1C24] sticky top-0 z-40">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="bg-white px-3 py-1.5 rounded-xl shadow-md border border-white/40 flex items-center justify-center shrink-0 transform group-hover:scale-105 transition-all">
              <img
                src="https://raw.githubusercontent.com/giadinhbanker/anh-super-app-bac-phu-tho/main/Logo%20VietinBank.png"
                alt="VietinBank Logo"
                className="h-9 sm:h-11 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase tracking-widest text-amber-200 font-extrabold">
                  NGÂN HÀNG TMCP VIETINBANK - CN NINH BÌNH
                </span>
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-mono font-bold shadow-sm">
                  v2.0
                </span>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white group-hover:text-amber-200 transition-colors uppercase">
                ĐĂNG KÝ SỬA CHỮA VÀ MUA SẮM TÀI SẢN TẠI CN VIETINBANK NINH BÌNH
              </h1>
              <p className="text-xs text-blue-100 hidden sm:block font-medium">
                {settings.bankBranchName || 'NGÂN HÀNG TMCP VIETINBANK - CHI NHÁNH NINH BÌNH'}
              </p>
            </div>
          </div>

          {/* Clock & Sync Status Indicator */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Live Time */}
            <div className="hidden lg:flex flex-col items-end bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-800/60">
              <div className="flex items-center space-x-1 font-mono font-semibold text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                <span>{time}</span>
              </div>
              <div className="flex items-center space-x-1 text-blue-200 text-[11px]">
                <Calendar className="w-3 h-3" />
                <span>{date}</span>
              </div>
            </div>

            {/* Google Sheets Connection Pill */}
            {settings.currentUser?.role === 'ADMIN' ? (
              <button
                onClick={onOpenSettings}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  settings.webAppUrl
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 cursor-pointer'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-300 hover:bg-amber-900 cursor-pointer'
                }`}
                title="Nhấn để cấu hình kết nối Google Sheets (Dành cho Admin)"
              >
                <Database className="w-4 h-4" />
                <div className="text-left">
                  <div className="flex items-center space-x-1">
                    {settings.webAppUrl ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="font-semibold">Google Sheets OK</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span className="font-semibold">Chưa nối Apps Script</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] opacity-80 block truncate max-w-[120px]">
                    {settings.webAppUrl ? 'Sẵn sàng ghi dữ liệu' : 'Lưu dữ liệu local'}
                  </span>
                </div>
              </button>
            ) : (
              <div
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium select-none ${
                  settings.webAppUrl
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                }`}
                title="Trạng thái kết nối dữ liệu Google Sheets"
              >
                <Database className="w-4 h-4" />
                <div className="text-left">
                  <div className="flex items-center space-x-1">
                    {settings.webAppUrl ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="font-semibold">Google Sheets OK</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span className="font-semibold">Chưa nối Apps Script</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] opacity-80 block truncate max-w-[120px]">
                    {settings.webAppUrl ? 'Dữ liệu trực tuyến' : 'Dữ liệu cục bộ'}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Settings & Auth Info */}
            <div className="flex items-center space-x-1.5">

              {settings.currentUser ? (
                <div className="flex items-center space-x-1.5 bg-blue-950/90 p-1 rounded-xl border border-blue-700/80">
                  <div className="px-2 py-1 text-left hidden sm:block">
                    <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center space-x-1">
                      <User className="w-3 h-3 text-amber-400" />
                      <span>
                        {settings.currentUser.fullName || settings.currentUser.username} ({settings.currentUser.role || 'ADMIN'})
                      </span>
                    </div>
                  </div>

                  {onOpenChangePassword && (
                    <button
                      onClick={onOpenChangePassword}
                      className="p-1.5 bg-blue-900/80 hover:bg-blue-800 text-amber-300 rounded-lg border border-blue-700 transition-colors flex items-center space-x-1 text-xs font-semibold"
                      title="Đổi mật khẩu tài khoản"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden md:inline text-[11px]">Đổi MK</span>
                    </button>
                  )}

                  {settings.currentUser.role === 'ADMIN' && (
                    <button
                      onClick={onOpenSettings}
                      className="p-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-500/60 transition-colors"
                      title="Cài đặt hệ thống (Dành cho Admin)"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="p-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg border border-red-500/60 transition-colors flex items-center space-x-1 text-xs font-semibold"
                      title="Đăng xuất tài khoản"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-300" />
                      <span className="hidden md:inline text-[11px]">Thoát</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenLogin || onOpenSettings}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all bg-amber-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-500/30 font-bold text-xs"
                  title="Đăng nhập Cán bộ Quản lý & Xử lý"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Đăng nhập</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-[#001845] border-t border-blue-900/80 shadow-inner">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between overflow-x-auto py-1">
            <div className="flex space-x-1 sm:space-x-2 min-w-max">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'home'
                    ? 'bg-blue-600 text-white shadow-md font-semibold'
                    : 'text-blue-200 hover:bg-blue-900/80 hover:text-white'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Trang chủ</span>
              </button>

              <button
                onClick={() => setActiveTab('repair')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'repair'
                    ? 'bg-red-700 text-white shadow-md font-semibold'
                    : 'text-blue-200 hover:bg-blue-900/80 hover:text-white'
                }`}
              >
                <Wrench className="w-4 h-4 text-amber-300" />
                <span>1. Đăng ký Sửa chữa</span>
              </button>

              <button
                onClick={() => setActiveTab('procurement')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'procurement'
                    ? 'bg-emerald-700 text-white shadow-md font-semibold'
                    : 'text-blue-200 hover:bg-blue-900/80 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-emerald-300" />
                <span>2. Đăng ký Mua sắm</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all relative ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-md font-semibold'
                    : 'text-blue-200 hover:bg-blue-900/80 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-amber-200" />
                <span>Cán bộ Xử lý & Quản lý</span>
                {totalPending > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-white">
                    {totalPending}
                  </span>
                )}
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
