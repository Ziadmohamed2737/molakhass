import React, { useState, useEffect } from "react";
import {
  Users,
  FileText,
  Activity,
  BookOpen,
  Layers,
  HelpCircle,
  Upload,
  PlusCircle,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "../../api/client";
import { ConfirmModal } from "../common/ConfirmModal";

interface AdminDashboardProps {
  onOpenUploadWizard?: () => void;
  onNavigateTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
}

interface DashboardData {
  counts: {
    totalUsers: number;
    activeUsers: number;
    totalFiles: number;
    totalSubjects: number;
    totalLectures: number;
    totalSections: number;
    totalSheets: number;
    totalQuizzes: number;
  };
  recentUsers: any[];
  recentAttempts: any[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenUploadWizard,
  onNavigateTab,
  onNavigate
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleTabChange = onNavigateTab || onNavigate || (() => {});

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<DashboardData>("/api/admin/dashboard-stats");
      setData(res);
    } catch (err: any) {
      console.error("Dashboard stats error:", err);
      setError("فشل تحميل إحصائيات لوحة التحكم");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await apiRequest("/api/admin/reset-database", { method: "POST" });
      setIsResetModalOpen(false);
      await fetchStats();
      setNotification({ type: "success", text: "تم تصفير البيانات بنجاح وبدء المنصة من جديد تماماً!" });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "فشل تصفير البيانات" });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">جاري حساب الإحصائيات من قاعدة البيانات...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700">
        <p className="text-sm font-bold mb-3">{error || "تعذر جلب البيانات"}</p>
        <button
          onClick={fetchStats}
          className="py-2 px-4 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-indigo-700 cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { counts, recentUsers, recentAttempts } = data;

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer font-normal"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner with "رفع محتوى" Primary Action */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600">لوحة إدارة النظام الأكاديمي</span>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              متصل ومحدث
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            نظرة عامة على البيانات الحقيقية
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            جميع الإحصائيات والأرقام المعروضة محسوبة ومسترجعة مباشرة من قاعدة البيانات الفعلية.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onOpenUploadWizard && (
            <button
              onClick={onOpenUploadWizard}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>رفع محتوى أكاديمي</span>
            </button>
          )}

          <button
            onClick={() => setIsResetModalOpen(true)}
            title="تصفير وحذف جميع المواد والملفات والكويزات والبدء من جديد"
            className="py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 active:scale-95 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تصفير البيانات (من الأول)</span>
          </button>
        </div>
      </div>

      {/* Real Statistics Grid (8 Metrics directly from DB) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-right shadow-2xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">إجمالي المستخدمين</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.totalUsers}</div>
          <span className="text-[10px] text-slate-400 block mt-1">طالب ومشرف</span>
        </div>

        {/* Active Users */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-right shadow-2xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">نشطون الآن</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{counts.activeUsers}</div>
          <span className="text-[10px] text-slate-400 block mt-1">خلال آخر 5 دقائق</span>
        </div>

        {/* Subjects */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-right shadow-2xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">عدد المواد</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.totalSubjects}</div>
          <span className="text-[10px] text-slate-400 block mt-1">مادة نشطة</span>
        </div>

        {/* Files */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-right shadow-2xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">عدد الملفات</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.totalFiles}</div>
          <span className="text-[10px] text-slate-400 block mt-1">مستند وصورة مرفوعة</span>
        </div>

        {/* Lectures */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-right shadow-2xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">عدد المحاضرات</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.totalLectures}</div>
          <span className="text-[10px] text-slate-400 block mt-1">محاضرة منشورة</span>
        </div>

        {/* Sections */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-right shadow-2xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">عدد السكاشن</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.totalSections}</div>
          <span className="text-[10px] text-slate-400 block mt-1">سكشن منشور</span>
        </div>

        {/* Sheets */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-right shadow-2xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">عدد الشيتات</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.totalSheets}</div>
          <span className="text-[10px] text-slate-400 block mt-1">شيت وتكليف</span>
        </div>

        {/* Quizzes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-right shadow-2xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">عدد الكويزات</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.totalQuizzes}</div>
          <span className="text-[10px] text-slate-400 block mt-1">اختبار إلكتروني</span>
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Registered Students */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">آخر الطلاب المسجلين</h3>
            <button
              onClick={() => handleTabChange("users")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>عرض كل الطلاب</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentUsers.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">لا يوجد مستخدمون مسجلون بعد.</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u: any) => (
                <div
                  key={u.id}
                  className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {u.full_name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-800 block truncate">{u.full_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">#{u.student_code} · {u.year_name || "إعدادي"}</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("ar-EG") : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quiz Attempts */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">آخر تسليمات الكويزات</h3>
            <button
              onClick={() => handleTabChange("quizzes")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>بنك الكويزات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentAttempts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">لم يقم أي طالب بتسليم كويز حتى الآن.</p>
          ) : (
            <div className="space-y-2">
              {recentAttempts.map((a: any) => (
                <div
                  key={a.id}
                  className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">{a.student_name}</span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {a.quiz_title} ({a.subject_name})
                    </span>
                  </div>

                  <div className="text-left flex-shrink-0">
                    <span className="text-xs font-black text-emerald-600 block font-mono">
                      {Math.round(Number(a.percentage))}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {Math.round(Number(a.score))} درجة
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reset Database Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="تصفير المنصة بالكامل والبدء من جديد"
        message="تحذير هام: سيتم مسح جميع المواد والمحاضرات والسكاشن والشيتات والكويزات والملفات المرفقة وحسابات الطلاب والمشرفين نهائياً، وإعادة المنصة فارغة وجديدة كما في البداية مع الإبقاء فقط على حساب المدير الأساسي (20250000). هل أنت متأكد تماماً من المتابعة؟"
        confirmText={isResetting ? "جاري التصفير..." : "نعم، امسح كل شيء وابدأ من جديد"}
        cancelText="إلغاء وتراجع"
        isDanger={true}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
