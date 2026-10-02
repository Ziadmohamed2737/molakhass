import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  HelpCircle,
  Users,
  Upload,
  LogOut,
  Shield,
  Layers,
  Sparkles,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { Subject, Year, Specialization, Term } from "../../types";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { AdminDashboard } from "./AdminDashboard";
import { AdminSubjects } from "./AdminSubjects";
import { AdminContentManager } from "./AdminContentManager";
import { AdminQuizBuilder } from "./AdminQuizBuilder";
import { AdminUsers } from "./AdminUsers";
import { AdminUploadWizard } from "./AdminUploadWizard";
import { Footer } from "../common/Footer";

interface AdminLayoutProps {
  years: Year[];
  specializations: Specialization[];
  terms: Term[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  years,
  specializations,
  terms,
}) => {
  const { user, logout } = useAuth();
  const isModerator = user?.role === "moderator";

  const [activeTab, setActiveTab] = useState<"dashboard" | "subjects" | "content" | "quizzes" | "users">(
    isModerator ? "content" : "dashboard"
  );
  const [isUploadWizardOpen, setIsUploadWizardOpen] = useState(false);
  const [selectedSubjectForContent, setSelectedSubjectForContent] = useState<Subject | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  // Prevent moderator from accessing admin-only tabs
  useEffect(() => {
    if (isModerator && (activeTab === "dashboard" || activeTab === "subjects" || activeTab === "users")) {
      setActiveTab("content");
    }
  }, [isModerator, activeTab]);

  const fetchSubjects = async () => {
    try {
      const res = await apiRequest<{ subjects: Subject[] }>("/api/subjects?all=1");
      setAllSubjects(res.subjects || []);
    } catch (err) {
      console.error("Failed to fetch subjects in admin:", err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [activeTab]);

  const handleManageSubjectContent = (sub: Subject) => {
    setSelectedSubjectForContent(sub);
    setActiveTab("content");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Admin Header - Light Mode & Modern Glassmorphism */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">لوحة إدارة المنصة</span>
                {isModerator ? (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    مشرف محتوى
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    المدير الأساسي
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 block">ملفاتك عندنا - هندسة</span>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-2.5">
            {user && (
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-100/80 border border-slate-200/80 py-1.5 px-3 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  {user.full_name.charAt(0)}
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold block text-slate-800">{user.full_name}</span>
                  <span className="text-[10px] font-mono text-slate-500 block">#{user.student_code}</span>
                </div>
              </div>
            )}

            {/* Quick Upload Button */}
            <button
              onClick={() => setIsUploadWizardOpen(true)}
              className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden xs:inline">رفع محتوى</span>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              title="تسجيل الخروج من لوحة الإدارة"
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-1 border-t border-slate-100">
          {!isModerator && (
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setSelectedSubjectForContent(null);
              }}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>الرئيسية والإحصائيات</span>
            </button>
          )}

          {!isModerator && (
            <button
              onClick={() => {
                setActiveTab("subjects");
                setSelectedSubjectForContent(null);
              }}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "subjects"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>المواد الدراسية</span>
            </button>
          )}

          <button
            onClick={() => {
              if (allSubjects.length > 0 && !selectedSubjectForContent) {
                setSelectedSubjectForContent(allSubjects[0]);
              }
              setActiveTab("content");
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "content"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>المحتوى والملفات</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("quizzes");
              setSelectedSubjectForContent(null);
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "quizzes"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>الكويزات والامتحانات</span>
          </button>

          {!isModerator && (
            <button
              onClick={() => {
                setActiveTab("users");
                setSelectedSubjectForContent(null);
              }}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "users"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>إدارة الطلاب والمشرفين</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Admin Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {!isModerator && activeTab === "dashboard" && (
          <AdminDashboard
            onNavigate={(tab) => {
              setActiveTab(tab as any);
              if (tab === "content" && allSubjects.length > 0) {
                setSelectedSubjectForContent(allSubjects[0]);
              }
            }}
          />
        )}

        {!isModerator && activeTab === "subjects" && (
          <AdminSubjects
            years={years}
            specializations={specializations}
            terms={terms}
            onManageSubjectContent={handleManageSubjectContent}
          />
        )}

        {activeTab === "content" && (
          selectedSubjectForContent ? (
            <AdminContentManager
              subject={selectedSubjectForContent}
              onBack={() => setSelectedSubjectForContent(null)}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                <FolderOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">اختر مادة لإدارة محتواها الأكاديمي</h3>
              <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
                يمكنك الضغط على أي مادة من القائمة التالية لإدارة محاضراتها وسكاشنها وشيتاتها ورفع وتعديل ملفاتها، ومعرفة من قام بإضافتها.
              </p>
              {allSubjects.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-xl mx-auto">
                  {allSubjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubjectForContent(s)}
                      className="py-2 px-4 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {s.code} - {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {activeTab === "quizzes" && (
          <AdminQuizBuilder subjects={allSubjects} />
        )}

        {!isModerator && activeTab === "users" && (
          <AdminUsers years={years} specializations={specializations} />
        )}

        {/* Footer credits in admin - Light Mode */}
        <Footer isDark={false} className="pb-8 pt-6 border-t border-slate-200 mt-12" />
      </main>

      {/* Global Unified Upload Wizard with Auto-Reset */}
      <AdminUploadWizard
        years={years}
        specializations={specializations}
        isOpen={isUploadWizardOpen}
        onClose={() => setIsUploadWizardOpen(false)}
        onSuccess={() => {
          fetchSubjects();
        }}
      />
    </div>
  );
};
