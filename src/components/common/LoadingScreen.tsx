import React from "react";
import { BookOpen, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

interface LoadingScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-['Cairo',sans-serif]">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Modern Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
          <BookOpen className="w-8 h-8" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mb-1.5">
          ارزقنا بالحلال يارب
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mb-8 font-bold">
          احنا هنا علشان نذاكر ونبطل مرقعة
        </p>

        {error ? (
          <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-rose-700 mb-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">تعذر الاتصال بقاعدة البيانات</span>
            </div>
            <p className="text-xs text-rose-600 mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full py-2.5 px-4 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-medium">جاري تهيئة النظام والتحقق من الجلسة...</span>
          </div>
        )}
      </div>
    </div>
  );
};
