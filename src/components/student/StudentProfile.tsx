import React, { useState, useEffect } from "react";
import {
  Trophy,
  Award,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
  Medal,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/client";
import { SpecializationBadgeIcon } from "../common/VisualAssets";

interface StudentProgressData {
  rank: number;
  totalStudents: number;
  totalPoints: number;
  completedQuizzes: number;
  totalQuizzes: number;
  completionRate: number;
  maxPossiblePoints: number;
}

export const StudentProfile: React.FC = () => {
  const { user, logout } = useAuth();

  // Progress and Ranking state
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    async function fetchProgress() {
      setIsLoadingProgress(true);
      try {
        const data = await apiRequest<StudentProgressData>("/api/auth/progress");
        setProgress(data);
      } catch (err) {
        console.error("Failed to load progress:", err);
      } finally {
        setIsLoadingProgress(false);
      }
    }
    fetchProgress();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPass(true);
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassMsg({ text: "كلمتي السر الجداد مش متطابقين، اتأكد منهم تاني", isError: true });
      setIsChangingPass(false);
      return;
    }

    if (newPassword.length < 6) {
      setPassMsg({ text: "كلمة السر الجديدة مينفعش تقل عن 6 خانات", isError: true });
      setIsChangingPass(false);
      return;
    }

    try {
      await apiRequest("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPassMsg({ text: "زي الفل! تم تغيير كلمة السر بنجاح", isError: false });
    } catch (err: any) {
      setPassMsg({ text: err.message || "حصلت مشكلة أثناء تغيير كلمة السر، اتأكد من كلمتك القديمة", isError: true });
    } finally {
      setIsChangingPass(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-12 text-slate-900">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">الملف الشخصي وإنجازاتك</h1>
        <p className="text-xs text-slate-500">متابعة درجات الكويزات، ترتيبك على الدفعة، وإعدادات حسابك</p>
      </div>

      {/* Identity Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 mb-6 shadow-xs flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center text-2xl font-black flex-shrink-0 shadow-md shadow-indigo-600/30">
          {user.full_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
              #{user.student_code}
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-bold text-slate-700">{user.year_name || "الفرقة الدراسية"}</span>
            {user.spec_name && (
              <>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-indigo-600 font-bold">{user.spec_name}</span>
              </>
            )}
          </div>
          <h2 className="text-lg font-black text-slate-900 truncate">{user.full_name}</h2>
          <span className="text-xs text-slate-500 font-mono block mt-0.5">{user.phone}</span>
        </div>
      </div>

      {/* Leaderboard Rank & Quiz Points Card (الترتيب والدرجات) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 mb-6 shadow-xl border border-slate-800">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20 font-black">
              <Trophy className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 tracking-wider uppercase block">
                تصنيف الموقع والكويزات
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">ترتيبك بين زمايلك</h3>
            </div>
          </div>

          {progress && (
            <div className="text-left bg-white/10 px-3.5 py-1.5 rounded-2xl border border-white/15">
              <span className="text-[10px] text-slate-300 block">المجموع العام</span>
              <span className="text-lg font-black text-white font-mono">
                {Math.round(progress.totalPoints)} <span className="text-xs font-normal text-slate-300">نقطة</span>
              </span>
            </div>
          )}
        </div>

        {/* Big Rank Indicator */}
        {isLoadingProgress ? (
          <div className="py-6 text-center text-xs text-slate-300">جاري حساب ترتيبك الحالي...</div>
        ) : progress ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
                  #{progress.rank}
                </div>
                <div>
                  <span className="text-xs text-amber-300 font-bold block">
                    {progress.rank === 1 ? "ما شاء الله! أنت الأول على الموقع 🔥" : `أنت في المركز رقم ${progress.rank}`}
                  </span>
                  <span className="text-xs text-slate-300">
                    من إجمالي {progress.totalStudents} طالب مسجل في الموقع
                  </span>
                </div>
              </div>

              <div className="text-right sm:text-left pt-2 sm:pt-0 border-t sm:border-0 border-white/10">
                <span className="text-[10px] text-slate-300 block">الكويزات المنجزة</span>
                <span className="text-sm font-bold text-white">
                  {progress.completedQuizzes} من {progress.totalQuizzes} كويز
                </span>
              </div>
            </div>

            {/* Quiz Completion Progress Bar */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>نسبة تقدمك في حل الكويزات:</span>
                </span>
                <span className="font-mono font-black text-white">{progress.completionRate}%</span>
              </div>

              <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-emerald-400 via-indigo-400 to-indigo-500 transition-all duration-700 shadow-sm"
                  style={{ width: `${progress.completionRate}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                <span>
                  {progress.completionRate >= 80
                    ? `عاش يا ${user.full_name ? user.full_name.trim().replace(/^(م\.|م\/|د\.|د\/|مهندس\/|دكتور\/)\s*/, "").split(/\s+/)[0] : "بطل"}! أداء عالي جداً ومتصدر 🔥`
                    : progress.completionRate >= 40
                    ? "مستوى محترم، كمل حل باقي الكويزات علشان تعلي ترتيبك 🚀"
                    : "لسه في كويزات كتير متاحة.. حلها عشان تسبق زمايلك 👏"}
                </span>
                <span className="text-[10px] text-amber-300 font-bold">ترتيبك خاص بيك تماماً</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Change Password Only (No user data edit as requested) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 mb-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm sm:text-base font-black text-slate-900">تغيير كلمة السر</h3>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          تقدر تعدل كلمة السر في أي وقت لحماية حسابك
        </p>

        {passMsg && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold mb-4 flex items-center gap-2.5 ${
              passMsg.isError ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            {passMsg.isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            <span>{passMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">كلمة السر الحالية</label>
            <div className="relative">
              <input
                type={showCurrentPass ? "text" : "password"}
                placeholder="اكتب كلمة السر اللي بتدخل بيها دلوقتي"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-sm text-slate-900 bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">كلمة السر الجديدة</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  placeholder="6 خانات أو أكتر"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-sm text-slate-900 bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">تأكيد كلمة السر الجديدة</label>
              <input
                type={showNewPass ? "text" : "password"}
                placeholder="اكتبها تاني للتأكيد"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden text-sm text-slate-900 bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChangingPass}
            className="py-3 px-6 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {isChangingPass ? "ثواني بنحدث كلمة السر..." : "تحديث كلمة السر"}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div className="pt-2 text-center">
        <button
          onClick={logout}
          className="w-full py-3 px-4 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج من الحساب</span>
        </button>
      </div>
    </div>
  );
};
