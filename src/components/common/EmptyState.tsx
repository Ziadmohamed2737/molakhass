import React from "react";
import { EmptyFolderIllustration } from "./VisualAssets";

interface EmptyStateProps {
  illustration?: React.ReactNode;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="py-10 px-4 flex flex-col items-center justify-center text-center max-w-sm mx-auto select-none">
      <div className="mb-4 transform hover:scale-105 transition-transform duration-300">
        {illustration || (
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
            {icon || <EmptyFolderIllustration className="w-24 h-24" />}
          </div>
        )}
      </div>

      <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 leading-relaxed mb-5 max-w-xs">{description}</p>
      )}

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
