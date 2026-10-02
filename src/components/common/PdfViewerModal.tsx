import React from "react";
import { X, Download, FileText, ExternalLink } from "lucide-react";
import { DocumentItem } from "../../types";
import { getFileViewUrl, getFileDownloadUrl, formatFileSize } from "../../api/client";

interface PdfViewerModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !doc) return null;

  const viewUrl = getFileViewUrl(doc.id);
  const downloadUrl = getFileDownloadUrl(doc.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-between p-2 sm:p-4">
      <div className="w-full max-w-5xl mx-auto h-full flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 truncate min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {doc.display_name}
              </h3>
              <span className="text-[10px] text-slate-400">
                مستند PDF · {formatFileSize(doc.file_size)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Open in new tab link */}
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="فتح في تبويب مستقل"
              className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 bg-white/10 hover:bg-white/20 text-xs text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>عرض كامل</span>
            </a>

            {/* Direct Download Button */}
            <a
              href={downloadUrl}
              download={doc.display_name}
              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل PDF</span>
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF container */}
        <div className="flex-1 bg-slate-100 relative w-full h-full min-h-[400px]">
          <iframe
            src={`${viewUrl}#toolbar=1`}
            title={doc.display_name}
            className="w-full h-full border-0"
          />
        </div>

        {/* Mobile notice */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
          <span>إذا لم يظهر المستند بشكل تلقائي على هاتفك:</span>
          <a
            href={downloadUrl}
            download={doc.display_name}
            className="text-indigo-600 font-bold underline hover:text-indigo-800"
          >
            اضغط هنا لتنزيل الملف مباشرة
          </a>
        </div>
      </div>
    </div>
  );
};
