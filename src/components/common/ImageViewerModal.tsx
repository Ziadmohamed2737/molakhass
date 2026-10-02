import React, { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Download, ChevronRight, ChevronLeft, Maximize2 } from "lucide-react";
import { DocumentItem } from "../../types";
import { getFileViewUrl, getFileDownloadUrl } from "../../api/client";

interface ImageViewerModalProps {
  documents: DocumentItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  documents,
  initialIndex,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, documents.length]);

  if (!isOpen || documents.length === 0) return null;

  const currentDoc = documents[currentIndex] || documents[0];
  const imageUrl = getFileViewUrl(currentDoc.id);
  const downloadUrl = getFileDownloadUrl(currentDoc.id);

  const handleNext = () => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoomLevel(1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoomLevel(1);
    }
  };

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.3, 3));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.3, 0.5));
  const resetZoom = () => setZoomLevel(1);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-black/60 text-white backdrop-blur-xs z-10">
        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
          <span className="text-xs sm:text-sm font-semibold truncate text-white">
            {currentDoc.display_name}
          </span>
          {documents.length > 1 && (
            <span className="text-[11px] text-slate-300 flex-shrink-0">
              ({currentIndex + 1} من {documents.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Zoom controls */}
          <button
            onClick={zoomIn}
            title="تكبير"
            aria-label="تكبير"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/15 active:bg-white/30 text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            title="تصغير"
            aria-label="تصغير"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/15 active:bg-white/30 text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {zoomLevel !== 1 && (
            <button
              onClick={resetZoom}
              title="إعادة ضبط الحجم"
              aria-label="إعادة ضبط الحجم"
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/15 active:bg-white/30 text-[#B8C4A8]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            title="شاشة كاملة"
            aria-label="شاشة كاملة"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/15 active:bg-white/30 text-white"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Real Download Link */}
          <a
            href={downloadUrl}
            download={currentDoc.display_name}
            title="تنزيل الصورة"
            aria-label="تنزيل الصورة"
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#956B3D] hover:bg-[#956B3D]/80 active:bg-[#956B3D]/90 text-white"
          >
            <Download className="w-4 h-4" />
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            title="إغلاق"
            aria-label="إغلاق"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-500/30 active:bg-red-500/50 text-red-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-auto p-2 touch-pan-x touch-pan-y">
        <img
          src={imageUrl}
          alt={currentDoc.display_name}
          style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease-out" }}
          className="max-h-[85vh] max-w-[95vw] object-contain cursor-grab active:cursor-grabbing rounded-xs"
        />

        {/* Gallery Navigation arrows */}
        {documents.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                aria-label="الصورة السابقة"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-lg backdrop-blur-xs border border-white/10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
            {currentIndex < documents.length - 1 && (
              <button
                onClick={handleNext}
                aria-label="الصورة التالية"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-lg backdrop-blur-xs border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom Bar: Quick thumbnails if more than 1 image */}
      {documents.length > 1 && (
        <div className="p-2 bg-black/70 flex items-center justify-center gap-2 overflow-x-auto">
          {documents.map((doc, idx) => (
            <button
              key={doc.id}
              onClick={() => {
                setCurrentIndex(idx);
                setZoomLevel(1);
              }}
              className={`h-12 w-12 rounded-sm overflow-hidden border-2 flex-shrink-0 transition-all ${
                idx === currentIndex ? "border-[#956B3D] scale-105" : "border-white/20 opacity-50 hover:opacity-100"
              }`}
            >
              <img
                src={getFileViewUrl(doc.id)}
                alt={doc.display_name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
