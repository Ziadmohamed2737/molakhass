import React from "react";
import { Home, BookOpen, Search, User as UserIcon } from "lucide-react";

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenSearch: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
}) => {
  const isSubjectsActive = currentView === "subjects" || currentView === "subject-details";
  const isHomeActive = currentView === "home";
  const isProfileActive = currentView === "profile";

  return (
    <div className="md:hidden fixed bottom-3 left-4 right-4 z-40 max-w-md mx-auto pointer-events-none">
      <nav className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl shadow-indigo-950/15 rounded-2xl px-2 py-1.5 flex items-center justify-around gap-1">
        {/* Home */}
        <button
          onClick={() => onNavigate("home")}
          className={`flex-1 py-1.5 px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
            isHomeActive
              ? "bg-indigo-50 text-indigo-600 font-bold scale-102 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Home className={`w-5 h-5 mb-0.5 transition-transform ${isHomeActive ? "scale-110 text-indigo-600 stroke-[2.5]" : ""}`} />
          <span className="text-[11px] leading-tight">الرئيسية</span>
          {isHomeActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-0.5 animate-pulse" />
          )}
        </button>

        {/* Subjects */}
        <button
          onClick={() => onNavigate("subjects")}
          className={`flex-1 py-1.5 px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
            isSubjectsActive
              ? "bg-indigo-50 text-indigo-600 font-bold scale-102 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <BookOpen className={`w-5 h-5 mb-0.5 transition-transform ${isSubjectsActive ? "scale-110 text-indigo-600 stroke-[2.5]" : ""}`} />
          <span className="text-[11px] leading-tight">المواد</span>
          {isSubjectsActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-0.5 animate-pulse" />
          )}
        </button>

        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="flex-1 py-1.5 px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 cursor-pointer"
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">بحث</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => onNavigate("profile")}
          className={`flex-1 py-1.5 px-2 rounded-xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
            isProfileActive
              ? "bg-indigo-50 text-indigo-600 font-bold scale-102 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <UserIcon className={`w-5 h-5 mb-0.5 transition-transform ${isProfileActive ? "scale-110 text-indigo-600 stroke-[2.5]" : ""}`} />
          <span className="text-[11px] leading-tight">حسابي</span>
          {isProfileActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-0.5 animate-pulse" />
          )}
        </button>
      </nav>
    </div>
  );
};
