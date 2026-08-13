import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wrench,
  ShoppingBag,
  Search,
  Filter,
  RefreshCw,
  Download,
  Printer,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Building,
  User,
  Calendar,
  Sparkles,
  Database,
  ChevronRight,
  ExternalLink,
  Users,
} from 'lucide-react';
import { AppSettings, ProcurementRequest, RepairRequest, RequestStatus } from '../types';
import { DEPARTMENTS, STATUS_OPTIONS, URGENCY_LEVELS } from '../constants/data';
import { OfficerUpdateModal } from './OfficerUpdateModal';
import { PrintTicketModal } from './PrintTicketModal';
import { UserManagementModal } from './UserManagementModal';
import { ActionPermissionLoginModal } from './ActionPermissionLoginModal';
import { fetchAllFromGoogleSheets, updateStatusInGoogleSheets, deleteRecordInGoogleSheets } from '../services/sheetsApi';
import { saveProcurementRequests, saveRepairRequests } from '../services/storage';

interface AdminDashboardProps {
  repairRequests: RepairRequest[];
  setRepairRequests: React.Dispatch<React.SetStateAction<RepairRequest[]>>;
  procurementRequests: ProcurementRequest[];
  setProcurementRequests: React.Dispatch<React.SetStateAction<ProcurementRequest[]>>;
  settings: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenGuide: () => void;
  onRequireLogin?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  repairRequests,
  setRepairRequests,
  procurementRequests,
  setProcurementRequests,
  settings,
  onUpdateSettings,
  showToast,
  onOpenGuide,
  onRequireLogin,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'repair' | 'procurement'>('repair');
  const [showUserModal, setShowUserModal] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState<string>('Tất cả');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('Tất cả');

  // Modals
  const [updatingItem, setUpdatingItem] = useState<{
    type: 'repair' | 'procurement';
    request: RepairRequest | ProcurementRequest;
  } | null>(null);

  const [printingItem, setPrintingItem] = useState<{
    type: 'repair' | 'procurement';
    request: RepairRequest | ProcurementRequest;
  } | null>(null);

  // Sensitive Action Permission Lock Modal State (Kept as fallback)
  const [actionPermissionModal, setActionPermissionModal] = useState<{
    action: 'EDIT' | 'DELETE' | 'PRINT';
    type: 'repair' | 'procurement';
    request: RepairRequest | ProcurementRequest;
  } | null>(null);

  const [syncing, setSyncing] = useState<boolean>(false);

