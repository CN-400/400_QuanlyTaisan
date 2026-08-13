import React from 'react';
import {
  Wrench,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  LayoutDashboard,
  Building2,
  Sparkles,
} from 'lucide-react';
import { ActiveTab, ProcurementRequest, RepairRequest } from '../types';

interface HomeScreenProps {
  setActiveTab: (tab: ActiveTab) => void;
  repairRequests: RepairRequest[];
  procurementRequests: ProcurementRequest[];
  onOpenGuide: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  setActiveTab,
  repairRequests,
  procurementRequests,
  onOpenGuide,
}) => {
  // Compute stats
  const totalRepair = repairRequests.length;
  const totalProcurement = procurementRequests.length;

  const pendingRepair = repairRequests.filter((r) => r.status === 'Đề xuất').length;
  const pendingProcurement = procurementRequests.filter((p) => p.status === 'Đề xuất').length;

  const inProgressRepair = repairRequests.filter((r) => r.status === 'Đang xử lý').length;
  const inProgressProcurement = procurementRequests.filter((p) => p.status === 'Đang xử lý').length;

  const completedRepair = repairRequests.filter((r) => r.status === 'Hoàn thành xử lý').length;
  const completedProcurement = procurementRequests.filter((p) => p.status === 'Hoàn thành xử lý').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#002060] via-[#003366] to-[#001845] text-white p-6 sm:p-8 shadow-xl border border-blue-800">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
          <Building2 className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Sử dụng nội bộ tại Vietinbank Ninh Bình</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight uppercase">
            ĐĂNG KÝ SỬA CHỮA VÀ MUA SẮM TÀI SẢN TẠI CN VIETINBANK NINH BÌNH
          </h1>

          <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
            Hệ thống hỗ trợ cán bộ nhân viên đăng ký{' '}
            <strong className="text-amber-300 font-semibold">sửa chữa, bảo trì</strong> tài sản hỏng hóc và{' '}
            <strong className="text-emerald-300 font-semibold">đề xuất mua sắm</strong> trang thiết bị mới. Tự động lưu trữ dữ liệu tập trung trên Google Sheets qua Google Apps Script API.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setActiveTab('repair')}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-lg hover:shadow-red-900/50 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <Wrench className="w-5 h-5 text-amber-300" />
              <span>1. Đăng ký Sửa chữa ngay</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => setActiveTab('procurement')}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-900/50 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-5 h-5 text-emerald-200" />
              <span>2. Đăng ký Mua sắm ngay</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Feature Cards Section (Two Primary Requirements) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Sửa chữa Tài sản */}
        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-red-100 hover:border-red-300 hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110"></div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">
                <Wrench className="w-7 h-7 text-amber-200" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 px-3 py-1 rounded-full border border-red-200">
                Chức năng 1
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-red-700 transition-colors">
                Đăng ký Sửa chữa Tài sản
              </h2>
              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                Báo hỏng máy đếm tiền, máy in laser, điều hòa, két sắt, bàn ghế, thiết bị mạng... Tự động sinh mã đề nghị <strong>SC-YYYY-XXXX</strong> và theo dõi tiến độ xử lý.
              </p>
            </div>

            {/* Quick Points */}
            <ul className="space-y-2 text-xs text-gray-700 pt-1">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Mức độ khẩn cấp: Thấp / Trung Bình / Cao / Rất Cao</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Tự động gán ngày báo hỏng hiện tại</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Theo dõi trạng thái: Đề xuất → Đang xử lý → Hoàn thành</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 relative z-10 border-t border-gray-100 mt-6 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Tổng số đề nghị: <span className="font-bold text-red-700 text-sm">{totalRepair}</span>
            </div>
            <button
              onClick={() => setActiveTab('repair')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl shadow transition-all flex items-center space-x-1.5"
            >
              <span>Vào Form Sửa chữa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: Mua sắm Tài sản */}
        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110"></div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-7 h-7 text-emerald-100" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                Chức năng 2
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Đăng ký Mua sắm Tài sản
              </h2>
              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                Đề xuất trang bị mới các thiết bị chuyên dùng ngân hàng (Máy bó tiền, máy đếm tiền, POS, camera, két sắt, bàn ghế...) theo mã <strong>MS-YYYY-XXXX</strong>.
              </p>
            </div>

            {/* Quick Points */}
            <ul className="space-y-2 text-xs text-gray-700 pt-1">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>34 loại danh mục thiết bị chuẩn ngân hàng</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Lựa chọn phòng ban & nhập số lượng, chủng loại chi tiết</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Xác định lý do & thời gian mua sắm đề xuất</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 relative z-10 border-t border-gray-100 mt-6 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Tổng số đề nghị: <span className="font-bold text-emerald-700 text-sm">{totalProcurement}</span>
            </div>
            <button
              onClick={() => setActiveTab('procurement')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow transition-all flex items-center space-x-1.5"
            >
              <span>Vào Form Mua sắm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Dashboard Statistics Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <LayoutDashboard className="w-5 h-5 text-blue-900" />
              <span>Thống kê & Quản lý Xử lý</span>
            </h3>
            <p className="text-xs text-gray-500">
              Tổng hợp tình trạng xử lý phiếu đề nghị sửa chữa và mua sắm toàn nhánh
            </p>
          </div>

          <button
            onClick={() => setActiveTab('admin')}
            className="px-4 py-2 bg-[#002060] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition-all"
          >
            <span>Mở Bảng Cán bộ Xử lý</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Stat 1: Pending */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center">
            <div className="flex items-center justify-center space-x-1 text-amber-700 text-xs font-semibold mb-1">
              <AlertCircle className="w-4 h-4" />
              <span>Chờ xử lý (Đề xuất)</span>
            </div>
            <div className="text-2xl font-black text-amber-900">
              {pendingRepair + pendingProcurement}
            </div>
            <div className="text-[11px] text-amber-600 mt-1">
              Sửa chữa: {pendingRepair} | Mua sắm: {pendingProcurement}
            </div>
          </div>

          {/* Stat 2: In Progress */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
            <div className="flex items-center justify-center space-x-1 text-blue-700 text-xs font-semibold mb-1">
              <Clock className="w-4 h-4" />
              <span>Đang xử lý</span>
            </div>
            <div className="text-2xl font-black text-blue-900">
              {inProgressRepair + inProgressProcurement}
            </div>
            <div className="text-[11px] text-blue-600 mt-1">
              Sửa chữa: {inProgressRepair} | Mua sắm: {inProgressProcurement}
            </div>
          </div>

          {/* Stat 3: Completed */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
            <div className="flex items-center justify-center space-x-1 text-emerald-700 text-xs font-semibold mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>Hoàn thành xử lý</span>
            </div>
            <div className="text-2xl font-black text-emerald-900">
              {completedRepair + completedProcurement}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Sửa chữa: {completedRepair} | Mua sắm: {completedProcurement}
            </div>
          </div>

          {/* Stat 4: Total */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 text-center">
            <div className="flex items-center justify-center space-x-1 text-purple-700 text-xs font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Tổng số hồ sơ</span>
            </div>
            <div className="text-2xl font-black text-purple-900">
              {totalRepair + totalProcurement}
            </div>
            <div className="text-[11px] text-purple-600 mt-1">
              Sửa chữa: {totalRepair} | Mua sắm: {totalProcurement}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
