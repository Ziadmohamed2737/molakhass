import React, { useState } from "react";
import { BookOpen, UserPlus, AlertCircle, User, Phone, KeyRound, Shield, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { SpecializationBadgeIcon } from "../common/VisualAssets";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, years, specializations } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [yearId, setYearId] = useState("prep");
  const [specId, setSpecId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate and Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Client-side validations
    const codeClean = studentCode.trim();
    const codeRegex = /^20\d{6}$/;
    if (!codeRegex.test(codeClean)) {
      setError("كود الطالب يجب أن يكون 8 أرقام بالضبط ويبدأ بـ 20 (مثال: 20240101)");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام");
      setIsLoading(false);
      return;
    }

    if (yearId !== "prep" && !specId) {
      setError("يرجى اختيار التخصص الهندسي للفرقة المختارة");
      setIsLoading(false);
      return;
    }

    try {
      await register({
        full_name: fullName.trim(),
        phone: phone.trim(),
        student_code: codeClean,
        password,
        confirm_password: confirmPassword,
        year_id: yearId,
        specialization_id: yearId === "prep" ? null : specId,
      });
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setIsLoading(false);
    }
  };

  const isPrepYear = yearId === "prep";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900 py-8 font-['Cairo',sans-serif]">
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            إنشاء حساب طالب جديد
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سجل بياناتك للوصول إلى المحاضرات والسكاشن والشيتات والكويزات
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              الاسم بالكامل
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="اكتب اسمك ثلاثياً أو رباعياً"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full pl-3 pr-10 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-xs sm:text-sm text-slate-900 bg-white transition-colors"
              />
            </div>
          </div>

          {/* Phone & Student Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                رقم الهاتف
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full pl-3 pr-10 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-xs sm:text-sm text-slate-900 bg-white font-mono transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                كود الطالب (8 أرقام يبدأ بـ 20)
              </label>
              <div className="relative">
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-600 font-mono text-sm font-bold">#</span>
                <input
                  type="text"
                  maxLength={8}
                  inputMode="numeric"
                  placeholder="20XXXXXX"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  required
                  className="w-full pl-3 pr-9 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-xs sm:text-sm font-mono text-slate-900 bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Academic Year Selection */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              الفرقة الدراسية
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-2xl">
              {years.map((y) => (
                <button
                  key={y.id}
                  type="button"
                  onClick={() => {
                    setYearId(y.id);
                    if (y.id === "prep") setSpecId("");
                  }}
                  className={`py-2 px-1 text-center rounded-xl font-bold transition-all text-xs cursor-pointer ${
                    yearId === y.id
                      ? "bg-white text-indigo-600 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  {y.name}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Specialization Selection: Only if not prep */}
          {!isPrepYear && (
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                التخصص الهندسي
              </label>
              <div className="grid grid-cols-3 gap-2">
                {specializations.map((s) => {
                  const isSelected = specId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSpecId(s.id)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs font-bold"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <SpecializationBadgeIcon
                        specCode={s.code}
                        className={`w-6 h-6 ${isSelected ? "text-indigo-600" : "text-slate-400"}`}
                      />
                      <span className="font-bold text-xs">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                كلمة المرور
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-xs sm:text-sm text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-xs sm:text-sm text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isLoading ? "جاري إنشاء الحساب..." : "إنشاء الحساب الآن"}</span>
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            لديك حساب بالفعل؟{" "}
            <button
              onClick={onSwitchToLogin}
              className="text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
