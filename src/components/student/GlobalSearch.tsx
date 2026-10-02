import React, { useState, useEffect } from "react";
import { Search, X, BookOpen, Layers, FileText, HelpCircle, ArrowLeft, Star } from "lucide-react";
import { Subject } from "../../types";
import { apiRequest } from "../../api/client";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSubject: (subject: Subject, tab?: "lectures" | "sections" | "sheets" | "quizzes") => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onSelectSubject,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      return;
    }
    async function fetchSubjects() {
      setIsLoading(true);
      try {
        const res = await apiRequest<{ subjects: Subject[] }>("/api/subjects");
        setSubjects(res.subjects || []);
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubjects();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSubjects = subjects.filter((s) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term) ||
      s.doctor_name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-start p-3 sm:p-6">
      <div className="w-full max-w-2xl mx-auto bg-slate-50 rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <input
            type="text"
            placeholder="ابحث عن مادة، كود مادة، اسم الدكتور..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="flex-1 text-sm bg-transparent outline-hidden text-slate-900 placeholder:text-slate-400 font-medium"
          />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">جاري البحث...</div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              لا توجد مواد مطابقة لكلمة البحث "{searchTerm}"
            </div>
          ) : (
            filteredSubjects.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 transition-all shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono text-indigo-600 font-bold block">
                        {s.code}
                      </span>
                      {Number(s.is_favorite) === 1 && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5 shadow-2xs">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                          <span>مفضلة</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                    <span className="text-xs text-slate-500">د. {s.doctor_name}</span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectSubject(s, "lectures");
                      onClose();
                    }}
                    className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>عرض</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => {
                      onSelectSubject(s, "lectures");
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 text-center font-bold transition-colors cursor-pointer"
                  >
                    المحاضرات ({s.lectures_count || 0})
                  </button>

                  <button
                    onClick={() => {
                      onSelectSubject(s, "sections");
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 text-center font-bold transition-colors cursor-pointer"
                  >
                    السكاشن ({s.sections_count || 0})
                  </button>

                  <button
                    onClick={() => {
                      onSelectSubject(s, "sheets");
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 text-center font-bold transition-colors cursor-pointer"
                  >
                    الشيتات ({s.sheets_count || 0})
                  </button>

                  <button
                    onClick={() => {
                      onSelectSubject(s, "quizzes");
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 text-center font-bold transition-colors cursor-pointer"
                  >
                    الكويزات ({s.quizzes_count || 0})
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