  const currentUser = settings.currentUser;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Trigger Action Permission Check (Single Login Flow V6.3.5)
  const handleTriggerAction = async (
    action: 'EDIT' | 'DELETE' | 'PRINT',
    type: 'repair' | 'procurement',
    request: RepairRequest | ProcurementRequest
  ) => {
    // 1. If user is not logged in
    if (!currentUser || !settings.token) {
      showToast('Vui lòng đăng nhập tài khoản Cán bộ để xem chi tiết, sửa hoặc xóa thông tin!', 'info');
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }

    // 2. User is logged in -> Check specific permissions
    if (action === 'EDIT') {
      if (currentUser.canEdit !== false) {
        setUpdatingItem({ type, request });
      } else {
        showToast('Bạn không được cấp quyền Chỉnh sửa.', 'error');
      }
    } else if (action === 'PRINT') {
      if (currentUser.canPrint !== false) {
        setPrintingItem({ type, request });
      } else {
        showToast('Bạn không được cấp quyền In.', 'error');
      }
    } else if (action === 'DELETE') {
      if (currentUser.canDelete === true || (isAdmin && currentUser.canDelete !== false)) {
        if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ ${request.id} này?`)) {
          if (settings.webAppUrl) {
            const res = await deleteRecordInGoogleSheets(type, request.id, settings);
            if (res.success) {
              if (type === 'repair') {
                const updated = repairRequests.filter((r) => r.id !== request.id);
                setRepairRequests(updated);
                saveRepairRequests(updated);
              } else {
                const updated = procurementRequests.filter((p) => p.id !== request.id);
                setProcurementRequests(updated);
                saveProcurementRequests(updated);
              }
              showToast(`Đã xóa thành công hồ sơ ${request.id} khỏi hệ thống và Google Sheets.`, 'success');
            } else {
              showToast(`Xóa thất bại từ Google Sheets: ${res.message}`, 'error');
            }
          } else {
            // Local fallback
            if (type === 'repair') {
              const updated = repairRequests.filter((r) => r.id !== request.id);
              setRepairRequests(updated);
              saveRepairRequests(updated);
            } else {
              const updated = procurementRequests.filter((p) => p.id !== request.id);
              setProcurementRequests(updated);
              saveProcurementRequests(updated);
            }
            showToast(`Đã xóa hồ sơ ${request.id}`, 'info');
          }
        }
      } else {
        showToast('Bạn không được cấp quyền Xóa.', 'error');
      }
    }
  };

  const handleActionAuthorized = async (authUser: { username: string; fullName: string; permission: string }) => {
    if (!actionPermissionModal) return;

    const { action, type, request } = actionPermissionModal;
    setActionPermissionModal(null); // Close permission modal

    if (action === 'EDIT') {
      setUpdatingItem({ type, request });
    } else if (action === 'PRINT') {
      setPrintingItem({ type, request });
    } else if (action === 'DELETE') {
      if (window.confirm(`XÁC NHẬN XÓA: Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ [${request.id}] không?`)) {
        if (settings.webAppUrl) {
          const res = await deleteRecordInGoogleSheets(type, request.id, settings, authUser.username);
          if (res.success) {
            if (type === 'repair') {
              const updated = repairRequests.filter((r) => r.id !== request.id);
              setRepairRequests(updated);
              saveRepairRequests(updated);
            } else {
              const updated = procurementRequests.filter((p) => p.id !== request.id);
              setProcurementRequests(updated);
              saveProcurementRequests(updated);
            }
            showToast(`Đã xóa thành công hồ sơ ${request.id} khỏi hệ thống và Google Sheets.`, 'success');
          } else {
            showToast(`Không thể xóa từ Google Sheets: ${res.message}`, 'error');
          }
        } else {
          if (type === 'repair') {
            const updated = repairRequests.filter((r) => r.id !== request.id);
            setRepairRequests(updated);
            saveRepairRequests(updated);
          } else {
            const updated = procurementRequests.filter((p) => p.id !== request.id);
            setProcurementRequests(updated);
            saveProcurementRequests(updated);
          }
          showToast(`Đã xóa hồ sơ ${request.id}`, 'info');
        }
      }
    }
  };

  // Filter repair requests
  const filteredRepairs = repairRequests.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'Tất cả' || r.department === selectedDept;
    const matchesStatus = selectedStatus === 'Tất cả' || r.status === selectedStatus;
    const matchesUrgency = selectedUrgency === 'Tất cả' || r.urgency === selectedUrgency;

    return matchesSearch && matchesDept && matchesStatus && matchesUrgency;
  });

  // Filter procurement requests
  const filteredProcurements = procurementRequests.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'Tất cả' || p.department === selectedDept;
    const matchesStatus = selectedStatus === 'Tất cả' || p.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Save Status Update
  const handleSaveStatus = async (
    type: 'repair' | 'procurement',
    id: string,
    status: RequestStatus,
    handler: string,
    completionDate: string,
    note: string
  ) => {
    if (type === 'repair') {
      const updated = repairRequests.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              handler,
              completionDate: status === 'Hoàn thành xử lý' ? completionDate : item.completionDate,
              note,
            }
          : item
      );
      setRepairRequests(updated);
      saveRepairRequests(updated);
    } else {
      const updated = procurementRequests.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              handler,
              completionDate: status === 'Hoàn thành xử lý' ? completionDate : item.completionDate,
              note,
            }
          : item
      );
      setProcurementRequests(updated);
      saveProcurementRequests(updated);
    }

    // Update in Google Sheets if connected
    if (settings.webAppUrl) {
      await updateStatusInGoogleSheets(
        type,
        id,
        status,
        handler,
        completionDate,
        note,
        settings
      );
    }

    showToast(`Đã cập nhật trạng thái đề nghị ${id} thành "${status}"`, 'success');
  };

  // Delete Item
  const handleDelete = (type: 'repair' | 'procurement', id: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ ${id} không?`)) {
      if (type === 'repair') {
        const updated = repairRequests.filter((r) => r.id !== id);
        setRepairRequests(updated);
        saveRepairRequests(updated);
      } else {
        const updated = procurementRequests.filter((p) => p.id !== id);
        setProcurementRequests(updated);
        saveProcurementRequests(updated);
      }
      showToast(`Đã xóa hồ sơ ${id}`, 'info');
    }
  };

