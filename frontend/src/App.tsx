import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { StudentDashboard } from './pages/StudentDashboard';

import { QuizArena } from './pages/QuizArena';
import { DebateArena } from './pages/DebateArena';
import { VoiceClassroom } from './pages/VoiceClassroom';
import { FeynmanArena } from './pages/FeynmanArena';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AnalyticsPanel } from './pages/AnalyticsPanel';
import { SmartBoard } from './pages/SmartBoard';
import { PracticeQuestions } from './pages/PracticeQuestions';
import { Leaderboard } from './pages/Leaderboard';
import { SettingsPage } from './pages/SettingsPage';
import { PomodoroTimer } from './components/PomodoroTimer';

function App() {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [quizContext, setQuizContext] = useState<{
    topic: string;
    subject: string;
    chapter: string;
    numQuestions?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  }>({
    topic: 'Photosynthesis',
    subject: 'Science',
    chapter: ''
  });
  
  // Navigation layout state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleStartQuiz = (
    topic: string, 
    subject?: string, 
    chapter?: string, 
    numQuestions?: number, 
    difficulty?: 'easy' | 'medium' | 'hard'
  ) => {
    setQuizContext({ 
      topic, 
      subject: subject || 'Science', 
      chapter: chapter || '',
      numQuestions,
      difficulty
    });
    setCurrentPage('quiz');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={setCurrentPage} />;
      case 'dashboard':
        return <StudentDashboard />;
      case 'quiz':
        return (
          <QuizArena 
            topic={quizContext.topic} 
            subject={quizContext.subject} 
            chapter={quizContext.chapter} 
            initialNumQuestions={quizContext.numQuestions}
            initialDifficulty={quizContext.difficulty}
            onNavigate={setCurrentPage} 
          />
        );
      case 'debate':
        return <DebateArena onNavigate={setCurrentPage} />;
      case 'voice':
        return <VoiceClassroom onNavigate={setCurrentPage} />;
      case 'feynman':
        return <FeynmanArena onNavigate={setCurrentPage} />;
      case 'teacher':
        return <TeacherDashboard onNavigate={setCurrentPage} />;
      case 'admin':
        return <AdminDashboard onNavigate={setCurrentPage} />;
      case 'analytics':
        return <AnalyticsPanel onNavigate={setCurrentPage} />;
      case 'smartboard':
        return <SmartBoard onNavigate={setCurrentPage} />;
      case 'practice':
        return <PracticeQuestions onNavigate={setCurrentPage} />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <LandingPage onNavigate={setCurrentPage} />;
    }
  };

  // Standalone layout for cinematic Landing Page
  if (currentPage === 'landing') {
    return (
      <div className="w-full min-h-screen selection:bg-cyber-purple selection:text-white">
        {renderPage()}
      </div>
    );
  }

  // Unified SaaS Dashboard Layout with collapsibility and navigation wrappers
  return (
    <div className="w-full min-h-screen selection:bg-cyber-purple selection:text-white flex bg-cyber-bg">
      
      {/* 🚀 COLLAPSIBLE SIDEBAR */}
      <div className={`hidden md:block transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar 
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      </div>

      {/* 📱 MOBILE SIDEBAR DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="w-64 h-full relative">
            <Sidebar 
              currentPage={currentPage}
              onNavigate={(page) => {
                setCurrentPage(page);
                setMobileMenuOpen(false);
              }}
              collapsed={false}
              setCollapsed={() => {}}
            />
            {/* Click outside to close */}
            <div 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-y-0 left-64 right-0 w-[calc(100vw-256px)] h-full cursor-pointer"
            ></div>
          </div>
        </div>
      )}

      {/* 🌟 MAIN AREA WRAPPER */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
        
        {/* TOP NAVBAR */}
        <Navbar 
          onMenuTrigger={() => setMobileMenuOpen(!mobileMenuOpen)}
          onNavigate={setCurrentPage}
        />

        {/* INNER VIEWPORT WITH whitespace and margins */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full transition-all duration-300">
          {renderPage()}
        </main>
      </div>

      {/* 🍅 GLOBAL POMODORO TIMER */}
      <PomodoroTimer />

    </div>
  );
}

export default App;
