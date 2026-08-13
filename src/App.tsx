import React, { useState, useEffect } from 'react';
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
    if (isAdminLoggedIn) {
      setShowSettingsModal(true);
    } else {
      setShowAdminLoginModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased selection:bg-blue-900 selection:text-white">
      {/* Top Banking Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'guide') {
            setShowGuideModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        settings={settings}
        onOpenSettings={handleOpenSettings}
        repairCount={repairRequests.filter((r) => r.status === 'Đề xuất').length}
        procurementCount={procurementRequests.filter((p) => p.status === 'Đề xuất').length}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenChangePassword={() => setShowChangePasswordModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'home' && (
          <HomeScreen
            setActiveTab={setActiveTab}
            repairRequests={repairRequests}
            procurementRequests={procurementRequests}
            onOpenGuide={() => setShowGuideModal(true)}
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
            onOpenGuide={() => setShowGuideModal(true)}
          />
        )}
      </main>

      {/* System Footer */}
      <footer className="bg-[#001845] text-blue-200 text-xs border-t border-blue-900 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="font-bold text-white text-sm uppercase tracking-wide">
              Ứng dụng đăng ký sửa chữa và mua sắm tại CN Vietinbank Ninh Bình
            </div>
            <div className="text-blue-300 text-[11px] mt-0.5">
              Tự động hóa đăng ký, phân công xử lý & lưu trữ dữ liệu trung tâm Google Sheets
            </div>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-blue-300">
            <button
              onClick={() => setShowGuideModal(true)}
              className="hover:text-amber-300 transition-colors underline"
            >
              Mã Code.gs Apps Script
            </button>
            <span>•</span>
            <button
              onClick={handleOpenSettings}
              className="hover:text-white transition-colors underline flex items-center space-x-1"
            >
              <span>Cài đặt hệ thống</span>
            </button>
          </div>
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
            }
            setShowSettingsModal(true);
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

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleUpdateSettings}
          onResetData={handleResetData}
          onClose={() => setShowSettingsModal(false)}
          onLogoutAdmin={() => setIsAdminLoggedIn(false)}
          showToast={showToastHandler}
        />
      )}

      {showGuideModal && (
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
