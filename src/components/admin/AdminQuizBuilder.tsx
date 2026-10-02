import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Award,
  CheckCircle2,
  Image as ImageIcon,
  Check,
  Eye,
  X,
  AlertCircle,
  User,
  Shield,
  Sparkles
} from "lucide-react";
import { Quiz, QuizQuestion, Subject } from "../../types";
import { apiRequest } from "../../api/client";
import { ConfirmModal } from "../common/ConfirmModal";
import { EmptyState } from "../common/EmptyState";

interface AdminQuizBuilderProps {
  subjects: Subject[];
}

export const AdminQuizBuilder: React.FC<AdminQuizBuilderProps> = ({ subjects }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Active quiz being managed/viewed
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Create/Edit Quiz Modal
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [durationMins, setDurationMins] = useState(10);
  const [totalPoints, setTotalPoints] = useState(100);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [showAnswers, setShowAnswers] = useState(1);
  const [allowBackNav, setAllowBackNav] = useState(1);
  const [isPublished, setIsPublished] = useState(0);
  const [modalSubjectId, setModalSubjectId] = useState("");
  const [quizModalError, setQuizModalError] = useState<string | null>(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  // Add Question Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [qText, setQText] = useState("");
  const [qImage, setQImage] = useState<string | null>(null);
  const [qPoints, setQPoints] = useState(1);
  const [correctOption, setCorrectOption] = useState<"A" | "B" | "C" | "D">("A");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [questionModalError, setQuestionModalError] = useState<string | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: "quiz" | "question"; id: string; name: string } | null>(null);
  const [builderNotification, setBuilderNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchQuizzes = async () => {
    setIsLoading(true);
    try {
      if (!selectedSubjectId && subjects.length > 0) {
        setSelectedSubjectId(subjects[0].id);
      }
      const sId = selectedSubjectId || (subjects[0]?.id || "");
      if (sId) {
        const res = await apiRequest<{ quizzes: Quiz[] }>(`/api/quizzes/subjects/${sId}`);
        setQuizzes(res.quizzes || []);
      }
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [selectedSubjectId, subjects]);

  const loadQuestions = async (quizId: string) => {
    setIsLoadingQuestions(true);
    try {
      const res = await apiRequest<{ quiz: Quiz; questions: QuizQuestion[] }>(`/api/quizzes/${quizId}`);
      setActiveQuiz(res.quiz);
      setQuestions(res.questions || []);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleOpenCreateQuiz = () => {
    setQuizTitle("");
    setQuizDesc("");
    setDurationMins(10);
    setTotalPoints(100);
    setMaxAttempts(1);
    setShowAnswers(1);
    setAllowBackNav(1);
    setIsPublished(0);
    setModalSubjectId(selectedSubjectId || subjects[0]?.id || "");
    setQuizModalError(null);
    setIsQuizModalOpen(true);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingQuiz(true);
    setQuizModalError(null);

    try {
      await apiRequest("/api/quizzes", {
        method: "POST",
        body: JSON.stringify({
          subject_id: modalSubjectId,
          title: quizTitle.trim(),
          description: quizDesc.trim() || null,
          duration_seconds: durationMins * 60,
          total_points: totalPoints,
          max_attempts: maxAttempts,
          show_answers: showAnswers,
          allow_back_navigation: allowBackNav,
          is_published: isPublished,
        }),
      });

      setIsQuizModalOpen(false);
      await fetchQuizzes();
    } catch (err: any) {
      setQuizModalError(err.message || "فشل إنشاء الكويز");
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleTogglePublish = async (quiz: Quiz) => {
    try {
      const nextStatus = quiz.is_published === 1 ? 0 : 1;
      await apiRequest(`/api/quizzes/${quiz.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description,
          duration_seconds: quiz.duration_seconds,
          total_points: quiz.total_points,
          max_attempts: quiz.max_attempts,
          show_answers: quiz.show_answers,
          allow_back_navigation: quiz.allow_back_navigation,
          is_published: nextStatus,
        }),
      });

      await fetchQuizzes();
      if (activeQuiz && activeQuiz.id === quiz.id) {
        await loadQuestions(quiz.id);
      }
      setBuilderNotification({ type: "success", text: nextStatus === 1 ? "تم نشر الكويز بنجاح" : "تم إلغاء نشر الكويز" });
      setTimeout(() => setBuilderNotification(null), 3000);
    } catch (err: any) {
      setBuilderNotification({ type: "error", text: err.message || "لا يمكن تغيير حالة النشر" });
      setTimeout(() => setBuilderNotification(null), 4000);
    }
  };

  const handleUploadQuestionImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);

    setIsUploadingMedia(true);
    setQuestionModalError(null);
    try {
      const res = await apiRequest<{ url: string }>("/api/quizzes/upload-media", {
        method: "POST",
        body: formData,
      });
      setQImage(res.url);
    } catch (err: any) {
      setQuestionModalError(err.message || "فشل رفع صورة السؤال");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    setIsSavingQuestion(true);
    setQuestionModalError(null);

    if (!qText.trim() && !qImage) {
      setQuestionModalError("يجب إدخال نص السؤال أو صورة له");
      setIsSavingQuestion(false);
      return;
    }

    if (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      setQuestionModalError("يجب ملء جميع الخيارات الأربعة (A, B, C, D)");
      setIsSavingQuestion(false);
      return;
    }

    try {
      await apiRequest(`/api/quizzes/${activeQuiz.id}/questions`, {
        method: "POST",
        body: JSON.stringify({
          question_text: qText.trim(),
          question_image: qImage,
          correct_option: correctOption,
          points: qPoints,
          options: [
            { option_key: "A", option_text: optA.trim(), option_image: null },
            { option_key: "B", option_text: optB.trim(), option_image: null },
            { option_key: "C", option_text: optC.trim(), option_image: null },
            { option_key: "D", option_text: optD.trim(), option_image: null },
          ],
        }),
      });

      setIsQuestionModalOpen(false);
      setQText("");
      setQImage(null);
      setOptA("");
      setOptB("");
      setOptC("");
      setOptD("");
      await loadQuestions(activeQuiz.id);
      await fetchQuizzes();
    } catch (err: any) {
      setQuestionModalError(err.message || "فشل حفظ السؤال");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "quiz") {
        await apiRequest(`/api/quizzes/${deleteTarget.id}`, { method: "DELETE" });
        if (activeQuiz && activeQuiz.id === deleteTarget.id) {
          setActiveQuiz(null);
          setQuestions([]);
        }
        await fetchQuizzes();
      } else if (deleteTarget.type === "question" && activeQuiz) {
        await apiRequest(`/api/quizzes/questions/${deleteTarget.id}`, { method: "DELETE" });
        await loadQuestions(activeQuiz.id);
        await fetchQuizzes();
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {builderNotification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
            builderNotification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{builderNotification.text}</span>
          <button
            onClick={() => setBuilderNotification(null)}
            className="text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer font-normal"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            بنك الكويزات والامتحانات الإلكترونية
          </h2>
          <p className="text-xs text-slate-500">
            إنشاء الكويزات، ضبط التوقيت وعدد المحاولات، وإدارة أسئلة الاختيار من متعدد مع صور الشرح وتتبع من أضاف كل كويز.
          </p>
        </div>

        <button
          onClick={handleOpenCreateQuiz}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء كويز جديد</span>
        </button>
      </div>

      {/* Select Subject Selector */}
      {subjects.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">عرض كويزات مادة:</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setActiveQuiz(null);
              setQuestions([]);
            }}
            className="p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium text-slate-800 flex-1 focus:border-indigo-500 focus:bg-white focus:outline-hidden cursor-pointer"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name} ({s.year_name || "إعدادي"})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Grid: Quizzes list & Questions editor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quizzes List */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 mb-2">الكويزات المتاحة للمادة</h3>

          {isLoading ? (
            <p className="text-xs text-slate-400 py-6 text-center">جاري التحميل...</p>
          ) : quizzes.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">لا توجد كويزات مضافة لهذه المادة بعد.</p>
          ) : (
            <div className="space-y-2">
              {quizzes.map((q) => {
                const isSelected = activeQuiz?.id === q.id;
                const creatorLabel = q.creator_name || "المدير الأساسي";
                const isMod = q.creator_role === "moderator";

                return (
                  <div
                    key={q.id}
                    onClick={() => loadQuestions(q.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-xs flex flex-col gap-2 ${
                      isSelected
                        ? "bg-indigo-50/80 border-indigo-300 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-bold block truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                        {q.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          q.is_published === 1
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {q.is_published === 1 ? "منشور" : "مسودة"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>
                        {q.questions_count || 0} أسئلة · {Math.round(q.duration_seconds / 60)} دقيقة
                      </span>

                      {/* Display Creator (Supervisor / Admin) */}
                      <span className={`px-2 py-0.5 rounded-full font-bold truncate max-w-[130px] flex items-center gap-1 ${
                        isMod ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        <User className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">بواسطة: {creatorLabel}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-400">إجمالي {q.total_points} درجة</span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePublish(q);
                          }}
                          className={`font-bold hover:underline cursor-pointer ${
                            q.is_published === 1 ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {q.is_published === 1 ? "تعطيل" : "نشر"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ type: "quiz", id: q.id, name: q.title });
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Questions Manager */}
        <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {activeQuiz ? `أسئلة: ${activeQuiz.title}` : "بنك الأسئلة"}
              </h3>
              {activeQuiz && (
                <span className="text-[11px] text-slate-500">
                  {questions.length} أسئلة · {activeQuiz.total_points} درجة إجمالية
                </span>
              )}
            </div>

            {activeQuiz && (
              <button
                onClick={() => {
                  setQuestionModalError(null);
                  setIsQuestionModalOpen(true);
                }}
                className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة سؤال</span>
              </button>
            )}
          </div>

          {!activeQuiz ? (
            <p className="text-xs text-slate-400 py-12 text-center">
              اختر كويزاً من القائمة الجانبية أو قم بإنشاء كويز جديد لإضافة أسئلته.
            </p>
          ) : isLoadingQuestions ? (
            <p className="text-xs text-slate-400 py-12 text-center">جاري تحميل الأسئلة...</p>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-3">
              <p>لم تتم إضافة أي أسئلة لهذا الكويز بعد.</p>
              <button
                onClick={() => setIsQuestionModalOpen(true)}
                className="py-2 px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl cursor-pointer"
              >
                اضغط هنا لإضافة السؤال الأول
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 block mb-1">
                        سؤال {idx + 1} ({q.points} درجة)
                      </span>
                      <p className="text-xs font-bold text-slate-900 leading-relaxed">{q.question_text}</p>
                    </div>

                    <button
                      onClick={() => setDeleteTarget({ type: "question", id: q.id, name: `سؤال ${idx + 1}` })}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {q.question_image && (
                    <img
                      src={q.question_image}
                      alt="صورة السؤال"
                      className="max-h-36 object-contain rounded-xl border border-slate-200 bg-white"
                    />
                  )}

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/70">
                    {q.options?.map((opt) => {
                      const isCorrect = q.correct_option === opt.option_key;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                            isCorrect
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                              : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700 flex-shrink-0 font-mono">
                              {opt.option_key}
                            </span>
                            <span className="truncate">{opt.option_text}</span>
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-sm font-bold flex-shrink-0">
                              صحيحة
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Quiz */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">إنشاء كويز إلكتروني جديد</h3>
              <button
                onClick={() => setIsQuizModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quizModalError && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{quizModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuiz} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">المادة</label>
                <select
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">عنوان الكويز</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كويز المحاضرة الأولى والثانية"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">وصف الكويز (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="تعليمات أو إرشادات للطلاب..."
                  value={quizDesc}
                  onChange={(e) => setQuizDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">المدة (بالدقائق)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={durationMins}
                    onChange={(e) => setDurationMins(parseInt(e.target.value, 10) || 10)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">إجمالي الدرجات</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={totalPoints}
                    onChange={(e) => setTotalPoints(parseInt(e.target.value, 10) || 100)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">عدد المحاولات</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={showAnswers === 1}
                    onChange={(e) => setShowAnswers(e.target.checked ? 1 : 0)}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span>إظهار الإجابات النموذجية والتصحيح للطالب بعد التسليم</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowBackNav === 1}
                    onChange={(e) => setAllowBackNav(e.target.checked ? 1 : 0)}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span>السماح بالتنقل والرجوع للأسئلة السابقة أثناء الحل</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuizModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuiz}
                  className="py-2 px-5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  {isSavingQuiz ? "جاري الإنشاء..." : "إنشاء الكويز"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Question */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-3xl p-6 shadow-xl text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">إضافة سؤال جديد للكويز</h3>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {questionModalError && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{questionModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">نص السؤال</label>
                <textarea
                  rows={3}
                  required
                  placeholder="اكتب نص السؤال هنا بدقة ووضوح..."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">صورة السؤال (اختياري - مخطط أو مسألة)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadQuestionImage}
                  disabled={isUploadingMedia}
                  className="w-full text-xs text-slate-700 file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                {qImage && (
                  <div className="mt-2 p-2 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                    <img src={qImage} alt="المعاينة" className="max-h-20 object-contain rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setQImage(null)}
                      className="text-rose-500 text-xs hover:underline cursor-pointer"
                    >
                      إزالة الصورة
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">درجة السؤال</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={qPoints}
                    onChange={(e) => setQPoints(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">الإجابة الصحيحة</label>
                  <select
                    value={correctOption}
                    onChange={(e) => setCorrectOption(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="A">الخيار A</option>
                    <option value="B">الخيار B</option>
                    <option value="C">الخيار C</option>
                    <option value="D">الخيار D</option>
                  </select>
                </div>
              </div>

              {/* Four Options */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold block text-slate-700">الخيارات الأربعة (A, B, C, D):</span>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-0.5">الخيار A</label>
                  <input
                    type="text"
                    required
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-0.5">الخيار B</label>
                  <input
                    type="text"
                    required
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-0.5">الخيار C</label>
                  <input
                    type="text"
                    required
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 block mb-0.5">الخيار D</label>
                  <input
                    type="text"
                    required
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuestion}
                  className="py-2 px-5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  {isSavingQuestion ? "جاري الحفظ..." : "حفظ السؤال"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، احذف"
        isDanger={true}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