  // Helper mappers for Google Sheets data
  const parseRepairItem = (item: any): RepairRequest => ({
    id: String(item['Mã đề nghị'] || item.id || '').trim(),
    fullName: String(item['Họ và tên'] || item.fullName || '').trim(),
    department: String(item['Phòng ban'] || item.department || '').trim(),
    assetName: String(item['Tên tài sản'] || item.assetName || '').trim(),
    condition: String(item['Tình trạng'] || item.condition || '').trim(),
    reportDate: String(item['Ngày báo hỏng'] || item.reportDate || '').trim(),
    proposal: String(item['Đề xuất'] || item.proposal || '').trim(),
    urgency: (item['Mức độ khẩn cấp'] || item.urgency || 'Trung Bình') as any,
    status: (item['Trạng thái'] || item.status || 'Đề xuất') as RequestStatus,
    handler: String(item['Cán bộ xử lý'] || item.handler || '').trim(),
    completionDate: String(item['Ngày hoàn thành'] || item.completionDate || '').trim(),
    note: String(item['Ghi chú'] || item.note || '').trim(),
    createdAt: String(item['Thời gian khởi tạo'] || item.createdAt || new Date().toISOString()).trim(),
  });

  const parseProcurementItem = (item: any): ProcurementRequest => ({
    id: String(item['Mã đề nghị'] || item.id || '').trim(),
    fullName: String(item['Họ và tên'] || item.fullName || '').trim(),
    department: String(item['Phòng ban'] || item.department || '').trim(),
    equipmentName: String(item['Tên thiết bị'] || item.equipmentName || '').trim(),
    quantity: Number(item['Số lượng'] || item.quantity || 1) || 1,
    category: String(item['Chủng loại'] || item.category || '').trim(),
    reason: String(item['Lý do đề xuất'] || item.reason || '').trim(),
    description: String(item['Mô tả yêu cầu'] || item.description || '').trim(),
    requestDate: String(item['Ngày đề nghị'] || item.requestDate || '').trim(),
    proposedDate: String(item['Đề xuất thời gian mua'] || item.proposedDate || '').trim(),
    handler: String(item['Cán bộ xử lý'] || item.handler || '').trim(),
    status: (item['Trạng thái'] || item.status || 'Đề xuất') as RequestStatus,
    completionDate: String(item['Ngày hoàn thành'] || item.completionDate || '').trim(),
    note: String(item['Ghi chú'] || item.note || '').trim(),
    createdAt: String(item['Thời gian khởi tạo'] || item.createdAt || new Date().toISOString()).trim(),
  });

