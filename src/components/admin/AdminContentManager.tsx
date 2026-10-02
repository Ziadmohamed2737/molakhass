import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Layers,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Upload,
  ArrowRight,
  Eye,
  Download,
  AlertCircle,
  User,
  Shield,
  Clock,
  Sparkles,
  X
} from "lucide-react";
import { Subject, Lecture, Section, Sheet, DocumentItem } from "../../types";
import { apiRequest, getFileDownloadUrl, formatFileSize } from "../../api/client";
import { ConfirmModal } from "../common/ConfirmModal";
import { EmptyState } from "../common/EmptyState";

interface AdminContentManagerProps {
  subject: Subject;
  onBack: () => void;
}

export const AdminContentManager: React.FC<AdminContentManagerProps> = ({
  subject,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"lectures" | "sections" | "sheets">("lectures");

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected item to view/manage its documents
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Create Item modal state
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [itemNumber, setItemNumber] = useState<number>(1);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [isItemCreating, setIsItemCreating] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // New files upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [displayNames, setDisplayNames] = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "lectures") {
        const res = await apiRequest<{ lectures: Lecture[] }>(`/api/content/subjects/${subject.id}/lectures`);
        setLectures(res.lectures || []);
        if (res.lectures && res.lectures.length > 0 && !selectedItemId) {
          setSelectedItemId(res.lectures[0].id);
        }
      } else if (activeTab === "sections") {
        const res = await apiRequest<{ sections: Section[] }>(`/api/content/subjects/${subject.id}/sections`);
        setSections(res.sections || []);
        if (res.sections && res.sections.length > 0 && !selectedItemId) {
          setSelectedItemId(res.sections[0].id);
        }
      } else if (activeTab === "sheets") {
        const res = await apiRequest<{ sheets: Sheet[] }>(`/api/content/subjects/${subject.id}/sheets`);
        setSheets(res.sheets || []);
        if (res.sheets && res.sheets.length > 0 && !selectedItemId) {
          setSelectedItemId(res.sheets[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab, subject.id]);

  // Load documents when selectedItemId changes
  useEffect(() => {
    if (!selectedItemId) {
      setDocuments([]);
      return;
    }

    async function loadDocuments() {
      setIsLoadingDocs(true);
      try {
        const endpoint = activeTab === "lectures"
          ? `/api/content/lectures/${selectedItemId}`
          : activeTab === "sections"
          ? `/api/content/sections/${selectedItemId}`
          : `/api/content/sheets/${selectedItemId}`;

        const res = await apiRequest<{ documents: DocumentItem[] }>(endpoint);
        setDocuments(res.documents || []);
      } catch (err) {
        console.error("Failed to load documents:", err);
      } finally {
        setIsLoadingDocs(false);
      }
    }

    loadDocuments();
  }, [selectedItemId, activeTab]);

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemError(null);
    if (!itemTitle.trim()) {
      setItemError("العنوان مطلوب");
      return;
    }

    setIsItemCreating(true);
    try {
      if (activeTab === "lectures") {
        await apiRequest("/api/content/lectures", {
          method: "POST",
          body: JSON.stringify({
            subject_id: subject.id,
            lecture_number: itemNumber,
            title: itemTitle.trim(),
            description: itemDesc.trim() || null,
            is_published: 1,
          }),
        });
      } else if (activeTab === "sections") {
        await apiRequest("/api/content/sections", {
          method: "POST",
          body: JSON.stringify({
            subject_id: subject.id,
            section_number: itemNumber,
            title: itemTitle.trim(),
            description: itemDesc.trim() || null,
            is_published: 1,
          }),
        });
      } else if (activeTab === "sheets") {
        await apiRequest("/api/content/sheets", {
          method: "POST",
          body: JSON.stringify({
            subject_id: subject.id,
            title: itemTitle.trim(),
            description: itemDesc.trim() || null,
            is_published: 1,
          }),
        });
      }

      setIsCreateItemModalOpen(false);
      setItemTitle("");
      setItemDesc("");
      await fetchItems();
    } catch (err: any) {
      setItemError(err.message || "فشل إنشاء العنصر");
    } finally {
      setIsItemCreating(false);
    }
  };

  const handleUploadFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || uploadFiles.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("subject_id", subject.id);
      if (activeTab === "lectures") formData.append("lecture_id", selectedItemId);
      if (activeTab === "sections") formData.append("section_id", selectedItemId);
      if (activeTab === "sheets") formData.append("sheet_id", selectedItemId);

      uploadFiles.forEach(f => formData.append("files", f));
      formData.append("display_names", JSON.stringify(displayNames));
      formData.append("sort_orders", JSON.stringify(sortOrders));

      await apiRequest("/api/content/upload", {
        method: "POST",
        body: formData,
      });

      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setDisplayNames([]);
      setSortOrders([]);

      // Reload documents & items
      const endpoint = activeTab === "lectures"
        ? `/api/content/lectures/${selectedItemId}`
        : activeTab === "sections"
        ? `/api/content/sections/${selectedItemId}`
        : `/api/content/sheets/${selectedItemId}`;

      const res = await apiRequest<{ documents: DocumentItem[] }>(endpoint);
      setDocuments(res.documents || []);
      await fetchItems();
    } catch (err: any) {
      setUploadError(err.message || "حدث خطأ أثناء رفع الملفات");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "document") {
        await apiRequest(`/api/content/documents/${deleteTarget.id}`, { method: "DELETE" });
        setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id));
      } else if (deleteTarget.type === "lecture") {
        await apiRequest(`/api/content/lectures/${deleteTarget.id}`, { method: "DELETE" });
        setSelectedItemId(null);
        await fetchItems();
      } else if (deleteTarget.type === "section") {
        await apiRequest(`/api/content/sections/${deleteTarget.id}`, { method: "DELETE" });
        setSelectedItemId(null);
        await fetchItems();
      } else if (deleteTarget.type === "sheet") {
        await apiRequest(`/api/content/sheets/${deleteTarget.id}`, { method: "DELETE" });
        setSelectedItemId(null);
        await fetchItems();
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete target error:", err);
    }
  };

  const handleUpdateDocOrder = async (docId: string, newOrder: number) => {
    try {
      await apiRequest(`/api/content/documents/${docId}`, {
        method: "PUT",
        body: JSON.stringify({ sort_order: newOrder }),
      });
      setDocuments(prev =>
        prev.map(d => (d.id === docId ? { ...d, sort_order: newOrder } : d))
          .sort((a, b) => a.sort_order - b.sort_order)
      );
    } catch (err) {
      console.error("Update doc order error:", err);
    }
  };

  const handleUpdateDocDisplayName = async (docId: string, newName: string) => {
    try {
      await apiRequest(`/api/content/documents/${docId}`, {
        method: "PUT",
        body: JSON.stringify({ display_name: newName }),
      });
      setDocuments(prev =>
        prev.map(d => (d.id === docId ? { ...d, display_name: newName } : d))
      );
    } catch (err) {
      console.error("Update doc name error:", err);
    }
  };

  const currentItems = activeTab === "lectures" ? lectures : activeTab === "sections" ? sections : sheets;
  const currentItemObject = currentItems.find((i: any) => i.id === selectedItemId);

  return (
    <div className="space-y-6">
      {/* Subject Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-indigo-600 font-bold flex items-center gap-1 mb-1 hover:underline cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة لقائمة المواد</span>
          </button>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            إدارة محتوى: {subject.name} ({subject.code})
          </h2>
          <span className="text-xs text-slate-500">أستاذ المادة: د. {subject.doctor_name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => {
            setActiveTab("lectures");
            setSelectedItemId(null);
          }}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "lectures" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>المحاضرات ({lectures.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("sections");
            setSelectedItemId(null);
          }}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "sections" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>السكاشن ({sections.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("sheets");
            setSelectedItemId(null);
          }}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "sheets" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>الشيتات ({sheets.length})</span>
        </button>
      </div>

      {/* Layout: Sidebar for items, Main for documents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800">
              قائمة {activeTab === "lectures" ? "المحاضرات" : activeTab === "sections" ? "السكاشن" : "الشيتات"}
            </h3>

            <button
              onClick={() => {
                setItemError(null);
                setItemNumber(currentItems.length + 1);
                setItemTitle("");
                setItemDesc("");
                setIsCreateItemModalOpen(true);
              }}
              className="py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة جديد</span>
            </button>
          </div>

          {isLoading ? (
            <p className="text-xs text-slate-400 py-6 text-center">جاري التحميل...</p>
          ) : currentItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">لا توجد عناصر مضافة بعد.</p>
          ) : (
            <div className="space-y-2">
              {currentItems.map((item: any) => {
                const isSelected = selectedItemId === item.id;
                const creatorLabel = item.creator_name || "المدير الأساسي";
                const isMod = item.creator_role === "moderator";

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 text-xs ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-300 shadow-2xs"
                        : "bg-white border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold block truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                        {item.lecture_number ? `محاضرة ${item.lecture_number}: ` : item.section_number ? `سكشن ${item.section_number}: ` : ""}
                        {item.title}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({
                            type: activeTab.slice(0, -1),
                            id: item.id,
                            name: item.title,
                          });
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-slate-500">
                        {item.files_count || 0} ملف مرفق
                      </span>

                      {/* Display Creator (Supervisor / Admin) */}
                      <span className={`px-2 py-0.5 rounded-full font-bold truncate max-w-[140px] flex items-center gap-1 ${
                        isMod ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        <User className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">بواسطة: {creatorLabel}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attached Documents for Selected Item */}
        <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                الملفات المرفقة وتحديد ترتيب العرض (sort_order)
              </h3>
              {currentItemObject && (
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  العنصر المختار: {currentItemObject.title}
                </span>
              )}
            </div>

            {selectedItemId && (
              <button
                onClick={() => {
                  setUploadFiles([]);
                  setDisplayNames([]);
                  setSortOrders([]);
                  setIsUploadModalOpen(true);
                }}
                className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إرفاق ملفات إضافية</span>
              </button>
            )}
          </div>

          {!selectedItemId ? (
            <p className="text-xs text-slate-400 py-12 text-center">يرجى اختيار عنصر من القائمة الجانبية لإدارة ملفاته ومعرفة من قام بإضافتها.</p>
          ) : isLoadingDocs ? (
            <p className="text-xs text-slate-400 py-12 text-center">جاري تحميل الملفات...</p>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-3">
              <p>لم يتم إرفاق أي ملفات بهذا العنصر حتى الآن.</p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="py-2 px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl cursor-pointer"
              >
                اضغط هنا لرفع أول ملف
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-100/50 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">اسم العرض (Display Name)</label>
                      <input
                        type="text"
                        defaultValue={doc.display_name}
                        onBlur={(e) => {
                          if (e.target.value !== doc.display_name) {
                            handleUpdateDocDisplayName(doc.id, e.target.value);
                          }
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 font-bold text-slate-800 bg-white focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">الترتيب</label>
                      <input
                        type="number"
                        min={1}
                        defaultValue={doc.sort_order}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (val && val !== doc.sort_order) {
                            handleUpdateDocOrder(doc.id, val);
                          }
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 font-mono text-slate-800 bg-white focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">{formatFileSize(doc.file_size)}</span>
                      {doc.uploader_name && (
                        <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                          رافع الملف: {doc.uploader_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={getFileDownloadUrl(doc.id)}
                        download={doc.display_name}
                        title="تحميل"
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setDeleteTarget({ type: "document", id: doc.id, name: doc.display_name })}
                        title="حذف الملف"
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
        </div>
      </div>

      {/* Modal: Create Item (Lecture, Section, or Sheet) */}
      {isCreateItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                إضافة {activeTab === "lectures" ? "محاضرة جديدة" : activeTab === "sections" ? "سكشن جديد" : "شيت جديد"}
              </h3>
              <button
                onClick={() => setIsCreateItemModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {itemError && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{itemError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewItem} className="space-y-3.5 mt-4 text-xs">
              {activeTab !== "sheets" && (
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    الرقم ({activeTab === "lectures" ? "رقم المحاضرة" : "رقم السكشن"})
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={itemNumber}
                    onChange={(e) => setItemNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-bold mb-1">العنوان</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مقدمة في المادة والأنظمة الهندسية"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">الوصف أو ملاحظات (اختياري)</label>
                <textarea
                  rows={3}
                  placeholder="ملاحظات توضيحية للطلاب..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateItemModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isItemCreating}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isItemCreating ? "جاري الإضافة..." : "إضافة الآن"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Additional Files Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-xl text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">إرفاق ملفات إضافية</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadFiles} className="space-y-4 mt-4 text-xs">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                  {uploadError}
                </div>
              )}
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files);
                    setUploadFiles(files);
                    setDisplayNames(files.map(f => f.name.replace(/\.[^/.]+$/, "")));
                    setSortOrders(files.map((_, i) => documents.length + i + 1));
                  }
                }}
                required
                className="w-full text-xs text-slate-700 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />

              {uploadFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadFiles.map((f, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="اسم العرض"
                        value={displayNames[idx] || ""}
                        onChange={(e) => {
                          const copy = [...displayNames];
                          copy[idx] = e.target.value;
                          setDisplayNames(copy);
                        }}
                        className="flex-1 p-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                      />
                      <input
                        type="number"
                        min={1}
                        value={sortOrders[idx] || 1}
                        onChange={(e) => {
                          const copy = [...sortOrders];
                          copy[idx] = parseInt(e.target.value, 10) || 1;
                          setSortOrders(copy);
                        }}
                        className="w-16 p-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white text-slate-800"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUploading || uploadFiles.length === 0}
                  className="py-2 px-5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? "جاري الرفع..." : "رفع الملفات"}
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
