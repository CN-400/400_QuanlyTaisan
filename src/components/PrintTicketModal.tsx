import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, FileText, Loader2, LogOut } from 'lucide-react';
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
  bankBranchName = 'Chi nhánh Ninh Bình',
}) => {
  const isRepair = type === 'repair';
  const repairReq = isRepair ? (request as RepairRequest) : null;
  const procurementReq = !isRepair ? (request as ProcurementRequest) : null;
  const printRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Listen to ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Smart Print handler: handles iframe restrictions gracefully
  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      handlePrintInNewWindow();
    }
  };

  // Fallback print in a clean popup window if iframe blocks window.print()
  const handlePrintInNewWindow = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert('Vui lòng cho phép bật cửa sổ Popup trên trình duyệt để in phiếu.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Phieu_De_Nghi_${request.id}</title>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: 'Times New Roman', Times, serif; background: white; margin: 0; padding: 20px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Helper to load html2pdf.js dynamically from CDN
  const loadHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        resolve((window as any).html2pdf);
      };
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  // Export to PDF function
  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExportingPDF(true);

    try {
      const html2pdf = await loadHtml2Pdf();
      const filename = `Phieu_De_Nghi_${request.id}_${request.fullName.replace(/\s+/g, '_')}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(printRef.current).save();
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error);
      // Fallback if html2pdf fails
      handlePrintInNewWindow();
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Helper to format date and time nicely in dd/mm/yyyy for official documents
  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '';
    // Try JavaScript Date parsing first
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      // fallback
    }

    // Fallback manual formatting for YYYY-MM-DD
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    if (cleanStr.includes('-')) {
      const parts = cleanStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  const formatDateTime = (primaryInput?: string, secondaryInput?: string) => {
    const targetStr = primaryInput || secondaryInput;
    if (targetStr) {
      try {
        const d = new Date(targetStr);
        if (!isNaN(d.getTime())) {
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${hours}:${minutes} - ${day}/${month}/${year}`;
        }
      } catch (e) {
        // fallback
      }
    }
    if (secondaryInput) {
      return formatDateOnly(secondaryInput);
    }
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  };

  const requestDateTimeStr = formatDateTime(
    request.createdAt,
    isRepair ? repairReq?.reportDate : procurementReq?.requestDate
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-gray-300 max-h-[95vh] flex flex-col">
        {/* Sticky Header Action Bar */}
        <div className="bg-[#00529C] text-white px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden shrink-0 shadow-md border-b-2 border-amber-400">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-300 shrink-0" />
            <span className="text-sm font-bold uppercase tracking-wider text-amber-300">
              Xem trước Phiếu Đề Nghị
            </span>
            <span className="hidden md:inline-block text-xs bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded border border-blue-400/40">
              Phím ESC để đóng
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF Button */}
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-all flex items-center space-x-1.5 cursor-pointer transform hover:scale-105 active:scale-95"
              title="Xuất phiếu ra file PDF chuẩn A4"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang Xuất PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Xuất File PDF</span>
                </>
              )}
            </button>

            {/* Direct Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow transition-all flex items-center space-x-1.5 cursor-pointer transform hover:scale-105 active:scale-95"
              title="In phiếu trực tiếp từ trình duyệt"
            >
              <Printer className="w-4 h-4" />
              <span>In Trực Tiếp</span>
            </button>

            {/* Print in New Window Button (for iframe compatibility) */}
            <button
              onClick={handlePrintInNewWindow}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-all flex items-center space-x-1 cursor-pointer transform hover:scale-105 active:scale-95"
              title="Mở phiếu sang cửa sổ mới để in"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span className="hidden sm:inline">Mở Cửa Sổ In</span>
            </button>

            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1"
              title="Đóng cửa sổ xem trước (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Area */}
        <div className="p-4 sm:p-8 bg-gray-100/80 overflow-y-auto flex-1">
          <div
            ref={printRef}
            className="p-6 sm:p-10 space-y-6 bg-white text-gray-900 border border-gray-300 rounded-xl shadow-md text-xs sm:text-sm max-w-3xl mx-auto"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
          {/* Top Bank Header */}
          <div className="flex justify-between items-start border-b-2 border-[#00529C] pb-4">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <img
                src="https://raw.githubusercontent.com/giadinhbanker/anh-super-app-bac-phu-tho/main/Logo%20VietinBank.png"
                alt="VietinBank Logo"
                className="h-12 sm:h-14 w-auto object-contain shrink-0 mt-0.5"
              />
              <div className="space-y-0.5">
                <div className="font-bold text-xs sm:text-sm text-[#00529C] leading-tight">
                  Ngân hàng TMCP VietinBank - Chi nhánh Ninh Bình
                </div>
                <div className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                  Phòng: <span className="uppercase text-[#00529C]">{request.department || 'TỔNG HỢP / HÀNH CHÍNH QUẢN TRỊ'}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono font-bold text-base sm:text-lg text-[#ED1C24]">{request.id}</div>
              <div className="text-[11px] text-gray-600 font-sans">
                <span className="font-semibold text-gray-700">Ngày giờ đề nghị:</span>
                <br />
                <span className="font-bold text-gray-900">{requestDateTimeStr}</span>
              </div>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center space-y-1.5 py-2">
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-[#00529C]">
              PHIẾU ĐỀ NGHỊ {isRepair ? 'SỬA CHỮA TÀI SẢN' : 'MUA SẮM TÀI SẢN'}
            </h2>
            <p className="text-xs italic text-gray-600">
              (Về việc đề xuất {isRepair ? 'sửa chữa, bảo dưỡng' : 'trang bị mới'} tài sản, trang thiết bị phục vụ công tác)
            </p>
            <p className="text-xs italic text-gray-700 font-semibold pt-1">
              Kính gửi : Ban Giám đốc & Phòng TCTH - VietinBank - Chi nhánh Ninh Bình
            </p>
          </div>

          {/* Main Request Information Table */}
          <div className="space-y-3 border border-gray-400 rounded-lg p-4 bg-gray-50/50">
            <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-300 pb-2">
              <div>
                <span className="text-gray-600">Họ và tên cán bộ đề nghị: </span>
                <strong className="text-gray-900 font-bold text-sm">{request.fullName}</strong>
              </div>
              <div>
                <span className="text-gray-600">Phòng / Đơn vị: </span>
                <strong className="text-gray-900 font-bold">{request.department}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-300 pb-2">
              <div>
                <span className="text-gray-600">Ngày giờ lập đề nghị: </span>
                <strong className="text-[#00529C] font-bold">{requestDateTimeStr}</strong>
              </div>
              <div>
                <span className="text-gray-600">Mã phiếu đề nghị: </span>
                <strong className="text-[#ED1C24] font-mono font-bold">{request.id}</strong>
              </div>
            </div>

            {isRepair ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-300 pb-2">
                  <div>
                    <span className="text-gray-600">Tên tài sản / Thiết bị hỏng: </span>
                    <strong className="text-[#00529C] font-bold text-sm">{repairReq?.assetName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-600">Mức độ khẩn cấp: </span>
                    <strong className="text-red-700 font-bold">{repairReq?.urgency}</strong>
                  </div>
                </div>

                <div className="text-xs space-y-1 border-b border-gray-300 pb-2">
                  <span className="text-gray-700 font-bold">Mô tả tình trạng hỏng hóc:</span>
                  <p className="text-gray-900 bg-white p-2 rounded border border-gray-300 italic">
                    "{repairReq?.condition}"
                  </p>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-gray-700 font-bold">Đề xuất phương án sửa chữa:</span>
                  <p className="text-gray-900 bg-white p-2 rounded border border-gray-300 font-medium">
                    {repairReq?.proposal}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs border-b border-gray-300 pb-2">
                  <div>
                    <span className="text-gray-600">Tên thiết bị đề xuất mua sắm: </span>
                    <strong className="text-[#00529C] font-bold text-sm">{procurementReq?.equipmentName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-600">Số lượng mua sắm: </span>
                    <strong className="text-gray-900 font-bold">{procurementReq?.quantity} (cái/bộ)</strong>
                  </div>
                </div>

                <div className="text-xs space-y-1 border-b border-gray-300 pb-2">
                  <span className="text-gray-700 font-bold">Chủng loại / Quy cách kỹ thuật:</span>
                  <p className="text-gray-900 font-medium">{procurementReq?.category}</p>
                </div>

                {procurementReq?.description && (
                  <div className="text-xs space-y-1 border-b border-gray-300 pb-2">
                    <span className="text-gray-700 font-bold">Mô tả chi tiết / Thông số:</span>
                    <p className="text-gray-900 bg-white p-2 rounded border border-gray-300">{procurementReq?.description}</p>
                  </div>
                )}

                <div className="text-xs space-y-1 border-b border-gray-300 pb-2">
                  <span className="text-gray-700 font-bold">Lý do đề nghị mua sắm:</span>
                  <p className="text-gray-900 italic">{procurementReq?.reason}</p>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-gray-600">Thời gian đề xuất hoàn thành: </span>
                  <strong className="text-gray-900 font-bold">{formatDateOnly(procurementReq?.proposedDate)}</strong>
                </div>
              </>
            )}

            <div className="text-xs pt-2 border-t border-gray-300 flex justify-between items-center">
              <div>
                <span className="text-gray-600">Trạng thái phê duyệt: </span>
                <span className="font-bold text-[#00529C]">{request.status}</span>
              </div>
              <div>
                <span className="text-gray-600">Cán bộ xử lý / Phụ trách: </span>
                <span className="font-bold text-gray-900">{request.handler || '(Chưa phân công)'}</span>
              </div>
            </div>
          </div>

          {/* Signature Blocks - Removed "(Ký và ghi rõ họ tên)" to leave clean empty space for signing */}
          <div className="pt-6">
            <div className="text-right text-xs italic text-gray-700 mb-4">
              Ninh Bình, {requestDateTimeStr}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              {/* Cán bộ đề nghị */}
              <div className="flex flex-col items-center justify-between min-h-[140px]">
                <div className="font-bold uppercase text-gray-900">CÁN BỘ ĐỀ NGHỊ</div>
                {/* Clean Empty space for signature */}
                <div className="flex-1"></div>
                <div className="font-bold text-gray-900 text-sm">{request.fullName}</div>
              </div>

              {/* Lãnh đạo Phòng / Đơn vị */}
              <div className="flex flex-col items-center justify-between min-h-[140px]">
                <div className="font-bold uppercase text-gray-900">TRƯỞNG PHÒNG / ĐƠN VỊ</div>
                {/* Clean Empty space for signature */}
                <div className="flex-1"></div>
                <div className="font-bold text-gray-900">........................................</div>
              </div>

              {/* Ban Giám Đốc Phê Duyệt */}
              <div className="flex flex-col items-center justify-between min-h-[140px]">
                <div className="font-bold uppercase text-gray-900">BAN GIÁM ĐỐC PHÊ DUYỆT</div>
                {/* Clean Empty space for signature */}
                <div className="flex-1"></div>
                <div className="font-bold text-gray-900">........................................</div>
              </div>
            </div>
          </div>
        </div> </div>
        {/* End Scrollable Area */}

        {/* Bottom Sticky Action Footer Bar */}
        <div className="bg-slate-800 text-white p-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden border-t border-slate-700">
          <div className="text-xs text-slate-300 font-medium hidden sm:block">
            Mẹo: Nhấn phím <kbd className="bg-slate-700 text-amber-300 px-2 py-0.5 rounded border border-slate-600 font-mono font-bold">ESC</kbd> trên bàn phím để thoát nhanh.
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Tải File PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Thoát / Đóng (ESC)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

