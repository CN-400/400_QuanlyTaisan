import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, FileText, Loader2, LogOut, Calendar, Layers } from 'lucide-react';
import { ProcurementRequest, RepairRequest, UserSession } from '../types';
import { formatVnDateTime, formatVnDateOnly } from '../utils/dateFormatter';

interface PrintReportListModalProps {
  type: 'repair' | 'procurement';
  items: (RepairRequest | ProcurementRequest)[];
  startDate?: string;
  endDate?: string;
  selectedDept?: string;
  selectedStatus?: string;
  selectedUrgency?: string;
  searchTerm?: string;
  bankBranchName?: string;
  currentUser?: UserSession | null;
  onClose: () => void;
}

export const PrintReportListModal: React.FC<PrintReportListModalProps> = ({
  type,
  items,
  startDate,
  endDate,
  selectedDept = 'Tất cả',
  selectedStatus = 'Tất cả',
  selectedUrgency = 'Tất cả',
  searchTerm = '',
  bankBranchName = 'Chi nhánh Ninh Bình',
  currentUser,
  onClose,
}) => {
  const isRepair = type === 'repair';
  const printRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Direct print
  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      handlePrintInNewWindow();
    }
  };

  // Print popup window fallback
  const handlePrintInNewWindow = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      alert('Vui lòng cho phép bật cửa sổ Popup trên trình duyệt để in danh sách báo cáo.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bao_Cao_Danh_Sach_${isRepair ? 'Sua_Chua' : 'Mua_Sam'}</title>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { font-family: 'Times New Roman', Times, serif; background: white; margin: 0; padding: 20px; }
            @media print {
              body { padding: 0; }
              @page { size: landscape; margin: 10mm; }
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

  // Helper to load html2pdf.js from CDN
  const loadHtml2Pdf = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  };

  // Export PDF
  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExportingPDF(true);

    try {
      const html2pdf = await loadHtml2Pdf();
      const filename = `Bao_Cao_${isRepair ? 'Sua_Chua' : 'Mua_Sam'}_${new Date().toISOString().split('T')[0]}.pdf`;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      };

      await html2pdf().set(opt).from(printRef.current).save();
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error);
      handlePrintInNewWindow();
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Date formatting helpers
  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    } catch (e) {
      // ignore
    }
    return dateStr;
  };

  const today = new Date();
  const todayFormatted = `ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

  // Statistics
  const completedCount = items.filter((i) => i.status === 'Hoàn thành xử lý').length;
  const inProgressCount = items.filter((i) => i.status === 'Đang xử lý').length;
  const proposedCount = items.filter((i) => i.status === 'Đề xuất').length;
  const rejectedCount = items.filter((i) => i.status === 'Từ chối').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-auto overflow-hidden border border-gray-300 max-h-[96vh] flex flex-col">
        {/* Sticky Header Action Bar */}
        <div className="bg-[#00529C] text-white px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden shrink-0 shadow-md border-b-2 border-amber-400">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-300 shrink-0" />
            <span className="text-sm font-bold uppercase tracking-wider text-amber-300">
              In Báo Cáo Tổng Hợp Danh Sách ({items.length} hồ sơ)
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
              title="Xuất file PDF báo cáo khổ ngang A4"
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
              title="In báo cáo trực tiếp"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay</span>
            </button>

            {/* Print in New Window Button */}
            <button
              onClick={handlePrintInNewWindow}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition-all flex items-center space-x-1 cursor-pointer transform hover:scale-105 active:scale-95"
              title="Mở báo cáo sang cửa sổ mới"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span className="hidden sm:inline">Mở Cửa Sổ In</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1"
              title="Đóng (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Area */}
        <div className="p-3 sm:p-6 bg-gray-100/80 overflow-y-auto flex-1">
          <div
            ref={printRef}
            className="p-6 sm:p-10 space-y-6 bg-white text-gray-900 border border-gray-300 rounded-xl shadow-md text-xs sm:text-sm max-w-5xl mx-auto"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            {/* Header Bank & National Emblem */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
              <div className="text-left space-y-1">
                <div className="font-bold text-sm sm:text-base text-[#00529C] uppercase tracking-wide">
                  NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM
                </div>
                <div className="font-bold text-xs sm:text-sm text-gray-800 uppercase">
                  {bankBranchName.toUpperCase()}
                </div>
                <div className="text-[11px] text-gray-500 italic">
                  Số: ....../BC-{isRepair ? 'SC' : 'MS'}-NB
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="font-bold text-xs sm:text-sm uppercase text-gray-900">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="font-bold text-xs underline text-gray-800">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="text-[11px] text-gray-500 italic pt-1">
                  Ninh Bình, {todayFormatted}
                </div>
              </div>
            </div>

            {/* Report Title */}
            <div className="text-center space-y-2 pt-2">
              <h1 className="text-base sm:text-xl font-bold uppercase text-[#00529C] tracking-wide">
                {isRepair
                  ? 'BÁO CÁO TỔNG HỢP DANH SÁCH ĐỀ NGHỊ SỬA CHỮA TÀI SẢN'
                  : 'BÁO CÁO TỔNG HỢP DANH SÁCH ĐỀ NGHỊ MUA SẮM THIẾT BỊ'}
              </h1>

              {/* Filter Criteria Scope */}
              <div className="text-xs text-gray-700 italic space-y-0.5">
                <div>
                  Thời gian:{' '}
                  <span className="font-semibold not-italic">
                    {startDate && endDate
                      ? `Từ ngày ${formatDateVN(startDate)} đến ngày ${formatDateVN(endDate)}`
                      : startDate
                      ? `Từ ngày ${formatDateVN(startDate)} đến nay`
                      : endDate
                      ? `Đến ngày ${formatDateVN(endDate)}`
                      : 'Toàn bộ thời gian'}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 text-[11px] text-gray-600">
                  <span>
                    Phòng ban: <strong>{selectedDept}</strong>
                  </span>
                  <span>
                    Trạng thái: <strong>{selectedStatus}</strong>
                  </span>
                  {isRepair && (
                    <span>
                      Độ khẩn: <strong>{selectedUrgency}</strong>
                    </span>
                  )}
                  {searchTerm && (
                    <span>
                      Từ khóa tìm kiếm: "<strong>{searchTerm}</strong>"
                    </span>
                  )}
                  <span>
                    Tổng số hồ sơ: <strong>{items.length} đề nghị</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Main Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 text-center font-bold">
                    <th className="border border-gray-400 p-2 w-10">STT</th>
                    <th className="border border-gray-400 p-2 w-24">Mã Đề Nghị</th>
                    <th className="border border-gray-400 p-2 w-24">Ngày Đề Nghị</th>
                    <th className="border border-gray-400 p-2 w-32">Cán Bộ Đề Nghị</th>
                    <th className="border border-gray-400 p-2 w-32">Phòng Ban</th>
                    <th className="border border-gray-400 p-2">
                      {isRepair ? 'Tài Sản & Sự Cố' : 'Thiết Bị & Yêu Cầu'}
                    </th>
                    {isRepair && <th className="border border-gray-400 p-2 w-20">Độ Khẩn</th>}
                    <th className="border border-gray-400 p-2 w-24">Trạng Thái</th>
                    <th className="border border-gray-400 p-2 w-28">Cán Bộ Xử Lý</th>
                    <th className="border border-gray-400 p-2 w-24">Ngày Xong</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isRepair ? 10 : 9}
                        className="border border-gray-400 p-6 text-center text-gray-500 italic"
                      >
                        Không có đề nghị nào phù hợp với điều kiện tìm kiếm và thời gian đã chọn.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const rep = isRepair ? (item as RepairRequest) : null;
                      const proc = !isRepair ? (item as ProcurementRequest) : null;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 text-[11px] sm:text-xs">
                          <td className="border border-gray-400 p-2 text-center font-medium">
                            {index + 1}
                          </td>
                          <td className="border border-gray-400 p-2 font-mono font-bold text-blue-900 text-center">
                            {item.id}
                          </td>
                          <td className="border border-gray-400 p-2 text-center whitespace-nowrap">
                            {formatVnDateTime(isRepair ? rep?.reportDate : proc?.requestDate, item.createdAt)}
                          </td>
                          <td className="border border-gray-400 p-2 font-medium">
                            {item.fullName}
                          </td>
                          <td className="border border-gray-400 p-2">{item.department}</td>
                          <td className="border border-gray-400 p-2">
                            {isRepair ? (
                              <div>
                                <div className="font-bold text-gray-900">{rep?.assetName}</div>
                                <div className="text-gray-600 italic text-[11px]">
                                  {rep?.condition}
                                </div>
                                {rep?.proposal && (
                                  <div className="text-blue-800 text-[10px]">
                                    Đ/x: {rep.proposal}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="font-bold text-gray-900">
                                  {proc?.equipmentName}{' '}
                                  <span className="text-emerald-800">(SL: {proc?.quantity})</span>
                                </div>
                                {proc?.category && (
                                  <div className="text-gray-600 text-[11px]">
                                    Chủng loại: {proc.category}
                                  </div>
                                )}
                                {proc?.proposedDate && (
                                  <div className="text-blue-800 text-[10px]">
                                    Thời gian mua: {formatVnDateOnly(proc.proposedDate)}
                                  </div>
                                )}
                                <div className="text-gray-600 italic text-[10px]">
                                  Lý do: {proc?.reason}
                                </div>
                              </div>
                            )}
                          </td>
                          {isRepair && (
                            <td className="border border-gray-400 p-2 text-center font-semibold">
                              <span
                                className={
                                  rep?.urgency === 'Rất Cao' || rep?.urgency === 'Cao'
                                    ? 'text-red-700 font-bold'
                                    : 'text-gray-700'
                                }
                              >
                                {rep?.urgency}
                              </span>
                            </td>
                          )}
                          <td className="border border-gray-400 p-2 text-center font-semibold">
                            {item.status}
                          </td>
                          <td className="border border-gray-400 p-2 text-center">
                            {item.handler || '-'}
                          </td>
                          <td className="border border-gray-400 p-2 text-center whitespace-nowrap">
                            {formatVnDateTime(item.completionDate)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Statistics Summary */}
            <div className="bg-gray-50 border border-gray-300 p-3 rounded text-xs space-y-1">
              <div className="font-bold text-gray-800">TỔNG HỢP KẾT QUẢ:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  • Tổng số hồ sơ: <strong>{items.length}</strong>
                </div>
                <div>
                  • Hoàn thành: <strong className="text-emerald-700">{completedCount}</strong>
                </div>
                <div>
                  • Đang xử lý: <strong className="text-blue-700">{inProgressCount}</strong>
                </div>
                <div>
                  • Chờ duyệt / Đề xuất:{' '}
                  <strong className="text-amber-700">{proposedCount}</strong>
                  {rejectedCount > 0 && (
                    <span className="text-red-700 ml-1">(Từ chối: {rejectedCount})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Signatures Section */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-gray-900">NGƯỜI LẬP BIỂU</div>
                  <div className="text-[11px] text-gray-500 italic">(Ký và ghi rõ họ tên)</div>
                </div>
                <div className="font-bold text-gray-800">
                  {currentUser?.fullName || '................................'}
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-gray-900">CÁN BỘ PHỤ TRÁCH</div>
                  <div className="text-[11px] text-gray-500 italic">(Ký và ghi rõ họ tên)</div>
                </div>
                <div className="font-bold text-gray-800">................................</div>
              </div>

              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-gray-900">GIÁM ĐỐC / PHÓ GIÁM ĐỐC</div>
                  <div className="text-[11px] text-gray-500 italic">(Ký, đóng dấu)</div>
                </div>
                <div className="font-bold text-gray-800">................................</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer Bar */}
        <div className="bg-slate-800 text-white p-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden border-t border-slate-700">
          <div className="text-xs text-slate-300 font-medium hidden sm:block">
            Mẹo: Nhấn phím <kbd className="bg-slate-700 text-amber-300 px-2 py-0.5 rounded border border-slate-600 font-mono font-bold">ESC</kbd> trên bàn phím để đóng nhanh.
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Tải PDF Khổ Ngang</span>
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
              <span>Đóng (ESC)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
