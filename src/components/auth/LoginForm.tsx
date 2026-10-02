import React, { useState } from "react";
import { LogIn, AlertCircle, Shield, KeyRound, Hash, Eye, EyeOff, BookOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { BlueprintIllustration } from "../common/VisualAssets";

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onOpenAdminSetup?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onOpenAdminSetup,
}) => {
  const { login, hasAdmin } = useAuth();
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(studentCode.trim(), password);
    } catch (err: any) {
      setError(err.message || "كود الطالب أو كلمة المرور غير صحيحة");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900 relative overflow-hidden font-['Cairo',sans-serif]">
      {/* Background architectural geometry */}
      <div className="absolute top-10 left-10 opacity-5 pointer-events-none hidden md:block">
        <BlueprintIllustration className="w-80 h-80" />
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ملفاتك عندنا
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">
            هنا هتلاقي كل الملفات الي محتاجها ان شاء الله
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              كود الطالب بتاعك
            </label>
            <div className="relative">
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-600 font-mono text-sm font-bold">#</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="20XXXXXX"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                required
                className="w-full pl-3 pr-9 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-sm font-mono text-slate-900 bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              كلمة السر
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-9 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-sm text-slate-900 bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? "ثانية واحدة بنشوف بياناتك..." : "ادخل على حسابك"}</span>
          </button>
        </form>

        {/* Switch to Register */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            جديد معانا ولسه معندكش حساب؟{" "}
            <button
              onClick={onSwitchToRegister}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              اعمل حسابك دلوقتي
            </button>
          </p>
        </div>

        {/* Admin Setup if needed */}
        {!hasAdmin && (
          <div className="mt-4 text-center">
            <button
              onClick={onOpenAdminSetup}
              className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto bg-indigo-50 py-1.5 px-3 rounded-xl border border-indigo-100 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>تهيئة حساب الإدارة (Admin Setup)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
