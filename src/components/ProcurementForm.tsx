import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  User,
  Building,
  Package,
  Layers,
  FileText,
  Calendar,
  Send,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Loader2,
  HelpCircle,
  Printer,
  Plus,
  Minus,
} from 'lucide-react';
import { DEPARTMENTS, EQUIPMENT_LIST } from '../constants/data';
import { AppSettings, ProcurementRequest } from '../types';
import { generateNextProcurementId, saveProcurementRequests } from '../services/storage';
import { syncProcurementToGoogleSheets } from '../services/sheetsApi';
import { PrintTicketModal } from './PrintTicketModal';

interface ProcurementFormProps {
  procurementRequests: ProcurementRequest[];
  setProcurementRequests: React.Dispatch<React.SetStateAction<ProcurementRequest[]>>;
  settings: AppSettings;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProcurementForm: React.FC<ProcurementFormProps> = ({
  procurementRequests,
  setProcurementRequests,
  settings,
  onBack,
  showToast,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [nextId, setNextId] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[1]); // Default Phòng DVKH
  const [equipmentName, setEquipmentName] = useState<string>(EQUIPMENT_LIST[14]); // Default Máy đếm tiền
  const [customEquipment, setCustomEquipment] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [category, setCategory] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [requestDate, setRequestDate] = useState<string>(todayStr);
  const [proposedDate, setProposedDate] = useState<string>('Trong tháng này');
  const [note, setNote] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [successRequest, setSuccessRequest] = useState<ProcurementRequest | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  useEffect(() => {
    setNextId(generateNextProcurementId(procurementRequests));
  }, [procurementRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedEquipment =
      equipmentName === 'Tài sản khác' ? customEquipment.trim() || 'Tài sản khác' : equipmentName;

    if (!fullName.trim()) {
      showToast('Vui lòng nhập Họ và tên cán bộ đề nghị.', 'error');
      return;
    }
    if (quantity <= 0) {
      showToast('Số lượng tài sản phải lớn hơn 0.', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Vui lòng nhập Lý do đề xuất mua sắm.', 'error');
      return;
    }

    setLoading(true);

    const newRequest: ProcurementRequest = {
      id: nextId,
      fullName: fullName.trim(),
      department,
      equipmentName: selectedEquipment,
      quantity,
      category: category.trim(),
      reason: reason.trim(),
      description: description.trim(),
      requestDate: requestDate || todayStr,
      proposedDate: proposedDate.trim() || 'Trong tháng này',
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
    const syncResult = await syncProcurementToGoogleSheets(newRequest, settings);

    if (syncResult.success) {
      const serverAssignedId = syncResult.data?.id || newRequest.id;
      const finalRequest: ProcurementRequest = {
        ...newRequest,
        id: serverAssignedId,
      };

      const updatedList = [finalRequest, ...procurementRequests];
      setProcurementRequests(updatedList);
      saveProcurementRequests(updatedList);

      setLoading(false);
      setSuccessRequest(finalRequest);
      showToast(`Đã ghi nhận phiếu mua sắm ${finalRequest.id} thành công lên Google Sheets!`, 'success');
    } else {
      setLoading(false);
      showToast(`Không thể lưu phiếu vào Google Sheets: ${syncResult.message || 'Lỗi không xác định'}`, 'error');
    }
  };

  const handleReset = () => {
    setFullName('');
    setDepartment(DEPARTMENTS[1]);
    setEquipmentName(EQUIPMENT_LIST[14]);
    setCustomEquipment('');
    setQuantity(1);
    setCategory('');
    setReason('');
    setDescription('');
    setRequestDate(todayStr);
    setProposedDate('Trong tháng này');
    setNote('');
    setSuccessRequest(null);
    setNextId(generateNextProcurementId(procurementRequests));
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
      <div className="bg-white rounded-2xl shadow-xl border-t-8 border-emerald-700 overflow-hidden border-x border-b border-gray-200">
        {/* Form Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white p-6 sm:p-8">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-8 h-8 text-emerald-200" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-emerald-200">
                CHỨC NĂNG 2 • PHIẾU ĐỀ XUẤT TRANG BỊ
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                ĐĂNG KÝ MUA SẮM TÀI SẢN
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                Lập phiếu trình trang bị mua sắm máy móc, công cụ dụng cụ làm việc mới
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
                GỬI PHIẾU ĐỀ NGHỊ MUA SẮM THÀNH CÔNG!
              </h3>
              <p className="text-sm text-gray-600 max-w-lg mx-auto">
                Phiếu đề xuất mua sắm tài sản đã được tạo thành công với mã{' '}
                <strong className="text-emerald-700 font-mono text-base bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {successRequest.id}
                </strong>
              </p>
            </div>

            {/* Summary Ticket Details */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 text-left max-w-xl mx-auto space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Mã đề nghị:</span>
                <span className="font-bold font-mono text-emerald-700">{successRequest.id}</span>
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
                <span className="text-gray-500">Tên thiết bị:</span>
                <span className="font-bold text-gray-900">{successRequest.equipmentName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Số lượng:</span>
                <span className="font-bold text-emerald-800">{successRequest.quantity} bộ/cái</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Ngày đề nghị:</span>
                <span className="font-semibold text-gray-900">{successRequest.requestDate}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Thời gian mua đề xuất:</span>
                <span className="font-semibold text-gray-900">{successRequest.proposedDate}</span>
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
                onClick={() => setShowPrintModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00529C] to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-900/40 transition-all flex items-center space-x-2 transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Printer className="w-5 h-5 text-amber-300" />
                <span>Xem & In / Xuất PDF Phiếu Đề Nghị</span>
              </button>

              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow transition-all flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Tạo tiếp Phiếu mua sắm khác</span>
              </button>

              <button
                onClick={onBack}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl border border-gray-300 transition-all"
              >
                Trở về Trang chủ
              </button>
            </div>

            {/* Print Ticket Modal */}
            {showPrintModal && successRequest && (
              <PrintTicketModal
                type="procurement"
                request={successRequest}
                onClose={() => setShowPrintModal(false)}
              />
            )}
          </div>
        ) : (
          /* Actual Input Form */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Top Auto ID & Request Date Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
              <div>
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">
                  Mã đề nghị Mua sắm (Tự động tạo)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={nextId}
                    readOnly
                    className="w-full bg-white font-mono font-bold text-emerald-800 text-lg px-3 py-2 rounded-lg border border-emerald-300 shadow-inner cursor-not-allowed"
                  />
                  <span className="text-[11px] bg-emerald-200 text-emerald-900 font-semibold px-2 py-1 rounded shrink-0">
                    Số tự tăng
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ngày đề nghị (Tự động ngày hiện tại)</span>
                </label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  required
                  className="w-full bg-white font-semibold text-gray-800 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Proposer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>
                    Họ và tên cán bộ <span className="text-emerald-600">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-sm transition-all shadow-sm"
                />
              </div>

              {/* Phòng ban Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span>
                    Phòng ban <span className="text-emerald-600">*</span>
                  </span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-sm transition-all shadow-sm bg-white font-medium text-gray-800"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Equipment Dropdown & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>
                    Tên thiết bị đề xuất <span className="text-emerald-600">*</span>
                  </span>
                </label>
                <select
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-sm transition-all shadow-sm bg-white font-medium text-gray-900"
                >
                  {EQUIPMENT_LIST.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                {equipmentName === 'Tài sản khác' && (
                  <input
                    type="text"
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value)}
                    placeholder="Nhập chi tiết tên tài sản khác..."
                    required
                    className="mt-2 w-full px-4 py-2 rounded-xl border border-emerald-400 focus:ring-2 focus:ring-emerald-600 outline-none text-sm shadow-sm bg-emerald-50/50"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>
                    Số lượng <span className="text-emerald-600">*</span>
                  </span>
                </label>
                <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-gray-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600 bg-white">
                  {/* Nút Giảm (-) */}
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, (prev || 1) - 1))}
                    disabled={quantity <= 1}
                    className="w-11 h-10 flex items-center justify-center bg-gray-50 hover:bg-emerald-50 active:bg-emerald-100 text-gray-700 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-gray-200 cursor-pointer shrink-0"
                    title="Giảm số lượng (-)"
                    aria-label="Giảm số lượng"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  {/* Ô nhập số trực tiếp từ bàn phím */}
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    max={999}
                    value={quantity === 0 ? '' : quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setQuantity(0);
                      } else {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed)) {
                          setQuantity(Math.max(1, Math.min(999, parsed)));
                        }
                      }
                    }}
                    onBlur={() => {
                      if (!quantity || quantity < 1) {
                        setQuantity(1);
                      }
                    }}
                    placeholder="1"
                    required
                    className="w-full text-center py-2 bg-transparent outline-none text-base font-bold text-emerald-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  {/* Nút Tăng (+) */}
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.min(999, (prev || 0) + 1))}
                    disabled={quantity >= 999}
                    className="w-11 h-10 flex items-center justify-center bg-gray-50 hover:bg-emerald-50 active:bg-emerald-100 text-gray-700 hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-l border-gray-200 cursor-pointer shrink-0"
                    title="Tăng số lượng (+)"
                    aria-label="Tăng số lượng"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chủng loại & Proposed Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>ĐỀ XUẤT CHỦNG LOẠI/QUY CÁCH (nếu có)</span>
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ví dụ: Máy đếm tiền phát hiện tiền giả Silicon / Ghế xoay khung thép..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-sm transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>
                    Đề xuất thời gian mua <span className="text-emerald-600">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  placeholder="Ví dụ: Trong tháng 08/2026, Tuần tới, Càng sớm càng tốt..."
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Reason for proposal */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Lý do đề xuất <span className="text-emerald-600">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Trang bị bổ sung cho quầy giao dịch viên mới / Thay thế máy đếm tiền cũ đã hết hạn sử dụng..."
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-sm transition-all shadow-sm"
              ></textarea>
            </div>

            {/* Technical Requirement Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                MÔ TẢ YÊU CẦU KỸ THUẬT CHI TIẾT (NẾU CÓ)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Mô tả cấu hình, kích thước, công năng, chuẩn kết nối hoặc tính năng đặc thù cần có (nếu có)..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-sm transition-all shadow-sm"
              ></textarea>
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Ghi chú thêm (Nếu có)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm cho bộ phận thẩm định..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none text-sm transition-all shadow-sm"
              />
            </div>

            {/* Submit Buttons */}
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
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold rounded-xl shadow-lg hover:shadow-emerald-900/40 text-sm transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-200" />
                    <span>Đang ghi dữ liệu vào Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-emerald-200" />
                    <span>Gửi Đăng ký Mua sắm</span>
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
