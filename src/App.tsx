import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoadingScreen } from "./components/common/LoadingScreen";
import { Header } from "./components/common/Header";
import { BottomNav } from "./components/common/BottomNav";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import { AdminSetupModal } from "./components/auth/AdminSetupModal";
import { StudentHome } from "./components/student/StudentHome";
import { SubjectDetails } from "./components/student/SubjectDetails";
import { QuizPlayer } from "./components/student/QuizPlayer";
import { StudentProfile } from "./components/student/StudentProfile";
import { GlobalSearch } from "./components/student/GlobalSearch";
import { AdminLayout } from "./components/admin/AdminLayout";
import { Footer } from "./components/common/Footer";
import { Subject, Quiz } from "./types";

function MainApp() {
  const { user, isLoading, hasAdmin, years, specializations, terms, refreshUser } = useAuth();

  // Auth screen state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isAdminSetupOpen, setIsAdminSetupOpen] = useState(false);

  // Student Navigation View
  const [currentView, setCurrentView] = useState<"home" | "subjects" | "subject-details" | "quiz-player" | "profile">("home");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjectInitialTab, setSubjectInitialTab] = useState<"lectures" | "sections" | "sheets" | "quizzes">("lectures");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  // Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (isLoading) {
    return <LoadingScreen onRetry={refreshUser} />;
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-['Cairo',sans-serif] flex flex-col justify-between">
        <div className="flex-1 flex flex-col justify-center">
          {authMode === "login" ? (
            <LoginForm
              onSwitchToRegister={() => setAuthMode("register")}
              onOpenAdminSetup={() => setIsAdminSetupOpen(true)}
            />
          ) : (
            <RegisterForm onSwitchToLogin={() => setAuthMode("login")} />
          )}
        </div>

        <Footer className="pb-6" />

        <AdminSetupModal
          isOpen={isAdminSetupOpen}
          onClose={() => setIsAdminSetupOpen(false)}
        />
      </div>
    );
  }

  // Admin / Supervisor user: Strictly rendered inside the Admin Portal ONLY (No student interface)
  if (user.role === "admin" || user.role === "moderator") {
    return (
      <AdminLayout
        years={years}
        specializations={specializations}
        terms={terms}
      />
    );
  }

  // Student user handling
  const handleSelectSubject = (
    subject: Subject,
    tab: "lectures" | "sections" | "sheets" | "quizzes" = "lectures"
  ) => {
    setSelectedSubject(subject);
    setSubjectInitialTab(tab);
    setCurrentView("subject-details");
  };

  const handleStartQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentView("quiz-player");
  };

  // Breadcrumbs builder
  const getBreadcrumbs = () => {
    if (currentView === "profile") {
      return [{ label: "الرئيسية", onClick: () => setCurrentView("home") }, { label: "الملف الشخصي" }];
    }
    if (currentView === "subject-details" && selectedSubject) {
      return [
        { label: "المواد", onClick: () => setCurrentView("home") },
        { label: selectedSubject.name },
      ];
    }
    if (currentView === "quiz-player" && activeQuiz) {
      return [
        { label: "المواد", onClick: () => setCurrentView("home") },
        {
          label: selectedSubject?.name || "المادة",
          onClick: selectedSubject ? () => setCurrentView("subject-details") : undefined,
        },
        { label: activeQuiz.title },
      ];
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Cairo',sans-serif]">
      {/* Header for students */}
      {currentView !== "quiz-player" && (
        <Header
          activeView={currentView}
          onNavigate={(v) => setCurrentView(v as any)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onBack={
            currentView === "subject-details" || currentView === "profile"
              ? () => setCurrentView("home")
              : undefined
          }
          breadcrumbs={getBreadcrumbs()}
        />
      )}

      {/* Main Student View Area */}
      <main className="flex-1">
        {currentView === "home" && (
          <StudentHome
            onSelectSubject={handleSelectSubject}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}

        {currentView === "subjects" && (
          <StudentHome
            onSelectSubject={handleSelectSubject}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}

        {currentView === "subject-details" && selectedSubject && (
          <SubjectDetails
            subject={selectedSubject}
            initialTab={subjectInitialTab}
            onStartQuiz={handleStartQuiz}
            onBack={() => setCurrentView("home")}
          />
        )}

        {currentView === "quiz-player" && activeQuiz && (
          <QuizPlayer
            quiz={activeQuiz}
            onExit={() => {
              if (selectedSubject) {
                setSubjectInitialTab("quizzes");
                setCurrentView("subject-details");
              } else {
                setCurrentView("home");
              }
            }}
          />
        )}

        {currentView === "profile" && <StudentProfile />}
      </main>

      {/* Footer credits */}
      {currentView !== "quiz-player" && (
        <Footer className="pb-24 md:pb-6" />
      )}

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSubject={handleSelectSubject}
      />

      {/* Modern Floating Bottom Navigation on phones (hidden during quiz) */}
      {currentView !== "quiz-player" && (
        <BottomNav
          currentView={currentView}
          onNavigate={(v) => setCurrentView(v as any)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
