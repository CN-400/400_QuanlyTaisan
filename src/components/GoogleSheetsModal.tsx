import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileCode,
  ExternalLink,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Database,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE, INSTRUCTIONS_STEPS } from '../utils/appsScriptCode';
import { testGoogleAppsScriptConnection, saveSettingsToGoogleSheets } from '../services/sheetsApi';
import { AppSettings } from '../types';

interface GoogleSheetsModalProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
  showToast,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(settings.webAppUrl || '');
  const [managerEmail, setManagerEmail] = useState<string>(settings.managerEmail || '');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    showToast('Đã sao chép toàn bộ mã Code.gs vào khay nhớ tạm (Clipboard)!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!inputUrl) {
      setTestResult({ success: false, message: 'Vui lòng nhập đường link Google Apps Script Web App URL.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await testGoogleAppsScriptConnection(inputUrl.trim());
    setTesting(false);
    setTestResult(res);

    if (res.success) {
      showToast('Kết nối Google Sheets thành công!', 'success');
    } else {
      showToast('Kết nối thất bại. Xem chi tiết thông báo lỗi bên dưới.', 'error');
    }
  };

  const [saving, setSaving] = useState<boolean>(false);

  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) {
      showToast('Vui lòng dán URL Google Apps Script Web App trước khi lưu!', 'error');
      return;
    }
    setSaving(true);
    const updated = { ...settings, webAppUrl: inputUrl.trim(), managerEmail: managerEmail.trim() };
    await onSaveSettings(updated);
    
    // Tự động lưu luôn vào sheet CauHinh trên Google Sheet
    await saveSettingsToGoogleSheets(updated);
    setSaving(false);
    showToast('Đã lưu & đồng bộ cấu hình thành công tới Google Sheets (sheet CauHinh) & Máy chủ!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#002060] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                CẤU HÌNH & HƯỚNG DẪN DÙNG GOOGLE APPS SCRIPT
              </div>
              <h3 className="text-xl font-extrabold text-white">Lưu trữ Dữ liệu vào Google Sheets</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs sm:text-sm">
          {/* Quick Web App URL Tester Bar */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                <Database className="w-4 h-4" />
                <span>Link Google Apps Script Web App URL (doPost/doGet API)</span>
              </label>
              <span className="text-[11px] text-slate-400">Đã kiểm tra CORS proxy</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Dán link Web App dạng: https://script.google.com/macros/s/.../exec"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:ring-2 focus:ring-amber-400 outline-none"
              />

              <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  ) : (
                    <Zap className="w-4 h-4 text-amber-300" />
                  )}
                  <span>Kiểm tra kết nối</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveUrl}
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-amber-300 mb-1">
                📧 Email Cán bộ Quản lý nhận thông báo tự động khi có đề nghị mới:
              </label>
              <input
                type="text"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="Ví dụ: qlts.ninhbinh@vietinbank.vn (Phân cách dấu phẩy nếu nhiều email)"
                className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>

            {(inputUrl.includes('/macros/library/') || inputUrl.includes('/edit')) && (
              <div className="p-3 bg-amber-950/90 border border-amber-500/80 rounded-xl text-amber-200 text-xs space-y-1">
                <div className="font-bold flex items-center space-x-1 text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Cảnh báo: Bạn đang dán link Thư viện (Library) hoặc Editor!</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Đường link <code>/macros/library/...</code> gây ra lỗi <strong>Unexpected token '&lt;'</strong> do Google trả về trang Web HTML thay vì dữ liệu JSON.
                </p>
                <div className="text-[11px] font-semibold text-amber-300 mt-1">
                  👉 Cách khắc phục: Trong giao diện Apps Script &gt; bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Triển khai mới (New deployment)</strong> &gt; Chọn loại <strong>Ứng dụng Web (Web app)</strong> &gt; Quyền: <strong>Bất kỳ ai (Anyone)</strong> &gt; Copy link có đuôi <code>/exec</code>.
                </div>
              </div>
            )}

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                  testResult.success
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-red-950/80 border-red-500/50 text-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Code.gs Copy Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-blue-900" />
                <span>Mã nguồn Google Apps Script (Code.gs)</span>
              </h4>

              <button
                onClick={handleCopyCode}
                className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center space-x-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Đã Copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-300" />
                    <span>Sao chép Mã Code.gs</span>
                  </>
                )}
              </button>
            </div>

            <pre className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl overflow-x-auto max-h-60 border border-slate-800 shadow-inner">
              {GOOGLE_APPS_SCRIPT_CODE}
            </pre>
          </div>

          {/* Step by Step Guide List */}
          <div className="space-y-3">
            <h4 className="font-bold text-gray-900 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Các bước kết nối Google Sheet từng bước</span>
            </h4>

            <div className="space-y-2">
              {INSTRUCTIONS_STEPS.map((s) => (
                <div key={s.step} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#002060] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">{s.title}</h5>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{s.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
