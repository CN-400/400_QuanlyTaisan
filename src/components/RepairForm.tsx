import React, { useState, useEffect } from 'react';
import {
  Wrench,
  User,
  Building,
  AlertTriangle,
  Calendar,
  FileText,
  Send,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { DEPARTMENTS, URGENCY_LEVELS } from '../constants/data';
import { AppSettings, RepairRequest, UrgencyLevel } from '../types';
import { generateNextRepairId, saveRepairRequests } from '../services/storage';
import { syncRepairToGoogleSheets } from '../services/sheetsApi';

interface RepairFormProps {
  repairRequests: RepairRequest[];
  setRepairRequests: React.Dispatch<React.SetStateAction<RepairRequest[]>>;
  settings: AppSettings;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RepairForm: React.FC<RepairFormProps> = ({
  repairRequests,
  setRepairRequests,
  settings,
  onBack,
  showToast,
}) => {
  // Today date formatted YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [nextId, setNextId] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[1]); // Default Phòng DVKH
  const [assetName, setAssetName] = useState<string>('');
  const [condition, setCondition] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [proposal, setProposal] = useState<string>('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Trung Bình');
  const [note, setNote] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [successRequest, setSuccessRequest] = useState<RepairRequest | null>(null);

  useEffect(() => {
    setNextId(generateNextRepairId(repairRequests));
  }, [repairRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Vui lòng nhập Họ và tên cán bộ đề nghị.', 'error');
      return;
    }
    if (!assetName.trim()) {
      showToast('Vui lòng nhập Tên tài sản hỏng hóc.', 'error');
      return;
    }
    if (!condition.trim()) {
      showToast('Vui lòng mô tả Tình trạng sự cố tài sản.', 'error');
      return;
    }
    if (!proposal.trim()) {
      showToast('Vui lòng nhập Đề xuất phương án sửa chữa.', 'error');
      return;
    }

    setLoading(true);

    const newRequest: RepairRequest = {
      id: nextId,
      fullName: fullName.trim(),
      department,
      assetName: assetName.trim(),
      condition: condition.trim(),
      reportDate: reportDate || todayStr,
      proposal: proposal.trim(),
      urgency,
      status: 'Đề xuất',
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!settings.webAppUrl) {
      setLoading(false);
      showToast('Chưa cấu hình Google Apps Script Web App URL. Vui lòng vào Cài Đặt để cập nhật trước khi gửi!', 'error');
      return;
    }

    // Call Google Apps Script backend directly
    const syncResult = await syncRepairToGoogleSheets(newRequest, settings);

    if (syncResult.success) {
      const serverAssignedId = syncResult.data?.id || newRequest.id;
      const finalRequest: RepairRequest = {
        ...newRequest,
        id: serverAssignedId,
      };

      const updatedList = [finalRequest, ...repairRequests];
      setRepairRequests(updatedList);
      saveRepairRequests(updatedList);

      setLoading(false);
      setSuccessRequest(finalRequest);
      showToast(`Đã ghi nhận phiếu sửa chữa ${finalRequest.id} thành công lên Google Sheets!`, 'success');
    } else {
      setLoading(false);
      showToast(`Không thể lưu phiếu vào Google Sheets: ${syncResult.message || 'Lỗi không xác định'}`, 'error');
    }
  };

  const handleReset = () => {
    setFullName('');
    setDepartment(DEPARTMENTS[1]);
    setAssetName('');
    setCondition('');
    setReportDate(todayStr);
    setProposal('');
    setUrgency('Trung Bình');
    setNote('');
    setSuccessRequest(null);
    setNextId(generateNextRepairId(repairRequests));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-blue-900 bg-white hover:bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Trang chủ</span>
        </button>

        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>Tình trạng mặc định:</span>
          <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
            Đề xuất
          </span>
        </div>


      </div>

      {/* Main Form Container */}
      <div className="bg-white rounded-2xl shadow-xl border-t-8 border-red-700 overflow-hidden border-x border-b border-gray-200">
        {/* Form Header Banner */}
        <div className="bg-gradient-to-r from-red-800 via-red-700 to-red-900 text-white p-6 sm:p-8">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
              <Wrench className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-red-200">
                CHỨC NĂNG 1 • PHIẾU BÁO SỰ CỐ
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                ĐĂNG KÝ SỬA CHỮA TÀI SẢN
              </h2>
              <p className="text-xs sm:text-sm text-red-100 mt-1">
                Lập phiếu yêu cầu bảo trì, sửa chữa máy móc thiết bị phòng ban
              </p>
            </div>
          </div>
        </div>

        {/* Success Modal / Banner when submitted */}
        {successRequest ? (
          <div className="p-8 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 border-4 border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">
                GỬI PHIẾU ĐỀ NGHỊ SỬA CHỮA THÀNH CÔNG!
              </h3>
              <p className="text-sm text-gray-600 max-w-lg mx-auto">
                Phiếu đề nghị sửa chữa tài sản của bạn đã được khởi tạo thành công với mã{' '}
                <strong className="text-red-700 font-mono text-base bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {successRequest.id}
                </strong>
              </p>
            </div>

            {/* Summary Ticket Details */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 text-left max-w-xl mx-auto space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Mã đề nghị:</span>
                <span className="font-bold font-mono text-red-700">{successRequest.id}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Họ và tên:</span>
                <span className="font-semibold text-gray-900">{successRequest.fullName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Phòng ban:</span>
                <span className="font-semibold text-gray-900">{successRequest.department}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Tên tài sản:</span>
                <span className="font-semibold text-gray-900">{successRequest.assetName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Ngày báo hỏng:</span>
                <span className="font-semibold text-gray-900">{successRequest.reportDate}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Mức độ khẩn cấp:</span>
                <span className="font-bold text-red-600">{successRequest.urgency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Trạng thái:</span>
                <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs">
                  {successRequest.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow transition-all flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Tạo tiếp Phiếu sửa chữa khác</span>
              </button>

              <button
                onClick={onBack}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl border border-gray-300 transition-all"
              >
                Trở về Trang chủ
              </button>
            </div>
          </div>
        ) : (
          /* Actual Input Form */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Top Auto ID & Current Date Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-red-50/60 p-4 rounded-xl border border-red-200">
              <div>
                <label className="block text-xs font-bold text-red-900 uppercase tracking-wider mb-1">
                  Mã đề nghị (Tự động tạo)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={nextId}
                    readOnly
                    className="w-full bg-white font-mono font-bold text-red-700 text-lg px-3 py-2 rounded-lg border border-red-300 shadow-inner cursor-not-allowed"
                  />
                  <span className="text-[11px] bg-red-200 text-red-900 font-semibold px-2 py-1 rounded shrink-0">
                    Số tự tăng
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-red-600" />
                  <span>Ngày báo hỏng (Tự động ngày hiện tại)</span>
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                  className="w-full bg-white font-semibold text-gray-800 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* User Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <User className="w-4 h-4 text-red-600" />
                  <span>
                    Họ và tên cán bộ <span className="text-red-600">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Hải"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none text-sm transition-all shadow-sm"
                />
              </div>

              {/* Phòng ban Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Building className="w-4 h-4 text-red-600" />
                  <span>
                    Phòng ban <span className="text-red-600">*</span>
                  </span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none text-sm transition-all shadow-sm bg-white font-medium text-gray-800"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asset Name & Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Wrench className="w-4 h-4 text-red-600" />
                  <span>
                    Tên tài sản / Thiết bị hỏng <span className="text-red-600">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Ví dụ: Máy đếm tiền Glory 8880 / Máy in HP LaserJet / Điều hòa quầy Giao dịch"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none text-sm transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Mức độ khẩn cấp</span>
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none text-sm transition-all shadow-sm font-semibold text-red-700 bg-white"
                >
                  {URGENCY_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condition Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>
                  Tình trạng hỏng hóc hiện tại <span className="text-red-600">*</span>
                </span>
              </label>
              <textarea
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                rows={3}
                placeholder="Mô tả chi tiết sự cố: ví dụ máy không lên nguồn, kêu to, bị kẹt giấy, kẹt tiền, rò rỉ nước..."
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none text-sm transition-all shadow-sm"
              ></textarea>
            </div>

            {/* Proposal / Recommendation */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <FileText className="w-4 h-4 text-red-600" />
                <span>
                  Đề xuất xử lý / Khắc phục <span className="text-red-600">*</span>
                </span>
              </label>
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Đề nghị thay bao lụa máy in / Liên hệ thợ bảo dưỡng điều hòa / Thay nguồn máy đếm tiền..."
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none text-sm transition-all shadow-sm"
              ></textarea>
            </div>

            {/* Notes (Optional) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Ghi chú bổ sung (Nếu có)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú hoặc yêu cầu thêm..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none text-sm transition-all shadow-sm"
              />
            </div>

            {/* Submit Action Buttons */}
            <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Làm mới Form</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white font-extrabold rounded-xl shadow-lg hover:shadow-red-900/40 text-sm transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
                    <span>Đang ghi dữ liệu vào Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-amber-300" />
                    <span>Gửi Đăng ký Sửa chữa</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
