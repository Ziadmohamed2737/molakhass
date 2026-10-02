import React from "react";

// Modern custom SVG illustrations and engineering visual icons with light palette

export const BlueprintIllustration: React.FC<{ className?: string }> = ({ className = "w-36 h-36" }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Grid background */}
    <rect width="200" height="200" rx="24" fill="#4f46e5" fillOpacity="0.04" />
    <path d="M20 40H180M20 80H180M20 120H180M20 160H180" stroke="#4f46e5" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M40 20V180M80 20V180M120 20V180M160 20V180" stroke="#4f46e5" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="3 3" />
    
    {/* Drafting Triangle Ruler */}
    <path d="M50 140L140 140L50 50Z" fill="#6366f1" fillOpacity="0.12" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M65 130L115 130L65 80Z" fill="white" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
    
    {/* Stylus / Pencil */}
    <path d="M125 55L145 75L105 115L85 115L85 95L125 55Z" fill="#818cf8" stroke="#3730a3" strokeWidth="2" strokeLinejoin="round" />
    <path d="M85 115L80 120L90 120L85 115Z" fill="#312e81" />
    <circle cx="150" cy="50" r="3" fill="#6366f1" />

    {/* Compass / Divider */}
    <circle cx="100" cy="140" r="2.5" fill="#4f46e5" />
    <path d="M100 140L80 165M100 140L120 165" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const EmptyFolderIllustration: React.FC<{ className?: string }> = ({ className = "w-32 h-32" }) => (
  <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="80" cy="80" r="70" fill="#4f46e5" fillOpacity="0.04" />
    <path d="M40 55C40 50.5817 43.5817 47 48 47H66.89C69.458 47 71.879 48.204 73.414 50.25L78.586 57.14C80.121 59.186 82.542 60.39 85.11 60.39H112C116.418 60.39 120 63.9717 120 68.39V112C120 116.418 116.418 120 112 120H48C43.5817 120 40 116.418 40 112V55Z" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />
    <path d="M40 70H120" stroke="#4f46e5" strokeWidth="1.5" strokeOpacity="0.15" />
    <circle cx="80" cy="90" r="16" fill="#6366f1" fillOpacity="0.1" stroke="#6366f1" strokeWidth="1.5" />
    <path d="M80 84V96M74 90H86" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const QuizIllustration: React.FC<{ className?: string }> = ({ className = "w-32 h-32" }) => (
  <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="35" y="30" width="90" height="110" rx="12" fill="white" stroke="#4f46e5" strokeWidth="2" />
    {/* Clipboard clip */}
    <rect x="60" y="22" width="40" height="14" rx="4" fill="#4f46e5" />
    <circle cx="80" cy="29" r="3" fill="#ffffff" />
    
    {/* Question items */}
    <circle cx="50" cy="55" r="4" fill="#6366f1" />
    <rect x="62" y="52" width="48" height="6" rx="3" fill="#64748b" fillOpacity="0.2" />
    
    <circle cx="50" cy="75" r="4" fill="#4f46e5" />
    <rect x="62" y="72" width="55" height="6" rx="3" fill="#64748b" fillOpacity="0.2" />

    <circle cx="50" cy="95" r="4" fill="#818cf8" />
    <rect x="62" y="92" width="42" height="6" rx="3" fill="#64748b" fillOpacity="0.2" />

    {/* Checkmark */}
    <path d="M100 110L110 120L130 95" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Engineering Specialization Visual Badges
export const SpecializationBadgeIcon: React.FC<{ specCode?: string | null; className?: string }> = ({
  specCode,
  className = "w-5 h-5",
}) => {
  switch (specCode?.toLowerCase()) {
    case "civil":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 22h16" />
          <path d="M6 22V6l6-4 6 4v16" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
      );
    case "mech":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "elec":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "arch":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
          <path d="M9 18h6" />
        </svg>
      );
    case "comp":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
  }
};
