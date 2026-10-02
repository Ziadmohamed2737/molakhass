import React from "react";
import { BookOpen, LogOut, Search, User as UserIcon, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface HeaderProps {
  onOpenSearch?: () => void;
  activeView?: string;
  onNavigate?: (view: string) => void;
  title?: string;
  onBack?: () => void;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  activeView,
  onNavigate,
  title,
  onBack,
  breadcrumbs,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo / Back / Title */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="الرجوع"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate && onNavigate("home")}
              className="flex items-center gap-2.5 text-right focus:outline-hidden cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/30">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div className="hidden xs:block text-right">
                <span className="block text-sm font-black text-slate-900 leading-tight">ملفاتك عندنا</span>
                <span className="block text-[10px] text-indigo-600 font-bold leading-none">هندسة</span>
              </div>
            </button>
          )}

          {/* Breadcrumbs or Title */}
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 overflow-hidden truncate">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-300 text-[10px]">/</span>}
                  {crumb.onClick ? (
                    <button
                      onClick={crumb.onClick}
                      className="hover:text-indigo-600 transition-colors truncate max-w-[120px] cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-slate-800 font-bold truncate max-w-[140px]">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          ) : title ? (
            <h2 className="text-sm font-bold truncate text-slate-900">{title}</h2>
          ) : null}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              title="بحث سريع"
              aria-label="بحث سريع"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 active:scale-95 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {user && (
            <>
              {/* User profile snippet */}
              <div
                onClick={() => onNavigate && onNavigate("profile")}
                className="hidden md:flex items-center gap-2.5 cursor-pointer hover:bg-slate-100 py-1 px-2.5 rounded-xl transition-all text-right"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-black text-indigo-700 shadow-2xs">
                  {user.full_name.charAt(0)}
                </div>
                <div className="text-right">
                  <span className="block text-xs font-bold leading-tight text-slate-900">{user.full_name}</span>
                  <span className="block text-[10px] text-slate-500 font-mono leading-none">#{user.student_code}</span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
