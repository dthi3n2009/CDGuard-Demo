import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyle = () => {
    switch (type) {
      case 'danger':
        return { bg: 'bg-red-600', text: 'text-white', icon: AlertTriangle };
      case 'warning':
        return { bg: 'bg-amber-500', text: 'text-slate-950 font-bold', icon: AlertTriangle };
      case 'success':
        return { bg: 'bg-[#2D7D46]', text: 'text-white', icon: CheckCircle };
      default:
        return { bg: 'bg-slate-800', text: 'text-white', icon: Info };
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <div className={`fixed top-16 right-4 left-4 sm:left-auto sm:max-w-md z-50 p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 transition-all ${style.bg} ${style.text}`}>
      <div className="flex items-center gap-2.5">
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-xs leading-tight">{message}</span>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-black/10 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
