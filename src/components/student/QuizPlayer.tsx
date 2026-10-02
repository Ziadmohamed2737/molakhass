import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Award,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  FileQuestion,
  AlertCircle,
  Send,
  Flag,
  ArrowRight,
  BookOpen,
  Trophy,
  Flame,
  CheckCheck
} from "lucide-react";
import { Quiz, QuizQuestion, QuizResultSummary } from "../../types";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ConfirmModal } from "../common/ConfirmModal";
import { EmptyState } from "../common/EmptyState";
import { QuizIllustration } from "../common/VisualAssets";

interface QuizPlayerProps {
  quiz: Quiz;
  onExit: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onExit }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // Keep ref to latest answers so auto-submit never suffers from stale closure
  const answersRef = useRef<Record<string, string>>({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Timer states
  const totalDuration = Number(quiz.duration_seconds) || 600;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(totalDuration);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resultSummary, setResultSummary] = useState<QuizResultSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeExpired, setTimeExpired] = useState(false);

  // Confirm submit modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  // First name helper for "عاش"
  const firstName = user?.full_name
    ? user.full_name.trim().replace(/^(م\.|م\/|د\.|د\/|مهندس\/|دكتور\/)\s*/, "").split(/\s+/)[0]
    : "بطل";

  // Initialize and start quiz attempt
  useEffect(() => {
    async function initQuiz() {
      setIsLoading(true);
      setError(null);
      try {
        const quizData = await apiRequest<{ quiz: Quiz; questions: QuizQuestion[] }>(`/api/quizzes/${quiz.id}`);
        setQuestions(quizData.questions || []);

        const startData = await apiRequest<{
          attemptId: string;
          remaining_seconds: number;
          started_at: string;
          allow_back_navigation: number;
        }>(`/api/quizzes/${quiz.id}/start`, { method: "POST" });

        setAttemptId(startData.attemptId);
        setRemainingSeconds(Math.max(1, Number(startData.remaining_seconds) || totalDuration));
      } catch (err: any) {
        setError(err.message || "فشل بدء الكويز");
      } finally {
        setIsLoading(false);
      }
    }

    initQuiz();
  }, [quiz.id]);

  // Submit handler (called on button press or auto-submit on time expiration)
  const submitQuizAnswers = async (isAuto = false) => {
    if (!attemptId || isSubmittingRef.current || isSubmitted) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    if (isAuto) {
      setTimeExpired(true);
    }

    try {
      const answersToSend = answersRef.current;
      const result = await apiRequest<QuizResultSummary>(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          attemptId,
          answers: answersToSend,
          isTimeExpired: isAuto,
        }),
      });

      setResultSummary(result);
      setIsSubmitted(true);
      if (result.is_time_expired) {
        setTimeExpired(true);
      }
    } catch (err: any) {
      setSubmitError(err.message || "فشل تسليم الكويز، يرجى المحاولة مرة أخرى");
      // If error happened on manual submit, reset ref so student can retry clicking submit!
      isSubmittingRef.current = false;
    } finally {
      setIsSubmitting(false);
      setIsConfirmModalOpen(false);
    }
  };

  // Timer interval
  useEffect(() => {
    if (isSubmitted || isLoading || !attemptId) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSubmitted, isLoading, attemptId]);

  // When timer reaches 0, trigger auto-submit reliably
  useEffect(() => {
    if (remainingSeconds === 0 && !isSubmitted && !isSubmittingRef.current && attemptId && !isLoading) {
      setTimeExpired(true);
      submitQuizAnswers(true);
    }
  }, [remainingSeconds, isSubmitted, attemptId, isLoading]);

  const selectOption = (questionId: string, optionKey: string) => {
    if (isSubmitted || isSubmitting) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  // Timer format (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLowTime = remainingSeconds <= 60;
  const isWarningTime = remainingSeconds <= 120 && remainingSeconds > 60;
  const timeProgress = Math.max(0, Math.min(100, (remainingSeconds / totalDuration) * 100));

  const answeredCount = Object.keys(answers).length;
  const unattemptedInSession = Math.max(0, questions.length - answeredCount);

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-indigo-600 animate-pulse" />
          </div>
        </div>
        <h3 className="text-base font-black text-slate-900 mb-1">جاري تجهيز الكويز وبدء التوقيت الرسمي</h3>
        <p className="text-xs text-slate-500 font-medium">يتم سحب بنك الأسئلة وتوليد جلسة اختبار مشفرة باسمك</p>
      </div>
    );
  }

  // 2. Fatal Start Error state
  if (error && !resultSummary) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-slate-800">
        <div className="bg-white border-2 border-rose-200 rounded-3xl p-7 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">تعذر بدء الكويز</h3>
          <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium mb-6">
            {error}
          </p>
          <button
            onClick={onExit}
            className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
          >
            الرجوع للمقرر
          </button>
        </div>
      </div>
    );
  }

  // 3. Brand New Futuristic Result Screen ("ستايل جديد ومبهر متعملش قبل كده")
  if (isSubmitted && resultSummary) {
    const percentage = Math.round(resultSummary.percentage);
    const isPassing = percentage >= 50;
    const isHighScore = percentage >= 80;

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-12 text-slate-900">
        {/* Futuristic Cockpit Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-9 shadow-2xl border border-slate-800 mb-6">
          {/* Subtle Cyber Grid Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />

          {/* Time Expired Notice Ribbon if time ended */}
          {timeExpired ? (
            <div className="mb-6 py-2.5 px-4 bg-amber-500/20 border border-amber-400/40 rounded-2xl flex items-center justify-center gap-2 text-amber-300 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
              <span>انتهى الوقت المحدد! تم التسليم التلقائي واحتساب درجات إجاباتك كاملة</span>
            </div>
          ) : (
            <div className="mb-6 py-2 px-4 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl inline-flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold">
              <CheckCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>تم تسليم الكويز يدوياً بنجاح وتصحيح كل الأسئلة</span>
            </div>
          )}

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-3 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  بطاقة النتيجة الرسمية
                </span>
                <span className="text-xs text-slate-400">· {quiz.title}</span>
              </div>

              {/* Dynamic Egyptian Encouraging Greeting */}
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
                {isHighScore ? (
                  <span className="flex items-center justify-center md:justify-start gap-2">
                    <span>عاش يا {firstName}!</span>
                    <span className="text-amber-400">🔥 أداء متصدر ومبدع</span>
                  </span>
                ) : isPassing ? (
                  <span className="flex items-center justify-center md:justify-start gap-2">
                    <span>عاش يا {firstName}!</span>
                    <span className="text-emerald-400">👏 مستوى محترم وناجح</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center md:justify-start gap-2">
                    <span>عاش يا {firstName}!</span>
                    <span className="text-indigo-300">💪 شد حيلك، راجع أخطائك وهتعوض</span>
                  </span>
                )}
              </h2>

              <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                تم تصحيح جميع الأسئلة إلكترونياً وتوثيق النتيجة في ملفك الدراسي لحساب ترتيبك بين زملائك.
              </p>
            </div>

            {/* Futuristic Circular / Radial Score Indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-slate-800/80 border-4 border-slate-700/60 flex flex-col items-center justify-center p-3 shadow-inner relative overflow-hidden group">
                <div
                  className={`absolute inset-0 opacity-20 transition-all ${
                    isHighScore
                      ? "bg-gradient-to-t from-emerald-500 to-amber-400"
                      : isPassing
                      ? "bg-gradient-to-t from-emerald-600 to-indigo-500"
                      : "bg-gradient-to-t from-rose-600 to-amber-500"
                  }`}
                />
                <span className="text-[10px] font-mono text-slate-300 tracking-wider uppercase font-bold">النسبة المئوية</span>
                <span
                  className={`text-3xl sm:text-4xl font-black tracking-tight my-0.5 ${
                    isHighScore ? "text-emerald-400" : isPassing ? "text-emerald-300" : "text-rose-400"
                  }`}
                >
                  {percentage}%
                </span>
                <span className="text-[11px] font-bold text-slate-300">
                  {Math.round(resultSummary.score)} / {Math.round(resultSummary.total_points)} درجة
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metric Stats Cubes with High Contrast */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">الدرجة المحسوبة</span>
              <Trophy className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {Math.round(resultSummary.score)}
              <span className="text-xs font-normal text-slate-400 mr-1">/ {Math.round(resultSummary.total_points)}</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-bold mt-1">الدرجة الإجمالية</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">إجابات صحيحة</span>
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {resultSummary.correct_count}
              <span className="text-xs font-normal text-slate-400 mr-1">من {resultSummary.total_questions}</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold mt-1">تم حلها بنجاح</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">إجابات خاطئة</span>
              <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                ✕
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600">
              {resultSummary.wrong_count}
              <span className="text-xs font-normal text-slate-400 mr-1">أسئلة</span>
            </div>
            <span className="text-[10px] text-rose-700 font-bold mt-1">تحتاج مراجعة</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">لم تُحل / وقت انتهى</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">
              {resultSummary.unattempted_count}
              <span className="text-xs font-normal text-slate-400 mr-1">أسئلة</span>
            </div>
            <span className="text-[10px] text-amber-700 font-bold mt-1">احتُسبت بـ 0 درجات</span>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-between gap-3 mb-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900">جاهز للمقرر القادم؟</span> يمكنك العودة لصفحة المادة لمتابعة باقي المحاضرات والشيتات.
          </div>
          <button
            onClick={onExit}
            className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer flex-shrink-0"
          >
            <span>العودة لصفحة المادة</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Detailed Solutions Review (if show_answers is enabled) */}
        {resultSummary.show_answers && resultSummary.feedback && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">مراجعة الأسئلة والإجابات النموذجية</h3>
              </div>
              <span className="text-xs text-slate-500">
                {questions.length} أسئلة
              </span>
            </div>

            {questions.map((q, idx) => {
              const fb = resultSummary.feedback?.find((f) => f.question_id === q.id);
              const isCorrect = fb?.is_correct;
              const selected = fb?.selected_option;
              const correct = fb?.correct_option;

              return (
                <div
                  key={q.id}
                  className={`p-5 bg-white border-2 rounded-3xl shadow-xs transition-all ${
                    isCorrect
                      ? "border-emerald-200 hover:border-emerald-300"
                      : selected
                      ? "border-rose-200 hover:border-rose-300"
                      : "border-amber-200 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-mono font-bold text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {q.question_text}
                      </span>
                    </div>

                    <div>
                      {isCorrect ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>إجابة صحيحة (+{Math.round(Number(q.points) || 1)})</span>
                        </span>
                      ) : selected ? (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>إجابة خاطئة (0)</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>لم تُحل / انتهى الوقت (0)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Image if present */}
                  {q.question_image && (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 max-h-60 flex items-center justify-center bg-slate-50">
                      <img src={q.question_image} alt="صورة السؤال" className="max-h-60 object-contain" />
                    </div>
                  )}

                  {/* 4 Choices Review */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                    {q.options.map((opt) => {
                      const isOptionCorrect = opt.option_key === correct;
                      const isOptionSelected = opt.option_key === selected;

                      let style = "bg-slate-50/70 border-slate-200 text-slate-700";
                      if (isOptionCorrect) {
                        style = "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-300";
                      } else if (isOptionSelected && !isCorrect) {
                        style = "bg-rose-50 border-rose-300 text-rose-900 font-medium line-through";
                      }

                      return (
                        <div key={opt.option_key} className={`p-3 rounded-2xl border flex items-center gap-2.5 ${style}`}>
                          <span className="w-6 h-6 rounded-lg bg-white/80 border border-slate-200 font-mono font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {opt.option_key}
                          </span>
                          <span className="flex-1">{opt.option_text}</span>
                          {isOptionCorrect && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
                              الصحيحة ✓
                            </span>
                          )}
                          {isOptionSelected && !isCorrect && (
                            <span className="text-[10px] text-rose-700 bg-rose-100 font-bold px-2 py-0.5 rounded-full">
                              اختيارك ✕
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 4. Empty questions check
  if (questions.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-slate-900">
        <EmptyState
          illustration={<QuizIllustration className="w-32 h-32" />}
          title="الكويز لا يحتوي على أي أسئلة مضافة بعد"
          description="لم يقم المشرف بإضافة أسئلة لهذا الكويز بعد، يمكنك العودة للمقرر وتجربة كويز آخر."
          actionText="الرجوع للمادة"
          onAction={onExit}
        />
      </div>
    );
  }

  // 5. Active Quiz Taking Arena
  const currentQuestion = questions[currentIndex];
  const selectedOptionForCurrent = answers[currentQuestion.id];
  const allowBack = quiz.allow_back_navigation === 1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-28 md:pb-12 text-slate-900">
      {/* Submitting Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl border border-slate-100">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="w-6 h-6 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">
              {timeExpired ? "انتهى الوقت! جاري تسليم إجاباتك..." : "جاري تسليم وتصحيح الكويز..."}
            </h3>
            <p className="text-xs text-slate-500 font-medium">يتم رصد الدرجات وحساب الإحصائيات مباشرة الآن</p>
          </div>
        </div>
      )}

      {/* Top Banner Alert if Submit Error happened */}
      {submitError && (
        <div className="mb-4 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center justify-between text-xs font-bold text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
          <button
            onClick={() => submitQuizAnswers(false)}
            className="py-1 px-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Futuristic Sticky Top Cockpit Bar */}
      <div className="sticky top-4 z-30 bg-slate-900 text-white rounded-3xl p-4 sm:p-5 mb-5 shadow-2xl border border-slate-800 overflow-hidden">
        {/* Dynamic Countdown Progress Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
          <div
            className={`h-full transition-all duration-1000 ${
              isLowTime ? "bg-rose-500 animate-pulse" : isWarningTime ? "bg-amber-400" : "bg-gradient-to-r from-indigo-500 to-emerald-400"
            }`}
            style={{ width: `${timeProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Quiz Subject & Progress */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-400/20">
                {quiz.subject_code || "كويز"}
              </span>
              <h2 className="text-xs sm:text-sm font-black truncate text-white">{quiz.title}</h2>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>سؤال {currentIndex + 1} من {questions.length}</span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">{answeredCount} تم حلها</span>
              {unattemptedInSession > 0 && (
                <span className="text-slate-400">({unattemptedInSession} متبقي)</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Real Synchronized Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl font-mono text-xs sm:text-sm font-black border transition-all ${
                isLowTime
                  ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse shadow-lg shadow-rose-500/20"
                  : isWarningTime
                  ? "bg-amber-500/20 border-amber-400 text-amber-300"
                  : "bg-slate-800/90 border-slate-700 text-indigo-300"
              }`}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            {/* Direct Header Submit Trigger */}
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="py-2 px-3 sm:px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تسليم الكويز</span>
              <span className="sm:hidden">تسليم</span>
            </button>
          </div>
        </div>
      </div>

      {/* Futuristic Question Navigation Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 mb-5 shadow-xs">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 font-bold">
          <span>خريطة أسئلة الكويز (اضغط للانتقال):</span>
          <span>
            {answeredCount} من {questions.length} أسئلة مكتملة
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {questions.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.id}
                onClick={() => {
                  if (allowBack || idx >= currentIndex) {
                    setCurrentIndex(idx);
                  }
                }}
                disabled={!allowBack && idx < currentIndex}
                title={`سؤال ${idx + 1}${isAnswered ? " (تمت الإجابة)" : ""}`}
                className={`w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer relative ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-110 ring-2 ring-indigo-300"
                    : isAnswered
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                } ${!allowBack && idx < currentIndex ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Arena Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 mb-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-xs font-mono text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
            السؤال رقم {currentIndex + 1}
          </span>
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
            {Math.round(Number(currentQuestion.points) || 1)} درجة
          </span>
        </div>

        {/* Question Statement */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-relaxed mb-6">
          {currentQuestion.question_text}
        </h3>

        {/* Optional Question Diagram Image */}
        {currentQuestion.question_image && (
          <div className="mb-6 rounded-2xl overflow-hidden border-2 border-slate-100 max-h-80 flex items-center justify-center bg-slate-50 p-2">
            <img
              src={currentQuestion.question_image}
              alt="توضيح السؤال"
              className="max-h-80 object-contain rounded-xl"
            />
          </div>
        )}

        {/* 4 Interactive Cyber Option Blocks */}
        <div className="space-y-3">
          {currentQuestion.options.map((opt) => {
            const isSelected = selectedOptionForCurrent === opt.option_key;

            return (
              <div
                key={opt.option_key}
                onClick={() => selectOption(currentQuestion.id, opt.option_key)}
                className={`p-4 sm:p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3.5 select-none ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/70 shadow-sm shadow-indigo-600/10 scale-[1.01]"
                    : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs flex-shrink-0 transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {opt.option_key}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-snug">
                      {opt.option_text}
                    </span>
                    {opt.option_image && (
                      <img
                        src={opt.option_image}
                        alt={`خيار ${opt.option_key}`}
                        className="mt-2 max-h-36 object-contain rounded-xl border border-slate-200"
                      />
                    )}
                  </div>
                </div>

                {/* Radio check status */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? "border-indigo-600 bg-indigo-600 scale-105" : "border-slate-300"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation & Action Bar: Previous / Next / Submit */}
      <div className="flex items-center justify-between gap-3">
        {allowBack && currentIndex > 0 ? (
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="py-3 px-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السؤال السابق</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <span>السؤال التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="py-3 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>تسليم الكويز الآن</span>
            </button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="تأكيد تسليم الكويز ورصد النتيجة"
        message={
          unattemptedInSession > 0
            ? `تنبيه: قمت بالإجابة على ${answeredCount} سؤال فقط، ويوجد ${unattemptedInSession} أسئلة لم تقم بالإجابة عليها بعد وستُحتسب بـ 0 درجات. هل تريد تسليم الكويز ورصد النتيجة الآن؟`
            : `ممتاز! قمت بالإجابة على جميع الأسئلة (${questions.length} سؤال). هل تريد تسليم الكويز ورصد درجتك الآن؟`
        }
        confirmText="نعم، قم بالتسليم وحساب الدرجة"
        cancelText="متابعة الحل"
        onConfirm={() => submitQuizAnswers(false)}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
};
