import React, { useState, useEffect } from 'react';
import { FileCode, Settings } from 'lucide-react';
import { ActiveTab, AppSettings, ProcurementRequest, RepairRequest } from './types';
import {
  checkAndApplyUrlConfig,
  getAppSettings,
  getProcurementRequests,
  getRepairRequests,
  saveAppSettings,
  saveProcurementRequests,
  saveRepairRequests,
  syncSettingsFromGoogleSheets,
} from './services/storage';
import { fetchAllFromGoogleSheets, parseProcurementRows, parseRepairRows, validateSessionApi } from './services/sheetsApi';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { RepairForm } from './components/RepairForm';
import { ProcurementForm } from './components/ProcurementForm';
import { AdminDashboard } from './components/AdminDashboard';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { Toast } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [settings, setSettings] = useState<AppSettings>(getAppSettings);

  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>(getRepairRequests);
  const [procurementRequests, setProcurementRequests] = useState<ProcurementRequest[]>(getProcurementRequests);

  // Authentication & Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Check URL parameters for pre-configured URL (e.g., ?webAppUrl=...)
        const urlConfig = checkAndApplyUrlConfig();

        // 2. Sync business configuration from Google Sheets (sheet CauHinh) - CENTRAL SOURCE OF TRUTH
        const syncedSettings = await syncSettingsFromGoogleSheets(urlConfig);

        // 3. Validate existing session token if present
        if (syncedSettings.webAppUrl && syncedSettings.token) {
          const valRes = await validateSessionApi(syncedSettings.webAppUrl, syncedSettings.token);
          if (valRes.success && valRes.data?.user) {
            setIsAdminLoggedIn(true);
            syncedSettings.currentUser = valRes.data.user;
          } else {
            // Token expired or invalidated
            setIsAdminLoggedIn(false);
            delete syncedSettings.token;
            delete syncedSettings.currentUser;
          }
        }

        setSettings(syncedSettings);
        saveAppSettings(syncedSettings);

        // 4. Fetch all requests from Google Sheets
        if (syncedSettings.webAppUrl) {
          const res = await fetchAllFromGoogleSheets(syncedSettings);
          if (res.success && res.data) {
            if (Array.isArray(res.data.suaChua) && res.data.suaChua.length > 0) {
              const parsedRepairs = parseRepairRows(res.data.suaChua);
              setRepairRequests(parsedRepairs);
              saveRepairRequests(parsedRepairs);
            }
            if (Array.isArray(res.data.muaSam) && res.data.muaSam.length > 0) {
              const parsedProcurements = parseProcurementRows(res.data.muaSam);
              setProcurementRequests(parsedProcurements);
              saveProcurementRequests(parsedProcurements);
            }
          } else if (!res.success) {
            console.warn('Google Sheets fetch failed:', res.message);
          }
        }
      } catch (err) {
        console.warn('Initialization offline or network error:', err);
      }
    };

    initApp();
  }, []);

  const showToastHandler = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    const saved = await saveAppSettings(newSettings);
    setSettings(saved);
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    const updated = { ...settings };
    delete updated.token;
    delete updated.currentUser;
    saveAppSettings(updated);
    setSettings(updated);
    showToastHandler('Đã đăng xuất tài khoản thành công', 'info');
  };

  const handleResetData = () => {
    setRepairRequests(getRepairRequests());
    setProcurementRequests(getProcurementRequests());
  };

  const handleOpenSettings = () => {
    if (settings.currentUser && settings.currentUser.role === 'ADMIN') {
      setShowSettingsModal(true);
    } else {
      showToastHandler('Chức năng Cài đặt hệ thống chỉ dành riêng cho Quản trị viên (ADMIN)!', 'error');
    }
  };

  const handleOpenGuide = () => {
    if (settings.currentUser && settings.currentUser.role === 'ADMIN') {
      setShowGuideModal(true);
    } else {
      showToastHandler('Tài liệu Hướng dẫn Apps Script & Mã Code.gs chỉ dành riêng cho Quản trị viên (ADMIN)!', 'error');
    }
  };

  const handleSelectTab = (tab: ActiveTab) => {
    if (tab === 'guide') {
      handleOpenGuide();
      return;
    }

    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased selection:bg-blue-900 selection:text-white">
      {/* Top Banking Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        settings={settings}
        onOpenSettings={handleOpenSettings}
        onOpenGuide={handleOpenGuide}
        onOpenLogin={() => setShowAdminLoginModal(true)}
        repairCount={repairRequests.filter((r) => r.status === 'Đề xuất').length}
        procurementCount={procurementRequests.filter((p) => p.status === 'Đề xuất').length}
        isAdminLoggedIn={Boolean(settings.token && settings.currentUser)}
        onOpenChangePassword={() => setShowChangePasswordModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'home' && (
          <HomeScreen
            setActiveTab={handleSelectTab}
            repairRequests={repairRequests}
            procurementRequests={procurementRequests}
            onOpenGuide={handleOpenGuide}
          />
        )}

        {activeTab === 'repair' && (
          <RepairForm
            repairRequests={repairRequests}
            setRepairRequests={setRepairRequests}
            settings={settings}
            onBack={() => setActiveTab('home')}
            showToast={showToastHandler}
          />
        )}

        {activeTab === 'procurement' && (
          <ProcurementForm
            procurementRequests={procurementRequests}
            setProcurementRequests={setProcurementRequests}
            settings={settings}
            onBack={() => setActiveTab('home')}
            showToast={showToastHandler}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            repairRequests={repairRequests}
            setRepairRequests={setRepairRequests}
            procurementRequests={procurementRequests}
            setProcurementRequests={setProcurementRequests}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            showToast={showToastHandler}
            onOpenGuide={handleOpenGuide}
            onRequireLogin={() => setShowAdminLoginModal(true)}
          />
        )}
      </main>

      {/* System Footer */}
      <footer className="bg-[#00529C] text-blue-100 text-xs border-t-4 border-[#ED1C24] py-6 mt-12 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-xl shadow-md border border-white/40 shrink-0">
              <img
                src="https://raw.githubusercontent.com/giadinhbanker/anh-super-app-bac-phu-tho/main/Logo%20VietinBank.png"
                alt="VietinBank"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <div className="font-extrabold text-white text-sm uppercase tracking-wide">
                HỆ THỐNG ĐĂNG KÝ SỬA CHỮA VÀ MUA SẮM TÀI SẢN - VIETINBANK
              </div>
              <div className="text-blue-100 text-[11px] mt-0.5 font-medium">
                Ngân hàng TMCP Công Thương Việt Nam - Chi nhánh Ninh Bình
              </div>
            </div>
          </div>

          {/* Admin-only quick management buttons */}
          {settings.currentUser?.role === 'ADMIN' && (
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 text-xs">
              <button
                onClick={handleOpenGuide}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/50 transition-all font-semibold cursor-pointer"
                title="Mở tài liệu hướng dẫn và lấy mã Code.gs Apps Script (Chỉ dành cho Admin)"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Hướng dẫn Apps Script & Mã Code.gs</span>
              </button>

              <button
                onClick={handleOpenSettings}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 rounded-lg border border-blue-700/60 transition-all font-semibold cursor-pointer"
                title="Cài đặt hệ thống (Chỉ dành cho Admin)"
              >
                <Settings className="w-3.5 h-3.5 text-blue-300" />
                <span>Cài đặt hệ thống</span>
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* Modals & Toast */}
      {showAdminLoginModal && (
        <AdminLoginModal
          currentPassword={settings.adminPassword}
          settings={settings}
          onSuccess={(sessionData) => {
            setIsAdminLoggedIn(true);
            setShowAdminLoginModal(false);
            if (sessionData) {
              const updated = {
                ...settings,
                token: sessionData.token,
                currentUser: sessionData.user,
              };
              saveAppSettings(updated);
              setSettings(updated);

              if (sessionData.user?.role === 'ADMIN') {
                setActiveTab('admin');
              } else {
                setActiveTab('admin');
              }
            }
          }}
          onClose={() => setShowAdminLoginModal(false)}
          showToast={showToastHandler}
        />
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal
          settings={settings}
          username={settings.currentUser?.username || 'admin'}
          token={settings.token}
          isMandatory={false}
          onSuccess={() => setShowChangePasswordModal(false)}
          onClose={() => setShowChangePasswordModal(false)}
          showToast={showToastHandler}
        />
      )}

      {showSettingsModal && settings.currentUser?.role === 'ADMIN' && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleUpdateSettings}
          onResetData={handleResetData}
          onClose={() => setShowSettingsModal(false)}
          onLogoutAdmin={() => setIsAdminLoggedIn(false)}
          showToast={showToastHandler}
        />
      )}

      {showGuideModal && settings.currentUser?.role === 'ADMIN' && (
        <GoogleSheetsModal
          settings={settings}
          onSaveSettings={handleUpdateSettings}
          onClose={() => setShowGuideModal(false)}
          showToast={showToastHandler}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
