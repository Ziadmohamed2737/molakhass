import React, { useState, useEffect } from "react";
import {
  Upload,
  BookOpen,
  Layers,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  File,
  FileImage,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { Subject, Year, Specialization, Lecture, Section, Sheet } from "../../types";
import { apiRequest } from "../../api/client";

interface AdminUploadWizardProps {
  years: Year[];
  specializations: Specialization[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminUploadWizard: React.FC<AdminUploadWizardProps> = ({
  years,
  specializations,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Step navigation (1: Taxonomy & Subject, 2: Content Item, 3: Files & Ordering)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isUploadedSuccess, setIsUploadedSuccess] = useState(false);

  // Selections
  const [selectedYearId, setSelectedYearId] = useState<string>("prep");
  const [selectedSpecId, setSelectedSpecId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [contentType, setContentType] = useState<"lecture" | "section" | "sheet">("lecture");

  // Step 2 items: either pick existing or create new
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  // New item fields
  const [newItemNumber, setNewItemNumber] = useState<number>(1);
  const [newItemTitle, setNewItemTitle] = useState<string>("");
  const [newItemDescription, setNewItemDescription] = useState<string>("");

  // Step 3 file uploads
  const [filesToUpload, setFilesToUpload] = useState<Array<{
    file: File;
    displayName: string;
    sortOrder: number;
  }>>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Complete reset to Step 1 whenever requested or modal is opened
  const resetWizard = () => {
    setStep(1);
    setIsUploadedSuccess(false);
    setFilesToUpload([]);
    setNewItemTitle("");
    setNewItemDescription("");
    setSelectedItemId("");
    setMode("new");
    setError(null);
  };

  // Reset when opening modal so it always starts from Step 1
  useEffect(() => {
    if (isOpen) {
      resetWizard();
    }
  }, [isOpen]);

  // Fetch subjects whenever year or spec changes
  useEffect(() => {
    if (!isOpen) return;
    async function loadSubjects() {
      try {
        let url = `/api/subjects?year_id=${selectedYearId}`;
        if (selectedYearId !== "prep" && selectedSpecId) {
          url += `&specialization_id=${selectedSpecId}`;
        }
        const res = await apiRequest<{ subjects: Subject[] }>(url);
        setSubjects(res.subjects || []);
        if (res.subjects && res.subjects.length > 0) {
          setSelectedSubjectId(res.subjects[0].id);
        } else {
          setSelectedSubjectId("");
        }
      } catch (err) {
        console.error("Failed to load subjects:", err);
      }
    }
    loadSubjects();
  }, [isOpen, selectedYearId, selectedSpecId]);

  // Load existing items when subject or type changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setExistingItems([]);
      return;
    }

    async function loadExistingItems() {
      try {
        let endpoint = "";
        if (contentType === "lecture") {
          endpoint = `/api/content/subjects/${selectedSubjectId}/lectures`;
          const res = await apiRequest<{ lectures: Lecture[] }>(endpoint);
          setExistingItems(res.lectures || []);
          setNewItemNumber((res.lectures?.length || 0) + 1);
          setNewItemTitle(`المحاضرة ${(res.lectures?.length || 0) + 1}`);
        } else if (contentType === "section") {
          endpoint = `/api/content/subjects/${selectedSubjectId}/sections`;
          const res = await apiRequest<{ sections: Section[] }>(endpoint);
          setExistingItems(res.sections || []);
          setNewItemNumber((res.sections?.length || 0) + 1);
          setNewItemTitle(`السكشن ${(res.sections?.length || 0) + 1}`);
        } else if (contentType === "sheet") {
          endpoint = `/api/content/subjects/${selectedSubjectId}/sheets`;
          const res = await apiRequest<{ sheets: Sheet[] }>(endpoint);
          setExistingItems(res.sheets || []);
          setNewItemTitle(`شيت ${(res.sheets?.length || 0) + 1}`);
        }
      } catch (err) {
        console.error("Failed to load items:", err);
      }
    }

    loadExistingItems();
  }, [selectedSubjectId, contentType]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);

    const newEntries = selected.map((file, idx) => ({
      file,
      displayName: file.name.replace(/\.[^/.]+$/, ""),
      sortOrder: filesToUpload.length + idx + 1,
    }));

    setFilesToUpload(prev => [...prev, ...newEntries]);
  };

  const removeFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateDisplayName = (index: number, val: string) => {
    setFilesToUpload(prev => {
      const copy = [...prev];
      copy[index].displayName = val;
      return copy;
    });
  };

  const updateSortOrder = (index: number, val: number) => {
    setFilesToUpload(prev => {
      const copy = [...prev];
      copy[index].sortOrder = val;
      return copy;
    });
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let targetItemId = selectedItemId;

      // 1. Create item if mode === 'new'
      if (mode === "new") {
        if (!newItemTitle.trim()) {
          throw new Error("يرجى كتابة عنوان العنصر الجديد");
        }

        if (contentType === "lecture") {
          const res = await apiRequest<{ lectureId: string }>("/api/content/lectures", {
            method: "POST",
            body: JSON.stringify({
              subject_id: selectedSubjectId,
              lecture_number: newItemNumber,
              title: newItemTitle.trim(),
              description: newItemDescription.trim() || null,
              is_published: 1,
            }),
          });
          targetItemId = res.lectureId;
        } else if (contentType === "section") {
          const res = await apiRequest<{ sectionId: string }>("/api/content/sections", {
            method: "POST",
            body: JSON.stringify({
              subject_id: selectedSubjectId,
              section_number: newItemNumber,
              title: newItemTitle.trim(),
              description: newItemDescription.trim() || null,
              is_published: 1,
            }),
          });
          targetItemId = res.sectionId;
        } else if (contentType === "sheet") {
          const res = await apiRequest<{ sheetId: string }>("/api/content/sheets", {
            method: "POST",
            body: JSON.stringify({
              subject_id: selectedSubjectId,
              title: newItemTitle.trim(),
              description: newItemDescription.trim() || null,
              is_published: 1,
            }),
          });
          targetItemId = res.sheetId;
        }
      }

      // 2. Upload files if any selected
      if (filesToUpload.length > 0 && targetItemId) {
        const formData = new FormData();
        formData.append("subject_id", selectedSubjectId);
        if (contentType === "lecture") formData.append("lecture_id", targetItemId);
        if (contentType === "section") formData.append("section_id", targetItemId);
        if (contentType === "sheet") formData.append("sheet_id", targetItemId);

        filesToUpload.forEach((item) => {
          formData.append("files", item.file);
        });

        formData.append("display_names", JSON.stringify(filesToUpload.map(f => f.displayName)));
        formData.append("sort_orders", JSON.stringify(filesToUpload.map(f => f.sortOrder)));

        await apiRequest("/api/content/upload", {
          method: "POST",
          body: formData,
        });
      }

      // Mark success & notify parent
      onSuccess();
      setIsUploadedSuccess(true);
    } catch (err: any) {
      setError(err.message || "فشل إتمام رفع المحتوى");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200/90 w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">رفع محتوى أكاديمي</h2>
              <span className="text-[11px] text-slate-500">
                الخطوة {step} من 3: {step === 1 ? "اختيار المادة والنوع" : step === 2 ? "تحديد المحتوى" : "رفع وترتيب الملفات"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={resetWizard}
              title="إعادة تعيين الخطوات من البداية"
              className="py-1 px-2.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة للبداية</span>
            </button>
            <button
              onClick={() => {
                resetWizard();
                onClose();
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Progression Bar */}
        {!isUploadedSuccess && (
          <div className="flex items-center gap-2 pt-3 pb-1 flex-shrink-0">
            <div
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step >= 1 ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step >= 2 ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step >= 3 ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
          </div>
        )}

        {error && (
          <div className="my-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* If Upload Succeeded: Success & Reset Screen */}
        {isUploadedSuccess ? (
          <div className="py-12 px-4 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">تم رفع المحتوى وتحديث المواد بنجاح!</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              تم نشر المحتوى وأصبح متاحاً للطلاب فوراً. تم إعادة ضبط الخطوات لتتمكن من رفع عنصر آخر بسهولة.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetWizard}
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>رفع محتوى إضافي (العودة للبداية)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetWizard();
                  onClose();
                }}
                className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        ) : (
          /* Wizard Body Container */
          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
            {/* STEP 1: Academic Taxonomy & Subject Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">1. الفرقة الدراسية</label>
                    <select
                      value={selectedYearId}
                      onChange={(e) => {
                        setSelectedYearId(e.target.value);
                        if (e.target.value === "prep") setSelectedSpecId("");
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden bg-white"
                    >
                      {years.map((y) => (
                        <option key={y.id} value={y.id}>{y.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedYearId !== "prep" ? (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">2. التخصص الهندسي</label>
                      <select
                        value={selectedSpecId}
                        onChange={(e) => setSelectedSpecId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden bg-white"
                      >
                        <option value="">جميع التخصصات / اختر...</option>
                        {specializations.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-end">
                      <span className="text-[11px] text-slate-500 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        إعدادي هندسة عام (بدون تخصص)
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">3. اختر المادة الدراسية</label>
                  {subjects.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-center">
                      لا توجد مواد مضافة لهذه الفرقة والتخصص. يرجى إنشاء مادة أولاً من تبويب المواد.
                    </div>
                  ) : (
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden bg-white text-sm font-semibold"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code} - {sub.name} (د. {sub.doctor_name})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-2">4. نوع المحتوى المراد رفعه</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setContentType("lecture")}
                      className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        contentType === "lecture"
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs font-bold"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <BookOpen className={`w-5 h-5 ${contentType === "lecture" ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>محاضرة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContentType("section")}
                      className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        contentType === "section"
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs font-bold"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <Layers className={`w-5 h-5 ${contentType === "section" ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>سكشن</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContentType("sheet")}
                      className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        contentType === "sheet"
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs font-bold"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <FileText className={`w-5 h-5 ${contentType === "sheet" ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>شيت</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Choose Existing or Create New */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMode("new")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      mode === "new" ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    إنشاء {contentType === "lecture" ? "محاضرة جديدة" : contentType === "section" ? "سكشن جديد" : "شيت جديد"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("existing")}
                    disabled={existingItems.length === 0}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      mode === "existing"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
                    }`}
                  >
                    اختيار عنصر موجود ({existingItems.length})
                  </button>
                </div>

                {mode === "existing" ? (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اختر من القائمة</label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 bg-white text-sm"
                    >
                      <option value="">اختر...</option>
                      {existingItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {contentType === "lecture"
                            ? `محاضرة ${item.lecture_number}: ${item.title}`
                            : contentType === "section"
                            ? `سكشن ${item.section_number}: ${item.title}`
                            : item.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    {contentType !== "sheet" && (
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          رقم {contentType === "lecture" ? "المحاضرة" : "السكشن"}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={newItemNumber}
                          onChange={(e) => setNewItemNumber(parseInt(e.target.value, 10) || 1)}
                          required
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        عنوان {contentType === "lecture" ? "المحاضرة" : contentType === "section" ? "السكشن" : "الشيت"}
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: مقدمة في الدوائر الكهربية"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">وصف أو ملاحظات (اختياري)</label>
                      <textarea
                        rows={2}
                        placeholder="ملاحظات توضيحية للطلاب..."
                        value={newItemDescription}
                        onChange={(e) => setNewItemDescription(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: File Uploads, Display Names & Sort Order */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors bg-indigo-50/20">
                  <input
                    type="file"
                    id="wizard-file-input"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="wizard-file-input" className="cursor-pointer block">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 block">
                      اضغط هنا لاختيار الملفات أو الصور
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      يُسمح بملفات PDF والصور (JPG, PNG, WEBP) بحد أقصى 50MB للملف
                    </span>
                  </label>
                </div>

                {filesToUpload.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-slate-600 font-bold text-[11px]">
                      <span>الملفات المحددة ({filesToUpload.length}):</span>
                      <span>حدد اسم العرض وترتيب الظهور للطالب</span>
                    </div>

                    {filesToUpload.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            {item.file.type === "application/pdf" ? (
                              <File className="w-4 h-4 text-rose-600" />
                            ) : (
                              <FileImage className="w-4 h-4 text-indigo-600" />
                            )}
                          </div>

                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="text-[9px] text-slate-400 block">اسم العرض للطالب</label>
                              <input
                                type="text"
                                value={item.displayName}
                                onChange={(e) => updateDisplayName(idx, e.target.value)}
                                placeholder="مثال: بورد 1"
                                className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block">الترتيب</label>
                              <input
                                type="number"
                                min={1}
                                value={item.sortOrder}
                                onChange={(e) => updateSortOrder(idx, parseInt(e.target.value, 10) || 1)}
                                className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Controls */}
        {!isUploadedSuccess && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetWizard();
                  onClose();
                }}
                className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  disabled={!selectedSubjectId}
                  onClick={() => {
                    if (step === 2 && mode === "existing" && !selectedItemId) {
                      setError("يرجى اختيار عنصر موجود أولاً");
                      return;
                    }
                    setError(null);
                    setStep((prev) => (prev + 1) as any);
                  }}
                  className="py-2 px-5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/20"
                >
                  <span>التالي</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleFinalSubmit}
                  className="py-2 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isLoading ? "جاري الرفع والحفظ..." : "حفظ ونشر المحتوى"}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
