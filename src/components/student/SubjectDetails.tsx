import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Layers,
  FileText,
  HelpCircle,
  Download,
  Eye,
  FileImage,
  Calendar,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Play,
  RotateCcw,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Star
} from "lucide-react";
import { Subject, Lecture, Section, Sheet, Quiz, DocumentItem } from "../../types";
import { apiRequest, getFileDownloadUrl, formatFileSize } from "../../api/client";
import { EmptyState } from "../common/EmptyState";
import { ImageViewerModal } from "../common/ImageViewerModal";
import { PdfViewerModal } from "../common/PdfViewerModal";
import {
  EmptyFolderIllustration,
  BlueprintIllustration,
  QuizIllustration,
  SpecializationBadgeIcon
} from "../common/VisualAssets";

interface SubjectDetailsProps {
  subject: Subject;
  initialTab?: "lectures" | "sections" | "sheets" | "quizzes";
  onStartQuiz: (quiz: Quiz) => void;
  onBack: () => void;
}

export const SubjectDetails: React.FC<SubjectDetailsProps> = ({
  subject,
  initialTab = "lectures",
  onStartQuiz,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"lectures" | "sections" | "sheets" | "quizzes">(initialTab);

  // Data states
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Favorite state
  const [isFavorite, setIsFavorite] = useState<boolean>(Number(subject.is_favorite) === 1);
  const [favLoading, setFavLoading] = useState(false);
  const [favMsg, setFavMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleToggleFavorite = async () => {
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await apiRequest<{ is_favorite: number; message: string }>(
        `/api/subjects/${subject.id}/favorite`,
        { method: "POST" }
      );
      setIsFavorite(Number(res.is_favorite) === 1);
      setFavMsg({ text: res.message || (res.is_favorite === 1 ? "تمت إضافة المادة للمفضلة ⭐" : "تمت إزالة المادة من المفضلة") });
      setTimeout(() => setFavMsg(null), 3500);
    } catch (err: any) {
      setFavMsg({ text: err.message || "فشل تعديل حالة المفضلة", error: true });
      setTimeout(() => setFavMsg(null), 4500);
    } finally {
      setFavLoading(false);
    }
  };

  // Expanded items mapped by id: documents
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemDocuments, setItemDocuments] = useState<Record<string, DocumentItem[]>>({});
  const [loadingDocs, setLoadingDocs] = useState<Record<string, boolean>>({});

  // Media preview modals
  const [activeImageViewer, setActiveImageViewer] = useState<{
    documents: DocumentItem[];
    initialIndex: number;
    isOpen: boolean;
  }>({
    documents: [],
    initialIndex: 0,
    isOpen: false,
  });

  const [activePdfViewer, setActivePdfViewer] = useState<{
    document: DocumentItem | null;
    isOpen: boolean;
  }>({
    document: null,
    isOpen: false,
  });

  // Fetch items for current tab
  useEffect(() => {
    async function loadTabData() {
      setIsLoading(true);
      try {
        if (activeTab === "lectures") {
          const res = await apiRequest<{ lectures: Lecture[] }>(`/api/content/subjects/${subject.id}/lectures`);
          setLectures(res.lectures || []);
        } else if (activeTab === "sections") {
          const res = await apiRequest<{ sections: Section[] }>(`/api/content/subjects/${subject.id}/sections`);
          setSections(res.sections || []);
        } else if (activeTab === "sheets") {
          const res = await apiRequest<{ sheets: Sheet[] }>(`/api/content/subjects/${subject.id}/sheets`);
          setSheets(res.sheets || []);
        } else if (activeTab === "quizzes") {
          const res = await apiRequest<{ quizzes: Quiz[] }>(`/api/quizzes/subjects/${subject.id}`);
          setQuizzes(res.quizzes || []);
        }
      } catch (err) {
        console.error("Failed to load tab data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTabData();
  }, [subject.id, activeTab]);

  const toggleItemExpansion = async (id: string, type: "lecture" | "section" | "sheet") => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    if (!itemDocuments[id]) {
      setLoadingDocs(prev => ({ ...prev, [id]: true }));
      try {
        const endpoint = type === "lecture"
          ? `/api/content/lectures/${id}`
          : type === "section"
          ? `/api/content/sections/${id}`
          : `/api/content/sheets/${id}`;

        const res = await apiRequest<{ documents: DocumentItem[] }>(endpoint);
        setItemDocuments(prev => ({ ...prev, [id]: res.documents || [] }));
      } catch (err) {
        console.error("Failed to load documents:", err);
      } finally {
        setLoadingDocs(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleDocumentClick = (doc: DocumentItem, allDocs: DocumentItem[]) => {
    if (doc.file_type === "application/pdf") {
      setActivePdfViewer({ document: doc, isOpen: true });
    } else {
      const imageDocs = allDocs.filter(d => d.file_type.startsWith("image/"));
      const clickedIdx = Math.max(0, imageDocs.findIndex(d => d.id === doc.id));
      setActiveImageViewer({
        documents: imageDocs,
        initialIndex: clickedIdx,
        isOpen: true,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-12 text-slate-900">
      {/* Modern Subject Banner */}
      <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <SpecializationBadgeIcon specCode={subject.specialization_id} className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  {subject.code}
                </span>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-slate-700 font-semibold">{subject.year_name}</span>
                {subject.spec_name && (
                  <>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-indigo-600 font-bold">{subject.spec_name}</span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {subject.name}
              </h1>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-slate-800">د. {subject.doctor_name}</span>
                {subject.term_name && <span className="text-slate-400">({subject.term_name})</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {favMsg && (
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border animate-fade-in ${
                  favMsg.error
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {favMsg.text}
              </span>
            )}

            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة (ستظهر في أول الترتيب - حد أقصى 3)"}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isFavorite
                  ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-2xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                  isFavorite ? "fill-amber-400 text-amber-500" : "text-slate-400"
                }`}
              />
              <span>{isFavorite ? "مادة مفضلة" : "تفضيل المادة"}</span>
            </button>

            <button
              onClick={onBack}
              className="py-2 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>المقررات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern 4 Tabs with visual indicators */}
      <div className="grid grid-cols-4 gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl mb-6">
        <button
          onClick={() => setActiveTab("lectures")}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "lectures"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>محاضراتي</span>
        </button>

        <button
          onClick={() => setActiveTab("sections")}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "sections"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>سكاشن</span>
        </button>

        <button
          onClick={() => setActiveTab("sheets")}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "sheets"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>شيتات</span>
        </button>

        <button
          onClick={() => setActiveTab("quizzes")}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "quizzes"
              ? "bg-white text-indigo-600 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>كويزات</span>
        </button>
      </div>

      {/* Tab Content Display */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : activeTab === "lectures" ? (
        lectures.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <EmptyState
              illustration={<EmptyFolderIllustration className="w-32 h-32" />}
              title="لا توجد محاضرات مضافة لهذه المادة حالياً"
              description="سيتم إتاحة المحاضرات فور نشرها ورفع محتواها من قِبل المشرفين."
            />
          </div>
        ) : (
          <div className="space-y-3.5">
            {lectures.map((lec) => {
              const isExpanded = expandedId === lec.id;
              const docs = itemDocuments[lec.id] || [];
              const loading = loadingDocs[lec.id];

              return (
                <div
                  key={lec.id}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <div
                    onClick={() => toggleItemExpansion(lec.id, "lecture")}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-2xs">
                        {lec.lecture_number}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">{lec.title}</h3>
                        {lec.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{lec.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg">
                        {lec.files_count || 0} ملف
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Documents in exact sort order */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                      {loading ? (
                        <div className="py-4 text-center text-xs text-slate-500">جاري تحميل المستندات...</div>
                      ) : docs.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500">لم يتم إرفاق ملفات بعد.</div>
                      ) : (
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div
                              key={doc.id}
                              className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-indigo-300 transition-all shadow-2xs"
                            >
                              <div
                                onClick={() => handleDocumentClick(doc, docs)}
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                              >
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  {doc.file_type === "application/pdf" ? (
                                    <FileText className="w-5 h-5 text-rose-600" />
                                  ) : (
                                    <FileImage className="w-5 h-5 text-indigo-600" />
                                  )}
                                </div>
                                <div className="truncate">
                                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    <span className="text-indigo-600 font-mono ml-1.5">{doc.sort_order}.</span>
                                    {doc.display_name}
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {doc.file_type === "application/pdf" ? "مستند PDF" : "صورة الشرح"} · {formatFileSize(doc.file_size)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleDocumentClick(doc, docs)}
                                  title="معاينة"
                                  className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={getFileDownloadUrl(doc.id)}
                                  download={doc.display_name}
                                  title="تنزيل الملف"
                                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === "sections" ? (
        sections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <EmptyState
              illustration={<BlueprintIllustration className="w-32 h-32" />}
              title="لا توجد سكاشن مضافة لهذه المادة حالياً"
              description="لم يتم رفع أي محتوى سكاشن دراسية حتى الآن."
            />
          </div>
        ) : (
          <div className="space-y-3.5">
            {sections.map((sec) => {
              const isExpanded = expandedId === sec.id;
              const docs = itemDocuments[sec.id] || [];
              const loading = loadingDocs[sec.id];

              return (
                <div
                  key={sec.id}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <div
                    onClick={() => toggleItemExpansion(sec.id, "section")}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-2xs">
                        {sec.section_number}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">{sec.title}</h3>
                        {sec.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{sec.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg">
                        {sec.files_count || 0} ملف
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                      {loading ? (
                        <div className="py-4 text-center text-xs text-slate-500">جاري تحميل المستندات...</div>
                      ) : docs.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500">لم يتم إرفاق ملفات بعد.</div>
                      ) : (
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div
                              key={doc.id}
                              className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-indigo-300 transition-all shadow-2xs"
                            >
                              <div
                                onClick={() => handleDocumentClick(doc, docs)}
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                              >
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  {doc.file_type === "application/pdf" ? (
                                    <FileText className="w-5 h-5 text-rose-600" />
                                  ) : (
                                    <FileImage className="w-5 h-5 text-indigo-600" />
                                  )}
                                </div>
                                <div className="truncate">
                                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    <span className="text-indigo-600 font-mono ml-1.5">{doc.sort_order}.</span>
                                    {doc.display_name}
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {formatFileSize(doc.file_size)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleDocumentClick(doc, docs)}
                                  title="معاينة"
                                  className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={getFileDownloadUrl(doc.id)}
                                  download={doc.display_name}
                                  title="تنزيل الملف"
                                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === "sheets" ? (
        sheets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <EmptyState
              illustration={<EmptyFolderIllustration className="w-32 h-32" />}
              title="لا توجد شيتات متاحة حالياً"
              description="لم يتم نشر أي شيتات أو تكليفات دراسية لهذه المادة بعد."
            />
          </div>
        ) : (
          <div className="space-y-3.5">
            {sheets.map((sh) => {
              const isExpanded = expandedId === sh.id;
              const docs = itemDocuments[sh.id] || [];
              const loading = loadingDocs[sh.id];

              return (
                <div
                  key={sh.id}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <div
                    onClick={() => toggleItemExpansion(sh.id, "sheet")}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">{sh.title}</h3>
                        {sh.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{sh.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg">
                        {sh.files_count || 0} ملف
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                      {loading ? (
                        <div className="py-4 text-center text-xs text-slate-500">جاري تحميل الملفات...</div>
                      ) : docs.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500">لم يتم إرفاق ملفات بعد.</div>
                      ) : (
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div
                              key={doc.id}
                              className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-indigo-300 transition-all shadow-2xs"
                            >
                              <div
                                onClick={() => handleDocumentClick(doc, docs)}
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                              >
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  {doc.file_type === "application/pdf" ? (
                                    <FileText className="w-5 h-5 text-rose-600" />
                                  ) : (
                                    <FileImage className="w-5 h-5 text-indigo-600" />
                                  )}
                                </div>
                                <div className="truncate">
                                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    <span className="text-indigo-600 font-mono ml-1.5">{doc.sort_order}.</span>
                                    {doc.display_name}
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {formatFileSize(doc.file_size)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleDocumentClick(doc, docs)}
                                  title="معاينة"
                                  className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={getFileDownloadUrl(doc.id)}
                                  download={doc.display_name}
                                  title="تنزيل الملف"
                                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Quizzes Tab */
        quizzes.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs">
            <EmptyState
              illustration={<QuizIllustration className="w-32 h-32" />}
              title="لا توجد كويزات منشورة لهذه المادة"
              description="سيتم إشعارك فور إتاحة أي اختبارات أو كويزات إلكترونية جديدة."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const attemptsUsed = quiz.user_attempts_count || 0;
              const maxAttempts = quiz.max_attempts;
              const hasAttemptsLeft = maxAttempts === 0 || attemptsUsed < maxAttempts;

              return (
                <div
                  key={quiz.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-bold text-slate-900">{quiz.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        <Award className="w-4 h-4" />
                        <span>{quiz.total_points} درجة</span>
                      </div>
                    </div>

                    {quiz.description && (
                      <p className="text-xs text-slate-500 mb-3">{quiz.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{Math.round(quiz.duration_seconds / 60)} دقيقة</span>
                      </div>
                      <span aria-hidden="true">·</span>
                      <span>{quiz.questions_count || 0} أسئلة</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        المحاولات: {attemptsUsed} من {maxAttempts === 0 ? "غير محدود" : maxAttempts}
                      </span>
                      {quiz.best_score !== null && quiz.best_score !== undefined && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-emerald-600">
                            أعلى نتيجة: {Math.round(Number(quiz.best_score))} / {Math.round(Number(quiz.total_points))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">
                      {hasAttemptsLeft ? "يمكنك بدء محاولة جديدة الآن" : "تم استنفاد جميع المحاولات المتاحة"}
                    </span>

                    <button
                      onClick={() => onStartQuiz(quiz)}
                      disabled={!hasAttemptsLeft}
                      className={`py-2 px-5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        hasAttemptsLeft
                          ? "bg-slate-900 hover:bg-slate-800 active:scale-95 text-white shadow-xs"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>بدء الكويز</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Global Modals */}
      <ImageViewerModal
        documents={activeImageViewer.documents}
        initialIndex={activeImageViewer.initialIndex}
        isOpen={activeImageViewer.isOpen}
        onClose={() => setActiveImageViewer(prev => ({ ...prev, isOpen: false }))}
      />

      <PdfViewerModal
        document={activePdfViewer.document}
        isOpen={activePdfViewer.isOpen}
        onClose={() => setActivePdfViewer({ document: null, isOpen: false })}
      />
    </div>
  );
};
