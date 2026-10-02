import React, { useState } from "react";
import { Shield, X, AlertCircle, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AdminSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSetupModal: React.FC<AdminSetupModalProps> = ({ isOpen, onClose }) => {
  const { setupAdmin } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      setIsLoading(false);
      return;
    }

    try {
      await setupAdmin({
        full_name: fullName.trim(),
        phone: phone.trim(),
        student_code: studentCode.trim(),
        password,
        confirm_password: confirmPassword,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "فشل إعداد حساب الإدارة");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">تهيئة حساب الإدارة (Admin)</h2>
              <span className="text-[11px] text-slate-500">إنشاء حساب المشرف الأول للنظام</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-600 font-bold mb-1">اسم المشرف</label>
            <input
              type="text"
              placeholder="مثال: المهندس المشرف"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">الهاتف</label>
              <input
                type="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">كود المشرف / المعرف</label>
              <input
                type="text"
                placeholder="admin"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">كلمة المرور</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">تأكيد كلمة المرور</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            <span>{isLoading ? "جاري الإعداد..." : "إنشاء حساب المشرف والدخول"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
