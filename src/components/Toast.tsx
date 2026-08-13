import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  let bgColor = 'bg-slate-900 border-slate-700 text-white';
  let Icon = Info;

  if (type === 'success') {
    bgColor = 'bg-emerald-900/95 border-emerald-500 text-emerald-100';
    Icon = CheckCircle2;
  } else if (type === 'error') {
    bgColor = 'bg-red-900/95 border-red-500 text-red-100';
    Icon = AlertCircle;
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border max-w-md flex items-center space-x-3 backdrop-blur animate-slideUp ${bgColor}`}>
      <Icon className="w-6 h-6 shrink-0" />
      <div className="text-xs sm:text-sm font-semibold flex-1">{message}</div>
      <button onClick={onClose} className="p-1 hover:opacity-75 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
