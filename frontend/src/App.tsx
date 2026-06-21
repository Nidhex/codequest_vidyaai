import { useState, useEffect, useRef } from 'react';
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
import { useAnalyticsStore } from './store/analyticsStore';
import { useMainStore } from './store/mainStore';

function App() {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  
  const { user } = useMainStore();
  const { notifications, removeNotification, loadStats } = useAnalyticsStore();

  // Load telemetry stats on startup
  useEffect(() => {
    if (user) {
      loadStats(user.id);
    }
  }, [user, loadStats]);

  // Focus tracking state refs
  const lastActiveTime = useRef<number>(Date.now());
  const activeSeconds = useRef<number>(0);

  useEffect(() => {
    const handleActivity = () => {
      lastActiveTime.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      const isTabHidden = document.hidden;
      const isIdle = Date.now() - lastActiveTime.current > 60000; // 60s idle timeout
      
      if (!isTabHidden && !isIdle && currentPage !== 'landing') {
        activeSeconds.current += 1;
      }
    }, 1000);

    // Expose utility globally to extract focus time in minutes and reset
    (window as any).getActiveFocusTime = () => {
      const minutes = Math.max(Math.round(activeSeconds.current / 60), 1);
      activeSeconds.current = 0; // reset
      lastActiveTime.current = Date.now(); // reset idle
      return minutes;
    };

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, [currentPage]);

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

      {/* 🔔 GLOBAL FLOATING TOAST NOTIFICATION STACK */}
      <div className="fixed top-20 right-6 z-50 flex flex-col space-y-2.5 max-w-sm pointer-events-none no-print">
        {notifications.map((notif) => {
          let emoji = 'ℹ️';
          let borderCol = 'border-cyan-500/30';
          let bgCol = 'from-black/90 to-cyan-950/70';
          let textCol = 'text-cyan-400';
          if (notif.type === 'xp') {
            emoji = '⭐';
            borderCol = 'border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
            bgCol = 'from-black/90 to-amber-950/70';
            textCol = 'text-amber-400';
          } else if (notif.type === 'streak') {
            emoji = '🔥';
            borderCol = 'border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.2)]';
            bgCol = 'from-black/90 to-pink-950/70';
            textCol = 'text-pink-400';
          } else if (notif.type === 'mastery') {
            emoji = '🌱';
            borderCol = 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
            bgCol = 'from-black/90 to-emerald-950/70';
            textCol = 'text-emerald-400';
          } else if (notif.type === 'weakness') {
            emoji = '⚠️';
            borderCol = 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]';
            bgCol = 'from-black/90 to-rose-950/70';
            textCol = 'text-rose-400';
          } else if (notif.type === 'achievement') {
            emoji = '🏆';
            borderCol = 'border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] animate-pulse';
            bgCol = 'from-black/90 to-purple-950/70';
            textCol = 'text-purple-400';
          }

          return (
            <div
              key={notif.id}
              className={`p-3.5 rounded-xl border bg-gradient-to-r ${bgCol} ${borderCol} flex items-center space-x-3 pointer-events-auto shadow-2xl transition-all duration-300 animate-slide-in font-mono text-xs`}
            >
              <span className="text-xl shrink-0">{emoji}</span>
              <div className="flex-1 text-left">
                <p className={`font-black ${textCol}`}>{notif.type.toUpperCase()}</p>
                <p className="text-white mt-0.5 font-medium leading-relaxed">{notif.text}</p>
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="text-white/40 hover:text-white transition-colors cursor-pointer text-[10px] shrink-0 font-bold border border-white/10 hover:border-white/30 px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default App;
