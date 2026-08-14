import React from 'react';
import { X, Printer, Building2, CheckSquare } from 'lucide-react';
import { ProcurementRequest, RepairRequest } from '../types';

interface PrintTicketModalProps {
  type: 'repair' | 'procurement';
  request: RepairRequest | ProcurementRequest;
  onClose: () => void;
  bankBranchName?: string;
}

export const PrintTicketModal: React.FC<PrintTicketModalProps> = ({
  type,
  request,
  onClose,
  bankBranchName = 'NGÂN HÀNG TMCP VIETINBANK-CN NINH BÌNH',
}) => {
  const isRepair = type === 'repair';
  const repairReq = isRepair ? (request as RepairRequest) : null;
  const procurementReq = !isRepair ? (request as ProcurementRequest) : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-gray-300">
        {/* Header Action Bar */}
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between print:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center space-x-1">
            <Printer className="w-4 h-4" />
            <span>Xem trước Phiếu Đề Nghị Để In</span>
          </span>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu Ngay</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-8 sm:p-10 space-y-6 bg-white text-gray-900 print:p-0 font-serif text-xs sm:text-sm">
          {/* Bank Top Header */}
          <div className="flex justify-between items-center border-b-2 border-[#00529C] pb-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <img
                src="https://raw.githubusercontent.com/giadinhbanker/anh-super-app-bac-phu-tho/main/Logo%20VietinBank.png"
                alt="VietinBank Logo"
                className="h-12 sm:h-16 w-auto object-contain shrink-0"
              />
              <div>
                <div className="font-bold uppercase text-[11px] sm:text-xs tracking-wider text-[#00529C]">
                  NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM
                </div>
                <div className="font-extrabold uppercase text-xs sm:text-sm text-slate-900">
                  {bankBranchName}
                </div>
                <div className="text-[11px] font-medium text-slate-600">Phòng Tổng hợp / Hành chính Quản trị</div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono font-bold text-base sm:text-lg text-[#ED1C24]">{request.id}</div>
              <div className="text-[11px] text-slate-500 font-medium">
                Ngày tạo: {isRepair ? repairReq?.reportDate : procurementReq?.requestDate}
              </div>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center space-y-1 py-2">
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-gray-900">
              PHIẾU ĐỀ NGHỊ {isRepair ? 'SỬA CHỮA TÀI SẢN' : 'MUA SẮM TÀI SẢN'}
            </h2>
            <p className="text-xs italic text-gray-600">
              (V/v đề xuất {isRepair ? 'sửa chữa, bảo dưỡng' : 'trang bị mới'} tài sản, thiết bị làm việc)
            </p>
          </div>

          {/* Main Table Content */}
          <div className="space-y-3 font-sans border border-gray-300 rounded-lg p-4 bg-gray-50/50">
            <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-200 pb-2">
              <div>
                <span className="text-gray-500">Họ và tên cán bộ: </span>
                <strong className="text-gray-900">{request.fullName}</strong>
              </div>
              <div>
                <span className="text-gray-500">Phòng ban: </span>
                <strong className="text-gray-900">{request.department}</strong>
              </div>
            </div>

            {isRepair ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-200 pb-2">
                  <div>
                    <span className="text-gray-500">Tên tài sản hỏng: </span>
                    <strong className="text-red-800">{repairReq?.assetName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Mức độ khẩn cấp: </span>
                    <strong className="text-red-700">{repairReq?.urgency}</strong>
                  </div>
                </div>

                <div className="text-xs space-y-1 border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-semibold">Tình trạng hỏng hóc:</span>
                  <p className="text-gray-900 italic bg-white p-2 rounded border border-gray-200">
                    "{repairReq?.condition}"
                  </p>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-gray-500 font-semibold">Đề xuất phương án:</span>
                  <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                    {repairReq?.proposal}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-200 pb-2">
                  <div>
                    <span className="text-gray-500">Tên thiết bị đề xuất: </span>
                    <strong className="text-emerald-900">{procurementReq?.equipmentName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Số lượng: </span>
                    <strong className="text-emerald-900">{procurementReq?.quantity} bộ/cái</strong>
                  </div>
                </div>

                <div className="text-xs space-y-1 border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-semibold">Chủng loại / Quy cách:</span>
                  <p className="text-gray-900 font-medium">{procurementReq?.category}</p>
                </div>

                <div className="text-xs space-y-1 border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-semibold">Lý do mua sắm:</span>
                  <p className="text-gray-900 italic">{procurementReq?.reason}</p>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-gray-500 font-semibold">Đề xuất thời gian:</span>
                  <p className="text-gray-900 font-semibold">{procurementReq?.proposedDate}</p>
                </div>
              </>
            )}

            <div className="text-xs pt-2 border-t border-gray-200 flex justify-between">
              <div>
                <span className="text-gray-500">Trạng thái hiện tại: </span>
                <span className="font-bold text-blue-900">{request.status}</span>
              </div>
              <div>
                <span className="text-gray-500">Cán bộ xử lý: </span>
                <span className="font-semibold text-gray-900">{request.handler || '(Chưa gán)'}</span>
              </div>
            </div>
          </div>

          {/* Signature Blocks */}
          <div className="grid grid-cols-3 gap-2 pt-8 text-center text-xs">
            <div className="space-y-12">
              <div className="font-bold uppercase">CÁN BỘ ĐỀ NGHỊ</div>
              <div className="italic text-gray-500">(Ký & ghi rõ họ tên)</div>
              <div className="font-bold pt-4 text-gray-900">{request.fullName}</div>
            </div>

            <div className="space-y-12">
              <div className="font-bold uppercase">CÁN BỘ XỬ LÝ / TCTH</div>
              <div className="italic text-gray-500">(Ký & ghi rõ họ tên)</div>
              <div className="font-bold pt-4 text-gray-900">{request.handler || '...............'}</div>
            </div>

            <div className="space-y-12">
              <div className="font-bold uppercase">BAN GIÁM ĐỐC / TRƯỞNG PHÒNG</div>
              <div className="italic text-gray-500">(Phê duyệt)</div>
              <div className="font-bold pt-4 text-gray-900">..............................</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
