export interface User {
  id: string;
  student_code: string;
  full_name: string;
  phone: string;
  year_id: string;
  year_name?: string;
  specialization_id: string | null;
  spec_name?: string | null;
  role: "student" | "admin" | "moderator";
  is_active?: number;
  created_at?: string;
  last_seen?: string;
}

export interface Year {
  id: string;
  name: string;
  code: string;
  has_specialization: number;
}

export interface Specialization {
  id: string;
  name: string;
  code: string;
}

export interface Term {
  id: string;
  name: string;
  code: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  doctor_name: string;
  year_id: string;
  year_name?: string;
  specialization_id: string | null;
  spec_name?: string | null;
  term_id: string;
  term_name?: string;
  is_active: number;
  created_at: string;
  lectures_count?: number;
  sections_count?: number;
  sheets_count?: number;
  quizzes_count?: number;
  is_favorite?: number;
}

export interface Lecture {
  id: string;
  subject_id: string;
  lecture_number: number;
  title: string;
  description: string | null;
  is_published: number;
  created_at: string;
  files_count?: number;
  created_by?: string | null;
  creator_name?: string | null;
  creator_code?: string | null;
  creator_role?: "admin" | "moderator" | null;
}

export interface Section {
  id: string;
  subject_id: string;
  section_number: number;
  title: string;
  description: string | null;
  is_published: number;
  created_at: string;
  files_count?: number;
  created_by?: string | null;
  creator_name?: string | null;
  creator_code?: string | null;
  creator_role?: "admin" | "moderator" | null;
}

export interface Sheet {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  is_published: number;
  created_at: string;
  files_count?: number;
  created_by?: string | null;
  creator_name?: string | null;
  creator_code?: string | null;
  creator_role?: "admin" | "moderator" | null;
}

export interface DocumentItem {
  id: string;
  subject_id: string;
  lecture_id?: string | null;
  section_id?: string | null;
  sheet_id?: string | null;
  display_name: string;
  file_type: string;
  file_size: number;
  sort_order: number;
  is_published: number;
  created_at: string;
  uploaded_by?: string | null;
  uploader_name?: string | null;
  uploader_role?: "admin" | "moderator" | null;
}

export interface Quiz {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  duration_seconds: number;
  total_points: number;
  max_attempts: number;
  show_answers: number;
  allow_back_navigation: number;
  is_published: number;
  created_at: string;
  questions_count?: number;
  user_attempts_count?: number;
  best_score?: number | null;
  subject_name?: string;
  subject_code?: string;
  created_by?: string | null;
  creator_name?: string | null;
  creator_code?: string | null;
  creator_role?: "admin" | "moderator" | null;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_number: number;
  question_text: string;
  question_image: string | null;
  correct_option?: string; // Only present for admin or after submission
  points: number;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_key: "A" | "B" | "C" | "D";
  option_text: string;
  option_image: string | null;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number;
  percentage: number;
  status: "in_progress" | "submitted" | "expired";
}

export interface QuizResultSummary {
  message: string;
  score: number;
  total_points: number;
  percentage: number;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  total_questions: number;
  show_answers: boolean;
  is_time_expired?: boolean;
  feedback?: Array<{
    question_id: string;
    question_number: number;
    selected_option: string | null;
    is_correct: boolean;
    correct_option: string | null;
  }>;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalFiles: number;
  totalSubjects: number;
  totalLectures: number;
  totalSections: number;
  totalSheets: number;
  totalQuizzes: number;
}
