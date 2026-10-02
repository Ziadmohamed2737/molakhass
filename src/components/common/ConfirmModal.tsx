import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDestructive = false,
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isWarningDanger = isDestructive || isDanger;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isWarningDanger ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-6 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`py-2.5 px-5 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isWarningDanger
                ? "bg-rose-600 hover:bg-rose-700 active:scale-95"
                : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
