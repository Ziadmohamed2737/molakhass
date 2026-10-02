import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  GraduationCap,
  X,
  AlertCircle,
  FolderOpen
} from "lucide-react";
import { Subject, Year, Specialization, Term } from "../../types";
import { apiRequest } from "../../api/client";
import { ConfirmModal } from "../common/ConfirmModal";
import { EmptyState } from "../common/EmptyState";

interface AdminSubjectsProps {
  years: Year[];
  specializations: Specialization[];
  terms: Term[];
  onManageSubjectContent?: (subject: Subject) => void;
}

export const AdminSubjects: React.FC<AdminSubjectsProps> = ({
  years,
  specializations,
  terms,
  onManageSubjectContent,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form inputs
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [yearId, setYearId] = useState("prep");
  const [specId, setSpecId] = useState("");
  const [termId, setTermId] = useState("term1");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ subjects: Subject[] }>("/api/subjects?all=1");
      setSubjects(res.subjects || []);
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName("");
    setCode("");
    setDoctorName("");
    setYearId("prep");
    setSpecId("");
    setTermId("term1");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code);
    setDoctorName(sub.doctor_name);
    setYearId(sub.year_id);
    setSpecId(sub.specialization_id || "");
    setTermId(sub.term_id);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    if (yearId !== "prep" && !specId) {
      setFormError("يرجى اختيار التخصص الهندسي لهذه الفرقة");
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        doctor_name: doctorName.trim(),
        year_id: yearId,
        specialization_id: yearId === "prep" ? null : specId,
        term_id: termId,
      };

      if (editingSubject) {
        await apiRequest(`/api/subjects/${editingSubject.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/subjects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      await fetchSubjects();
    } catch (err: any) {
      setFormError(err.message || "حدث خطأ أثناء حفظ المادة");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSubjectStatus = async (sub: Subject) => {
    try {
      await apiRequest(`/api/subjects/${sub.id}/toggle`, { method: "PATCH" });
      await fetchSubjects();
    } catch (err) {
      console.error("Toggle subject status error:", err);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;
    try {
      await apiRequest(`/api/subjects/${deletingSubject.id}`, { method: "DELETE" });
      setDeletingSubject(null);
      await fetchSubjects();
    } catch (err) {
      console.error("Delete subject error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">إدارة المواد والمقررات الدراسية</h2>
          <p className="text-xs text-slate-500">إضافة وتعديل المقررات وتحديد الفرق والتخصصات والأساتذة</p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مادة جديدة</span>
        </button>
      </div>

      {/* Subjects List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">جاري تحميل قائمة المواد...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8">
          <EmptyState
            title="لم يتم إنشاء أي مواد بعد"
            description="ابدأ بإضافة أول مادة دراسية وتحديد الفرقة والتخصص واسم الدكتور المسؤول."
            actionText="إضافة مادة الآن"
            onAction={openCreateModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                sub.is_active === 0 ? "border-slate-200 opacity-60 bg-slate-50" : "border-slate-200/90 hover:border-indigo-200"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase block mb-0.5">
                      {sub.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{sub.name}</h3>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sub.is_active === 1
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {sub.is_active === 1 ? "منشورة" : "مخفية"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 flex-wrap">
                  <span className="font-semibold text-slate-800">د. {sub.doctor_name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{sub.year_name}</span>
                  {sub.spec_name && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-indigo-600 font-medium">{sub.spec_name}</span>
                    </>
                  )}
                  {sub.term_name && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{sub.term_name}</span>
                    </>
                  )}
                </div>

                {/* Content Inventory Counts */}
                <div className="grid grid-cols-4 gap-2 py-2 px-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-center text-xs mb-4">
                  <div>
                    <span className="font-bold block text-slate-900">{sub.lectures_count || 0}</span>
                    <span className="text-[10px] text-slate-400">محاضرة</span>
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900">{sub.sections_count || 0}</span>
                    <span className="text-[10px] text-slate-400">سكشن</span>
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900">{sub.sheets_count || 0}</span>
                    <span className="text-[10px] text-slate-400">شيت</span>
                  </div>
                  <div>
                    <span className="font-bold block text-slate-900">{sub.quizzes_count || 0}</span>
                    <span className="text-[10px] text-slate-400">كويز</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                {onManageSubjectContent && (
                  <button
                    onClick={() => onManageSubjectContent(sub)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>إدارة المحتوى والملفات</span>
                  </button>
                )}

                <div className="flex items-center gap-1 mr-auto">
                  <button
                    onClick={() => toggleSubjectStatus(sub)}
                    title={sub.is_active === 1 ? "إخفاء المادة" : "نشر المادة"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    {sub.is_active === 1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                  </button>
                  <button
                    onClick={() => openEditModal(sub)}
                    title="تعديل المادة"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingSubject(sub)}
                    title="حذف المادة"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-xl text-slate-800">
            <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSubject ? "تعديل بيانات المقرر" : "إضافة مقرر دراسي جديد"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">اسم المادة</label>
                  <input
                    type="text"
                    placeholder="مثال: الرياضيات الهندسية 1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">كود المادة</label>
                  <input
                    type="text"
                    placeholder="MATH101"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono uppercase text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">اسم الدكتور المحاضر</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد مصطفى"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">الفرقة الدراسية</label>
                  <select
                    value={yearId}
                    onChange={(e) => {
                      setYearId(e.target.value);
                      if (e.target.value === "prep") setSpecId("");
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">التخصص</label>
                  <select
                    value={specId}
                    onChange={(e) => setSpecId(e.target.value)}
                    disabled={yearId === "prep"}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden disabled:opacity-40 cursor-pointer"
                  >
                    <option value="">{yearId === "prep" ? "عام (إعدادي)" : "اختر التخصص..."}</option>
                    {specializations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">الترم</label>
                  <select
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-2 px-5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "جاري الحفظ..." : editingSubject ? "حفظ التعديلات" : "إضافة المادة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingSubject}
        title="تأكيد حذف المادة"
        message={`هل أنت متأكد من حذف مقرر "${deletingSubject?.name}"؟ سيتم حذف جميع المحاضرات والسكاشن والشيتات والكويزات والملفات التابعة له نهائياً.`}
        confirmText="نعم، حذف المادة"
        isDanger={true}
        onConfirm={handleDeleteSubject}
        onCancel={() => setDeletingSubject(null)}
      />
    </div>
  );
};
