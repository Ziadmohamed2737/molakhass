import React, { useState, useEffect } from "react";
import {
  Users,
  FileText,
  Activity,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Search,
  FolderOpen,
  Compass,
  Layers,
  Star,
  X,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Subject, PlatformStats } from "../../types";
import { apiRequest } from "../../api/client";
import { SubjectCard } from "./SubjectCard";
import { EmptyState } from "../common/EmptyState";
import { BlueprintIllustration, SpecializationBadgeIcon } from "../common/VisualAssets";

interface StudentHomeProps {
  onSelectSubject: (subject: Subject, initialTab?: "lectures" | "sections" | "sheets" | "quizzes") => void;
  onOpenSearch: () => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({
  onSelectSubject,
  onOpenSearch,
}) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [subjectsData, statsData] = await Promise.all([
        apiRequest<{ subjects: Subject[] }>("/api/subjects"),
        apiRequest<PlatformStats>("/api/stats"),
      ]);

      setSubjects(subjectsData.subjects || []);
      setStats(statsData);
    } catch (err: any) {
      setError("حصل خطأ أثناء تحميل بيانات الصفحة الرئيسية.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFavorite = async (subject: Subject) => {
    const isCurrentlyFav = Number(subject.is_favorite) === 1;
    const currentFavsCount = subjects.filter((s) => Number(s.is_favorite) === 1).length;

    if (!isCurrentlyFav && currentFavsCount >= 3) {
      setToast({
        type: "error",
        text: "الحد الأقصى للمواد المفضلة هو 3 مواد فقط! ألغِ تفضيل مادة أولاً لتفضيل غيرها.",
      });
      setTimeout(() => setToast(null), 4500);
      return;
    }

    // Optimistic UI update: toggle status and move to top
    const nextStatus = isCurrentlyFav ? 0 : 1;
    const updated = subjects.map((s) => {
      if (s.id === subject.id) {
        return { ...s, is_favorite: nextStatus };
      }
      return s;
    });

    // Sort: favorites first, then by creation date
    updated.sort((a, b) => {
      const aFav = Number(a.is_favorite) === 1 ? 1 : 0;
      const bFav = Number(b.is_favorite) === 1 ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setSubjects(updated);

    try {
      const res = await apiRequest<{ is_favorite: number; favorite_count: number; message: string }>(
        `/api/subjects/${subject.id}/favorite`,
        { method: "POST" }
      );
      setToast({
        type: "success",
        text: res.message || (nextStatus === 1 ? "تمت إضافة المادة للمفضلة وظهرت أول الترتيب ⭐" : "تمت إزالة المادة من المفضلة"),
      });
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      // Revert from server on failure
      await loadData();
      setToast({
        type: "error",
        text: err.message || "فشل تعديل حالة المفضلة",
      });
      setTimeout(() => setToast(null), 4500);
    }
  };

  const favoriteCount = subjects.filter((s) => Number(s.is_favorite) === 1).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-12 text-slate-900">
      {/* Modern Academic Hero Cockpit */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 mb-7 shadow-xl border border-slate-800">
        {/* Subtle geometric drafting lines in background */}
        <div className="absolute left-0 top-0 bottom-0 opacity-10 pointer-events-none hidden sm:block">
          <BlueprintIllustration className="w-64 h-64 -translate-y-8" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-500/20 backdrop-blur-xs border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-inner">
              {user?.full_name ? user.full_name.charAt(0) : "ط"}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-indigo-400/20">
                  <SpecializationBadgeIcon specCode={user?.specialization_id} className="w-3.5 h-3.5" />
                  <span>{user?.year_name || "الفرقة الدراسية"}</span>
                  {user?.spec_name && <span>· {user.spec_name}</span>}
                </span>
                <span className="text-[10px] font-mono text-slate-400">#{user?.student_code}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                عاش يا {user?.full_name ? user.full_name.trim().replace(/^(م\.|م\/|د\.|د\/|مهندس\/|دكتور\/)\s*/, "").split(/\s+/)[0] : "بطل"}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                شد حيلك يا هندسة، كل المحاضرات والسكاشن والشيتات هنا علشانك
              </p>
            </div>
          </div>

          {/* Quick Search Launch Bar */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-3 py-2.5 px-4 bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/20 rounded-2xl text-xs text-white transition-all self-stretch sm:self-auto cursor-pointer group"
          >
            <Search className="w-4 h-4 text-indigo-300 group-hover:scale-110 transition-transform" />
            <span className="text-slate-300">دور على أي مادة أو ملف...</span>
            <span className="mr-auto sm:mr-3 text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded-md text-indigo-300">
              بحث
            </span>
          </button>
        </div>
      </div>

      {/* 3 Real Platform Statistics Cards (Visualized with Egyptian labels) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-8">
        {/* Active Users */}
        <div className="relative bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600">زمايلك الأونلاين</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats ? stats.activeUsers : 0}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">فاتحين الموقع دلوقتي</span>
        </div>

        {/* Real Files Count */}
        <div className="relative bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600">الملفات</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats ? stats.totalFiles : 0}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">محاضرة وسكشن وشيت</span>
        </div>

        {/* Total Registered Users */}
        <div className="relative bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600">صحابك اللي في الموقع</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats ? stats.totalUsers : 0}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">مسجلين معاك في الدفعة</span>
        </div>
      </div>

      {/* Toast Notification for Favorite actions */}
      {toast && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all shadow-sm ${
            toast.type === "success"
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : toast.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-indigo-50 text-indigo-900 border-indigo-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <Star className="w-4 h-4 fill-amber-400 text-amber-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer font-normal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Subjects Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  المقررات بتاعتك
                </h2>
                {favoriteCount > 0 && (
                  <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>{favoriteCount} من 3 مفضلة</span>
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {subjects.length > 0
                  ? `${subjects.length} مواد نازلين لفرقتك · المواد المفضلة تظهر أولاً`
                  : "جاري رفع المواد"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {subjects.length > 0 && (
              <button
                onClick={onOpenSearch}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors cursor-pointer py-1.5 px-3 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100"
              >
                <span>دور في المواد</span>
                <ArrowLeft className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-3xl h-48 animate-pulse shadow-xs" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center text-rose-700">
            <p className="text-sm font-semibold mb-3">{error}</p>
            <button
              onClick={loadData}
              className="py-2 px-5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              جرب تاني
            </button>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <EmptyState
              illustration={<BlueprintIllustration className="w-36 h-36" />}
              title="لسه مفيش مواد نزلت لفرقتك يا باشمهندس"
              description="المشرفين والدكاترة بيجهزوا المحاضرات والشيتات وهتنزل هنا أول بأول إن شاء الله."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub) => (
              <SubjectCard
                key={sub.id}
                subject={sub}
                onViewLectures={(s) => onSelectSubject(s, "lectures")}
                onViewAll={(s) => onSelectSubject(s, "lectures")}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