  // Fetch data directly from Google Sheets
  const handleFetchGoogleSheets = async () => {
    if (!settings.webAppUrl) {
      showToast('Chưa cấu hình Google Apps Script Web App URL.', 'error');
      onOpenGuide();
      return;
    }

    setSyncing(true);
    const res = await fetchAllFromGoogleSheets(settings);
    setSyncing(false);

    if (res.success && res.data) {
      const rawSuaChua =
        res.data.suaChua || res.data.repairs || res.data.data?.suaChua || res.data.data?.repairs || [];
      const rawMuaSam =
        res.data.muaSam || res.data.procurements || res.data.data?.muaSam || res.data.data?.procurements || [];
      const rawCauHinh =
        res.data.cauHinh || res.data.data?.cauHinh || [];

      let countRepairs = 0;
      let countProcurements = 0;

      // Đồng bộ Cấu hình & Mật khẩu Admin từ Google Sheets (sheet CauHinh)
      if (Array.isArray(rawCauHinh) && rawCauHinh.length > 0 && onUpdateSettings) {
        const firstConfig = rawCauHinh[0];
        const newBranchName = firstConfig['Tên đơn vị'] || firstConfig['bankBranchName'];
        const newManagerEmail = firstConfig['Email Quản lý'] || firstConfig['managerEmail'];
        const newAdminPassword = firstConfig['Mật khẩu Admin'] || firstConfig['adminPassword'];

        if (newBranchName || newManagerEmail || newAdminPassword) {
          onUpdateSettings({
            ...settings,
            bankBranchName: newBranchName || settings.bankBranchName,
            managerEmail: newManagerEmail || settings.managerEmail,
            adminPassword: newAdminPassword || settings.adminPassword,
          });
        }
      }

      if (Array.isArray(rawSuaChua)) {
        const parsedRepairs = rawSuaChua
          .map(parseRepairItem)
          .filter((r) => r.id && r.fullName);
        if (parsedRepairs.length > 0) {
          setRepairRequests(parsedRepairs);
          saveRepairRequests(parsedRepairs);
          countRepairs = parsedRepairs.length;
        }
      }

      if (Array.isArray(rawMuaSam)) {
        const parsedProcurements = rawMuaSam
          .map(parseProcurementItem)
          .filter((p) => p.id && p.fullName);
        if (parsedProcurements.length > 0) {
          setProcurementRequests(parsedProcurements);
          saveProcurementRequests(parsedProcurements);
          countProcurements = parsedProcurements.length;
        }
      }

      showToast(
        `Đã đồng bộ thành công ${countRepairs} đề nghị sửa chữa và ${countProcurements} đề nghị mua sắm từ Google Sheets vào danh sách!`,
        'success'
      );
    } else {
      showToast(res.message || 'Không thể lấy dữ liệu từ Google Sheets.', 'error');
    }
  };

