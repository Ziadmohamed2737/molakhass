import React from "react";
import { BookOpen, Layers, FileText, HelpCircle, ArrowLeft, GraduationCap, Star } from "lucide-react";
import { Subject } from "../../types";
import { SpecializationBadgeIcon } from "../common/VisualAssets";

interface SubjectCardProps {
  subject: Subject;
  onViewLectures: (subject: Subject) => void;
  onViewAll: (subject: Subject) => void;
  onToggleFavorite?: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  onViewLectures,
  onViewAll,
  onToggleFavorite,
}) => {
  const isFavorite = Number(subject.is_favorite) === 1;

  return (
    <div
      className={`relative rounded-3xl transition-all duration-300 shadow-xs hover:shadow-lg flex flex-col justify-between overflow-hidden group ${
        isFavorite
          ? "bg-white border-2 border-amber-300/80 hover:border-amber-400 shadow-amber-500/5 ring-2 ring-amber-100/50"
          : "bg-white border border-slate-200/90 hover:border-indigo-300"
      }`}
    >
      {/* Top Graphic Accent Bar */}
      <div
        className={`h-1.5 w-full ${
          isFavorite
            ? "bg-gradient-to-l from-amber-500 via-amber-400 to-indigo-500"
            : "bg-gradient-to-l from-indigo-600 via-blue-600 to-indigo-400"
        }`}
      />

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header row: Department Icon badge + Code & Doctor + Favorite Star */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-2xs group-hover:scale-105 ${
                  isFavorite
                    ? "bg-amber-50 border border-amber-200 text-amber-600 group-hover:bg-amber-500 group-hover:text-white"
                    : "bg-indigo-50 border border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                }`}
              >
                <SpecializationBadgeIcon specCode={subject.specialization_id} className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[11px] font-bold tracking-wider text-indigo-600 uppercase block">
                    {subject.code}
                  </span>
                  {isFavorite && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.2 rounded-full inline-flex items-center gap-1 shadow-2xs">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                      <span>مفضلة</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors leading-tight">
                  {subject.name}
                </h3>
              </div>
            </div>

            {/* Favorite Action Button */}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(subject);
                }}
                title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة (ستظهر في أول الترتيب - حد أقصى 3 مواد)"}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center flex-shrink-0 ${
                  isFavorite
                    ? "bg-amber-50 border-amber-300 text-amber-500 hover:bg-amber-100 shadow-xs scale-105"
                    : "bg-slate-50 hover:bg-amber-50/80 border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-200"
                }`}
              >
                <Star
                  className={`w-4 h-4 transition-transform active:scale-125 ${
                    isFavorite ? "fill-amber-400 text-amber-500" : ""
                  }`}
                />
              </button>
            )}
          </div>

          {/* Academic Info */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 flex-wrap">
            <div className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold text-slate-800">د. {subject.doctor_name}</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{subject.year_name || "الفرقة الدراسية"}</span>
            {subject.spec_name && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{subject.spec_name}</span>
              </>
            )}
            {subject.term_name && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{subject.term_name}</span>
              </>
            )}
          </div>

          {/* Visual Mini Metrics Hub (Icons replace wordy labels) */}
          <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl mb-4 text-center">
            {/* Lectures */}
            <div className="flex flex-col items-center py-1">
              <BookOpen className="w-4 h-4 text-indigo-600 mb-0.5" />
              <span className="text-xs font-black text-slate-900">{subject.lectures_count || 0}</span>
              <span className="text-[10px] text-slate-500 font-medium">محاضرات</span>
            </div>

            {/* Sections */}
            <div className="flex flex-col items-center py-1 border-r border-slate-200">
              <Layers className="w-4 h-4 text-indigo-600 mb-0.5" />
              <span className="text-xs font-black text-slate-900">{subject.sections_count || 0}</span>
              <span className="text-[10px] text-slate-500 font-medium">سكاشن</span>
            </div>

            {/* Sheets */}
            <div className="flex flex-col items-center py-1 border-r border-slate-200">
              <FileText className="w-4 h-4 text-indigo-600 mb-0.5" />
              <span className="text-xs font-black text-slate-900">{subject.sheets_count || 0}</span>
              <span className="text-[10px] text-slate-500 font-medium">شيتات</span>
            </div>

            {/* Quizzes */}
            <div className="flex flex-col items-center py-1 border-r border-slate-200">
              <HelpCircle className="w-4 h-4 text-indigo-600 mb-0.5" />
              <span className="text-xs font-black text-slate-900">{subject.quizzes_count || 0}</span>
              <span className="text-[10px] text-slate-500 font-medium">كويزات</span>
            </div>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => onViewLectures(subject)}
            className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 active:scale-95 bg-white cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>محاضراتك</span>
          </button>

          <button
            onClick={() => onViewAll(subject)}
            className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>كل المحتوى</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
