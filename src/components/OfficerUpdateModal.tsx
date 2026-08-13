import React, { useState } from 'react';
import { X, CheckCircle, Clock, XCircle, AlertCircle, User, Calendar, FileText, Loader2 } from 'lucide-react';
import { ProcurementRequest, RepairRequest, RequestStatus } from '../types';
import { STATUS_OPTIONS } from '../constants/data';

interface OfficerUpdateModalProps {
  type: 'repair' | 'procurement';
  request: RepairRequest | ProcurementRequest;
  onClose: () => void;
  onSave: (
    type: 'repair' | 'procurement',
    id: string,
    status: RequestStatus,
    handler: string,
    completionDate: string,
    note: string
  ) => Promise<void>;
}

export const OfficerUpdateModal: React.FC<OfficerUpdateModalProps> = ({
  type,
  request,
  onClose,
  onSave,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [status, setStatus] = useState<RequestStatus>(request.status || 'Đang xử lý');
  const [handler, setHandler] = useState<string>(request.handler || '');
  const [completionDate, setCompletionDate] = useState<string>(
    request.completionDate || (status === 'Hoàn thành xử lý' ? todayStr : '')
  );
  const [note, setNote] = useState<string>(request.note || '');
  const [loading, setLoading] = useState<boolean>(false);

  const isRepair = type === 'repair';
  const repairReq = isRepair ? (request as RepairRequest) : null;
  const procurementReq = !isRepair ? (request as ProcurementRequest) : null;

  const handleStatusChange = (newStatus: RequestStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Hoàn thành xử lý' && !completionDate) {
      setCompletionDate(todayStr);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(
      type,
      request.id,
      status,
      handler.trim(),
      status === 'Hoàn thành xử lý' ? completionDate || todayStr : completionDate,
      note.trim()
    );
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#002060] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm">
              {isRepair ? 'SC' : 'MS'}
            </div>
            <div>
              <div className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                Cập nhật Tiến độ xử lý
              </div>
              <h3 className="text-lg font-bold text-white font-mono">{request.id}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {/* Quick Request Summary */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Đơn vị đề nghị:</span>
              <span className="font-bold text-gray-900">
                {request.fullName} ({request.department})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {isRepair ? 'Tài sản hỏng:' : 'Thiết bị đề xuất:'}
              </span>
              <span className="font-bold text-blue-900">
                {isRepair
                  ? repairReq?.assetName
                  : `${procurementReq?.equipmentName} (x${procurementReq?.quantity})`}
              </span>
            </div>
          </div>

          {/* Form Controls */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Status Option Radios / Buttons */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Chọn trạng thái xử lý <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  let activeClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
                  if (status === opt) {
                    if (opt === 'Đề xuất')
                      activeClass = 'bg-amber-600 text-white font-bold ring-2 ring-amber-400';
                    if (opt === 'Đang xử lý')
                      activeClass = 'bg-blue-600 text-white font-bold ring-2 ring-blue-400';
                    if (opt === 'Từ chối')
                      activeClass = 'bg-red-600 text-white font-bold ring-2 ring-red-400';
                    if (opt === 'Hoàn thành xử lý')
                      activeClass = 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400';
                  }

                  return (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => handleStatusChange(opt)}
                      className={`p-2.5 rounded-xl text-xs transition-all text-center border ${activeClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cán bộ xử lý */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Họ và tên Cán bộ xử lý</span>
              </label>
              <input
                type="text"
                value={handler}
                onChange={(e) => setHandler(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A - Phòng TCTH"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
              />
            </div>

            {/* Completion Date (Required if Hoàn thành) */}
            {status === 'Hoàn thành xử lý' && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ngày hoàn thành xử lý</span>
                </label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-lg border border-emerald-300 font-semibold text-emerald-900 outline-none bg-white"
                />
              </div>
            )}

            {/* Note / Remarks */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Ghi chú xử lý / Nội dung trả lời</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Nhập chi tiết quá trình xử lý, nguyên nhân từ chối, hoặc kết quả bàn giao..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[#002060] hover:bg-blue-900 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu Cập Nhật</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