  // Export CSV Excel
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (activeSubTab === 'repair') {
      headers = [
        'Mã đề nghị',
        'Họ tên',
        'Phòng ban',
        'Tên tài sản',
        'Tình trạng',
        'Ngày báo hỏng',
        'Đề xuất',
        'Khẩn cấp',
        'Trạng thái',
        'Cán bộ xử lý',
        'Ngày hoàn thành',
        'Ghi chú',
      ];
      rows = filteredRepairs.map((r) => [
        r.id,
        r.fullName,
        r.department,
        r.assetName,
        r.condition,
        r.reportDate,
        r.proposal,
        r.urgency,
        r.status,
        r.handler || '',
        r.completionDate || '',
        r.note || '',
      ]);
    } else {
      headers = [
        'Mã đề nghị',
        'Họ tên',
        'Phòng ban',
        'Tên thiết bị',
        'Số lượng',
        'Chủng loại',
        'Lý do',
        'Yêu cầu kỹ thuật',
        'Ngày đề nghị',
        'Thời gian mua',
        'Cán bộ xử lý',
        'Trạng thái',
        'Ngày hoàn thành',
        'Ghi chú',
      ];
      rows = filteredProcurements.map((p) => [
        p.id,
        p.fullName,
        p.department,
        p.equipmentName,
        p.quantity,
        p.category,
        p.reason,
        p.description,
        p.requestDate,
        p.proposedDate,
        p.handler || '',
        p.status,
        p.completionDate || '',
        p.note || '',
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.map((v: any) => `"${v}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DanhSach_${activeSubTab === 'repair' ? 'SuaChua' : 'MuaSam'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Đã xuất file CSV Excel thành công!', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Modals */}
      {updatingItem && (
        <OfficerUpdateModal
          type={updatingItem.type}
          request={updatingItem.request}
          onClose={() => setUpdatingItem(null)}
          onSave={handleSaveStatus}
        />
      )}

      {printingItem && (
        <PrintTicketModal
          type={printingItem.type}
          request={printingItem.request}
          onClose={() => setPrintingItem(null)}
          bankBranchName={settings.bankBranchName}
        />
      )}

      {showUserModal && (
        <UserManagementModal
          settings={settings}
          currentUserRole={settings.currentUser?.role || 'ADMIN'}
          onClose={() => setShowUserModal(false)}
          showToast={showToast}
        />
      )}

      {/* Guest Notice Banner for Unauthenticated Users */}
      {!currentUser && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm border border-amber-200">
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-amber-900 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Bạn đang ở chế độ <strong>Xem & Tra cứu công khai</strong>. Để xem chi tiết, chỉnh sửa, xóa hoặc in phiếu đề nghị, vui lòng đăng nhập tài khoản Cán bộ xử lý / Quản lý.
            </span>
          </div>
          <button
            onClick={onRequireLogin}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-lg shadow transition-all shrink-0 self-end sm:self-auto"
          >
            Đăng nhập ngay
          </button>
        </div>
      )}

      {/* Title & SubTab Switcher */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-800" />
              <span>Dành Cho Cán Bộ Quản Lý & Xử Lý</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
              BẢNG QUẢN LÝ TÀI SẢN - CN NINH BÌNH
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cập nhật trạng thái xử lý, gán cán bộ phân công, in phiếu đề nghị và đồng bộ dữ liệu Google Sheets
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {isAdmin && (
              <button
                onClick={() => setShowUserModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-extrabold rounded-xl shadow transition-all flex items-center space-x-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Quản Lý Tài Khoản (RBAC)</span>
              </button>
            )}

            <button
              onClick={handleFetchGoogleSheets}
              disabled={syncing}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Tải từ Google Sheets</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel CSV</span>
            </button>
          </div>
        </div>

        {/* SubTab Toggle Bar */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSubTab('repair')}
            className={`flex items-center space-x-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${
              activeSubTab === 'repair'
                ? 'border-red-600 text-red-700 bg-red-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Wrench className="w-4 h-4 text-red-600" />
            <span>Sửa chữa Tài sản (Sheet: SuaChua)</span>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
              {repairRequests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('procurement')}
            className={`flex items-center space-x-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${
              activeSubTab === 'procurement'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Mua sắm Tài sản (Sheet: MuaSam)</span>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
              {procurementRequests.length}
            </span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Tìm kiếm từ khóa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Mã ID, tên cán bộ, phòng ban, thiết bị..."
                className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-xs"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Lọc theo Phòng ban
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-xs font-medium text-gray-800"
            >
              <option value="Tất cả">Tất cả phòng ban</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
              Lọc theo Trạng thái
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-xs font-medium text-gray-800"
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency Filter (Only for repair) */}
          {activeSubTab === 'repair' ? (
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Lọc theo Mức độ khẩn
              </label>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-xs font-medium text-gray-800"
              >
                <option value="Tất cả">Tất cả mức độ</option>
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDept('Tất cả');
                  setSelectedStatus('Tất cả');
                }}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        {activeSubTab === 'repair' ? (
          /* Table 1: Repair Requests */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#002060] text-white uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Mã đề nghị</th>
                  <th className="py-3.5 px-4 font-bold">Cán bộ & Phòng ban</th>
                  <th className="py-3.5 px-4 font-bold">Tài sản & Sự cố</th>
                  <th className="py-3.5 px-4 font-bold">Ngày báo / Mức khẩn</th>
                  <th className="py-3.5 px-4 font-bold">Trạng thái</th>
                  <th className="py-3.5 px-4 font-bold">Cán bộ xử lý</th>
                  <th className="py-3.5 px-4 font-bold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-sans">
                {filteredRepairs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      Không tìm thấy phiếu đề nghị sửa chữa phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredRepairs.map((item) => {
                    let statusBadge = 'bg-gray-100 text-gray-800';
                    if (item.status === 'Đề xuất')
                      statusBadge = 'bg-amber-100 text-amber-900 font-bold border border-amber-300';
                    if (item.status === 'Đang xử lý')
                      statusBadge = 'bg-blue-100 text-blue-900 font-bold border border-blue-300';
                    if (item.status === 'Hoàn thành xử lý')
                      statusBadge = 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300';
                    if (item.status === 'Từ chối')
                      statusBadge = 'bg-red-100 text-red-900 font-bold border border-red-300';

                    let urgencyBadge = 'text-gray-600 bg-gray-100';
                    if (item.urgency === 'Cao' || item.urgency === 'Rất Cao')
                      urgencyBadge = 'text-red-700 bg-red-50 font-bold border border-red-200';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-red-700 text-sm whitespace-nowrap">
                          {item.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{item.fullName}</div>
                          <div className="text-[11px] text-gray-500">{item.department}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-bold text-blue-900">{item.assetName}</div>
                          <div className="text-[11px] text-gray-600 line-clamp-2 italic">
                            "{item.condition}"
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-gray-700">{item.reportDate}</div>
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded mt-0.5 ${urgencyBadge}`}>
                            {item.urgency}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs ${statusBadge}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">
                            {item.handler || <span className="text-gray-400 italic">Chưa gán</span>}
                          </div>
                          {item.completionDate && (
                            <div className="text-[10px] text-emerald-700">Xong: {item.completionDate}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleTriggerAction('EDIT', 'repair', item)}
                              className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Cập nhật trạng thái (Yêu cầu đăng nhập xác thực quyền)"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleTriggerAction('PRINT', 'repair', item)}
                              className="p-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
                              title="In phiếu đề nghị (Yêu cầu đăng nhập xác thực quyền)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleTriggerAction('DELETE', 'repair', item)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Xóa đề nghị (Yêu cầu đăng nhập xác thực quyền)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Table 2: Procurement Requests */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#002060] text-white uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Mã đề nghị</th>
                  <th className="py-3.5 px-4 font-bold">Cán bộ & Phòng ban</th>
                  <th className="py-3.5 px-4 font-bold">Thiết bị & Số lượng</th>
                  <th className="py-3.5 px-4 font-bold">Lý do & Chủng loại</th>
                  <th className="py-3.5 px-4 font-bold">Trạng thái</th>
                  <th className="py-3.5 px-4 font-bold">Cán bộ xử lý</th>
                  <th className="py-3.5 px-4 font-bold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-sans">
                {filteredProcurements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      Không tìm thấy phiếu đề nghị mua sắm phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredProcurements.map((item) => {
                    let statusBadge = 'bg-gray-100 text-gray-800';
                    if (item.status === 'Đề xuất')
                      statusBadge = 'bg-amber-100 text-amber-900 font-bold border border-amber-300';
                    if (item.status === 'Đang xử lý')
                      statusBadge = 'bg-blue-100 text-blue-900 font-bold border border-blue-300';
                    if (item.status === 'Hoàn thành xử lý')
                      statusBadge = 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300';
                    if (item.status === 'Từ chối')
                      statusBadge = 'bg-red-100 text-red-900 font-bold border border-red-300';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm whitespace-nowrap">
                          {item.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900">{item.fullName}</div>
                          <div className="text-[11px] text-gray-500">{item.department}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-emerald-900">{item.equipmentName}</div>
                          <div className="text-[11px] font-semibold text-emerald-700">
                            Số lượng: {item.quantity} bộ/cái
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-gray-800">{item.category}</div>
                          <div className="text-[11px] text-gray-500 line-clamp-1 italic">
                            Lý do: {item.reason}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs ${statusBadge}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">
                            {item.handler || <span className="text-gray-400 italic">Chưa gán</span>}
                          </div>
                          {item.completionDate && (
                            <div className="text-[10px] text-emerald-700">Xong: {item.completionDate}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleTriggerAction('EDIT', 'procurement', item)}
                              className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Cập nhật trạng thái (Yêu cầu đăng nhập xác thực quyền)"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleTriggerAction('PRINT', 'procurement', item)}
                              className="p-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
                              title="In phiếu đề nghị (Yêu cầu đăng nhập xác thực quyền)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleTriggerAction('DELETE', 'procurement', item)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Xóa đề nghị (Yêu cầu đăng nhập xác thực quyền)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACTION PERMISSION LOGIN MODAL */}
      {actionPermissionModal && (
        <ActionPermissionLoginModal
          action={actionPermissionModal.action}
          targetId={actionPermissionModal.request.id}
          settings={settings}
          onAuthorized={handleActionAuthorized}
          onClose={() => setActionPermissionModal(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
